const express = require('express');
const cors = require('cors');
const http = require('http');
const path = require('path');
const fs = require('fs');
const cron = require('node-cron');

const { initializeDatabase, getQuery, runQuery, allQuery } = require('./database');
const { initWebSocket, broadcast, broadcastScanProgress, broadcastOnlineStatus, broadcastTrafficUpdate, broadcastAlert } = require('./websocket');
const { mockScan, getVendorFromMac } = require('./services/deviceScanner');

const PORT = process.env.PORT || 3098;
const WS_PORT = process.env.WS_PORT || 3099;
const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const ROUTES_DIR = path.join(__dirname, 'routes');

const app = express();

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

if (fs.existsSync(PUBLIC_DIR)) {
  app.use(express.static(PUBLIC_DIR));
}

app.use((req, res, next) => {
  const start = Date.now();
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} ${res.statusCode} (${duration}ms)`);
  });
  next();
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    services: {
      database: true,
      websocket: true,
      scheduler: true
    }
  });
});

function loadRoutes() {
  if (!fs.existsSync(ROUTES_DIR)) {
    console.log('[Routes] routes目录不存在，跳过自动路由加载');
    return;
  }

  const files = fs.readdirSync(ROUTES_DIR).filter(file =>
    (file.endsWith('.js') || file.endsWith('.cjs')) && file !== 'index.js'
  );

  let loadedCount = 0;
  for (const file of files) {
    try {
      const routeName = file.replace(/\.(js|cjs)$/, '');
      const routePath = path.join(ROUTES_DIR, file);
      const router = require(routePath);

      if (typeof router === 'function' || (router && typeof router.handle === 'function')) {
        const apiPath = `/api/${routeName}`;
        app.use(apiPath, router);
        console.log(`[Routes] 已加载路由: ${apiPath} (${file})`);
        loadedCount++;
      }
    } catch (err) {
      console.error(`[Routes] 加载路由 ${file} 失败:`, err.message);
    }
  }

  console.log(`[Routes] 共加载 ${loadedCount} 个路由模块`);
}

app.use('/api', (req, res, next) => {
  res.status(404).json({
    error: 'Endpoint not found',
    method: req.method,
    path: req.path,
    timestamp: new Date().toISOString()
  });
});

app.use((err, req, res, next) => {
  console.error('[Error]', err);
  const statusCode = err.statusCode || err.status || 500;
  const errorResponse = {
    error: err.message || 'Internal Server Error',
    timestamp: new Date().toISOString()
  };

  if (process.env.NODE_ENV === 'development') {
    errorResponse.stack = err.stack;
  }

  res.status(statusCode).json(errorResponse);
});

const scheduledTasks = new Map();

function startAutoScan() {
  console.log('[Scheduler] 正在初始化自动扫描任务...');

  getQuery('SELECT * FROM scan_configs WHERE auto_scan = 1 LIMIT 1')
    .then(config => {
      if (!config) {
        console.log('[Scheduler] 未找到启用自动扫描的配置');
        return;
      }

      if (scheduledTasks.has('auto_scan')) {
        scheduledTasks.get('auto_scan').stop();
      }

      const scanInterval = config.schedule || '*/5 * * * *';
      const task = cron.schedule(scanInterval, () => {
        console.log('[Scheduler] 触发自动扫描任务');
        try {
          broadcastScanProgress({
            status: 'starting',
            message: '开始自动扫描',
            timestamp: new Date().toISOString()
          });

          runQuery(
            'UPDATE scan_configs SET last_run = ? WHERE id = ?',
            [new Date().toISOString(), config.id]
          ).catch(err => {
            console.error('[Scheduler] 更新扫描时间失败:', err.message);
          });
        } catch (e) {
          console.error('[Scheduler] 扫描任务执行异常:', e.message);
        }
      });

      scheduledTasks.set('auto_scan', task);
      console.log(`[Scheduler] 自动扫描任务已启动，Cron表达式: ${scanInterval}`);
    })
    .catch(err => {
      console.error('[Scheduler] 加载扫描配置失败:', err.message);
    });

  getQuery("SELECT value FROM system_settings WHERE key = 'scan_interval'")
    .then(result => {
      if (result && result.value) {
        const seconds = parseInt(result.value, 10);
        if (seconds > 0 && !scheduledTasks.has('quick_scan')) {
          const minutes = Math.max(1, Math.floor(seconds / 60));
          const cronExpr = `*/${minutes} * * * *`;
          const task = cron.schedule(cronExpr, () => {
            console.log(`[Scheduler] 快速扫描周期: ${seconds}秒`);
            try {
              broadcastOnlineStatus({
                type: 'heartbeat',
                timestamp: new Date().toISOString()
              });
            } catch (e) {
              // ignore
            }
          });
          scheduledTasks.set('quick_scan', task);
          console.log(`[Scheduler] 设备状态检查任务已启动，周期: ${seconds}秒`);
        }
      }
    })
    .catch(err => {
      console.error('[Scheduler] 加载扫描间隔配置失败:', err.message);
    });
}

async function initMockDataIfEmpty() {
  try {
    const { total } = await getQuery('SELECT COUNT(*) as total FROM devices');
    if (total && total > 0) {
      console.log(`[Init] 数据库已存在 ${total} 台设备，跳过模拟初始化`);
      return total;
    }
    console.log('[Init] 数据库为空，正在初始化模拟数据...');
    const mockDevices = mockScan();
    const nowIso = new Date().toISOString();
    for (const dev of mockDevices) {
      if (!dev.mac) continue;
      const vendor = dev.vendor || getVendorFromMac(dev.mac) || 'Unknown';
      const isOnline = dev.is_online !== false ? 1 : 0;
      const result = await runQuery(
        `INSERT INTO devices (mac, ip, hostname, device_type, vendor, os_info, signal_strength, rssi, is_online, first_seen, last_seen, group_name, custom_name)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          dev.mac, dev.ip || null, dev.hostname || null,
          dev.device_type || 'unknown', vendor, dev.os_info || null,
          dev.signal_strength || null, dev.rssi || null, isOnline,
          nowIso, nowIso, dev.group_name || '未分组', dev.custom_name || null
        ]
      );
      if (isOnline) {
        await runQuery(
          'INSERT INTO connection_history (device_id, mac, event_type, timestamp, ip) VALUES (?, ?, ?, ?, ?)',
          [result.id, dev.mac, 'online', nowIso, dev.ip || null]
        );
      }
    }
    console.log(`[Init] 模拟数据初始化完成，插入 ${mockDevices.length} 台设备`);
    return mockDevices.length;
  } catch (e) {
    console.error('[Init] 初始化模拟数据失败:', e.message);
    return 0;
  }
}

const trafficState = {
  intervalTimer: null,
  lastValues: new Map(),
  history: []
};

function startTrafficMonitoring() {
  if (trafficState.intervalTimer) return;
  console.log('[Traffic] 正在启动实时流量监控...');

  const generateTrafficForDevice = (dev) => {
    const baseProfile = {
      router:      { up: 500,  down: 8000, burst: 1.8 },
      phone:       { up: 80,   down: 500,  burst: 2.5 },
      computer:    { up: 200,  down: 3000, burst: 3.0 },
      tablet:      { up: 60,   down: 800,  burst: 2.0 },
      tv:          { up: 100,  down: 6000, burst: 1.5 },
      smart_home:  { up: 10,   down: 30,   burst: 1.2 },
      console:     { up: 300,  down: 2000, burst: 2.2 },
      camera:      { up: 400,  down: 50,   burst: 1.3 },
      unknown:     { up: 30,   down: 200,  burst: 1.5 }
    };
    const profile = baseProfile[dev.device_type] || baseProfile.unknown;
    const hour = new Date().getHours();
    let hourFactor = 0.3;
    if (hour >= 7 && hour < 12) hourFactor = 0.8;
    else if (hour >= 12 && hour < 14) hourFactor = 1.0;
    else if (hour >= 14 && hour < 19) hourFactor = 0.7;
    else if (hour >= 19 && hour < 23) hourFactor = 1.3;
    else if (hour >= 23 || hour < 2) hourFactor = 0.5;

    const burstFactor = Math.random() < 0.15 ? profile.burst : 1.0;
    const jitter = 0.7 + Math.random() * 0.6;

    const isOnline = dev.is_online || dev.online;
    if (!isOnline) return { upload_speed: 0, download_speed: 0, upload_bytes: 0, download_bytes: 0 };

    const upSpeed = profile.up * hourFactor * burstFactor * jitter * (0.5 + Math.random());
    const downSpeed = profile.down * hourFactor * burstFactor * jitter * (0.5 + Math.random());
    const intervalSec = 2;
    return {
      upload_speed: Math.round(upSpeed * 100) / 100,
      download_speed: Math.round(downSpeed * 100) / 100,
      upload_bytes: Math.round(upSpeed * intervalSec * 1024),
      download_bytes: Math.round(downSpeed * intervalSec * 1024)
    };
  };

  trafficState.intervalTimer = setInterval(async () => {
    try {
      const devices = await allQuery('SELECT id, mac, device_type, is_online, ip, hostname, vendor, custom_name FROM devices WHERE ignored = 0');
      const nowIso = new Date().toISOString();
      const snapshot = [];

      for (const dev of devices) {
        const traffic = generateTrafficForDevice(dev);
        if (traffic.upload_speed > 0 || traffic.download_speed > 0) {
          await runQuery(
            `INSERT INTO traffic_records (device_id, mac, timestamp, upload_bytes, download_bytes, upload_speed, download_speed)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [dev.id, dev.mac, nowIso, traffic.upload_bytes, traffic.download_bytes, traffic.upload_speed, traffic.download_speed]
          );
        }
        snapshot.push({
          id: dev.id,
          mac: dev.mac,
          ip: dev.ip,
          hostname: dev.hostname,
          custom_name: dev.custom_name,
          vendor: dev.vendor,
          device_type: dev.device_type,
          is_online: !!dev.is_online,
          upload_speed: traffic.upload_speed,
          download_speed: traffic.download_speed,
          upload_bytes: traffic.upload_bytes,
          download_bytes: traffic.download_bytes,
          timestamp: nowIso
        });
      }

      trafficState.history.push({ timestamp: Date.now(), devices: snapshot });
      if (trafficState.history.length > 900) {
        trafficState.history.shift();
      }

      broadcastTrafficUpdate({
        timestamp: nowIso,
        snapshot,
        total_upload: snapshot.reduce((s, d) => s + d.upload_speed, 0),
        total_download: snapshot.reduce((s, d) => s + d.download_speed, 0),
        online_count: snapshot.filter(d => d.is_online).length
      });
    } catch (e) {
      console.error('[Traffic] 采集异常:', e.message);
    }
  }, 2000);

  cron.schedule('0 * * * *', async () => {
    try {
      console.log('[Traffic] 执行每小时流量数据聚合...');
      const oneHourAgo = new Date(Date.now() - 3600 * 1000).toISOString();
      const devices = await allQuery('SELECT DISTINCT device_id, mac FROM traffic_records WHERE timestamp >= ?', [oneHourAgo]);
      for (const d of devices) {
        const agg = await getQuery(
          `SELECT SUM(upload_bytes) as up, SUM(download_bytes) as down,
                  MAX(upload_speed) as peak_up, MAX(download_speed) as peak_down
           FROM traffic_records WHERE device_id = ? AND timestamp >= ?`,
          [d.device_id, oneHourAgo]
        );
        if (agg && (agg.up || agg.down)) {
          const today = new Date().toISOString().slice(0, 10);
          const existing = await getQuery('SELECT id FROM traffic_stats WHERE device_id = ? AND date = ? AND period_type = ?', [d.device_id, today, 'hourly']);
          if (existing) {
            await runQuery('UPDATE traffic_stats SET total_upload = total_upload + ?, total_download = total_download + ?, peak_upload_speed = MAX(peak_upload_speed, ?), peak_download_speed = MAX(peak_download_speed, ?) WHERE id = ?',
              [agg.up || 0, agg.down || 0, agg.peak_up || 0, agg.peak_down || 0, existing.id]);
          } else {
            await runQuery('INSERT INTO traffic_stats (device_id, mac, date, period_type, total_upload, total_download, peak_upload_speed, peak_download_speed) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
              [d.device_id, d.mac, today, 'hourly', agg.up || 0, agg.down || 0, agg.peak_up || 0, agg.peak_down || 0]);
          }
        }
      }
    } catch (e) {
      console.error('[Traffic] 小时聚合异常:', e.message);
    }
  });

  cron.schedule('30 2 * * *', async () => {
    try {
      console.log('[Traffic] 执行每日流量数据聚合...');
      const devices = await allQuery('SELECT DISTINCT device_id, mac FROM traffic_stats');
      const yesterday = new Date(Date.now() - 86400 * 1000).toISOString().slice(0, 10);
      for (const d of devices) {
        const agg = await getQuery(
          `SELECT SUM(total_upload) as up, SUM(total_download) as down,
                  MAX(peak_upload_speed) as peak_up, MAX(peak_download_speed) as peak_down
           FROM traffic_stats WHERE device_id = ? AND date = ? AND period_type = 'hourly'`,
          [d.device_id, yesterday]
        );
        if (agg && (agg.up || agg.down)) {
          await runQuery('INSERT OR IGNORE INTO traffic_stats (device_id, mac, date, period_type, total_upload, total_download, peak_upload_speed, peak_download_speed) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [d.device_id, d.mac, yesterday, 'daily', agg.up || 0, agg.down || 0, agg.peak_up || 0, agg.peak_down || 0]);
        }
      }
      const cutoff = new Date(Date.now() - 7 * 86400 * 1000).toISOString();
      await runQuery('DELETE FROM traffic_records WHERE timestamp < ?', [cutoff]);
      console.log('[Traffic] 清理7天前的原始流量记录完成');
    } catch (e) {
      console.error('[Traffic] 每日聚合异常:', e.message);
    }
  });

  console.log('[Traffic] 实时流量监控已启动 (2秒采样)');
}

async function startServer() {
  try {
    console.log('\n========================================');
    console.log('  家庭网络设备管理工具 - 后端服务');
    console.log('========================================\n');

    console.log('[Database] 正在初始化数据库...');
    await initializeDatabase();
    console.log('[Database] 数据库初始化完成');

    await initMockDataIfEmpty();

    const server = http.createServer(app);
    const wsServer = http.createServer();

    console.log('[WebSocket] 正在初始化WebSocket服务...');
    initWebSocket(wsServer);
    console.log('[WebSocket] WebSocket服务初始化完成');

    loadRoutes();
    startAutoScan();
    startTrafficMonitoring();

    server.listen(PORT, () => {
      console.log(`\n[HTTP] HTTP服务器已启动: http://localhost:${PORT}`);
      console.log(`[HTTP] 健康检查: http://localhost:${PORT}/api/health`);
    });

    wsServer.listen(WS_PORT, () => {
      console.log(`[WS] WebSocket服务器已启动: ws://localhost:${WS_PORT}`);
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`[HTTP] 端口 ${PORT} 已被占用，请尝试其他端口`);
      } else {
        console.error('[HTTP] 服务器错误:', err.message);
      }
      process.exit(1);
    });

    wsServer.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`[WS] 端口 ${WS_PORT} 已被占用，请尝试其他端口`);
      } else {
        console.error('[WS] 服务器错误:', err.message);
      }
    });

    process.on('SIGINT', () => {
      console.log('\n[System] 收到关闭信号，正在优雅关闭...');
      try {
        scheduledTasks.forEach(task => task.stop());
      } catch (e) {
        // ignore
      }
      server.close(() => {
        wsServer.close(() => {
          console.log('[System] 服务器已安全关闭');
          process.exit(0);
        });
      });
      setTimeout(() => {
        console.log('[System] 强制关闭');
        process.exit(1);
      }, 5000);
    });

    process.on('uncaughtException', (err) => {
      console.error('[System] 未捕获的异常:', err);
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('[System] 未处理的Promise拒绝:', reason);
    });

  } catch (err) {
    console.error('[System] 启动失败:', err);
    process.exit(1);
  }
}

startServer();

module.exports = app;
