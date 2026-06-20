const express = require('express');
const cors = require('cors');
const http = require('http');
const path = require('path');
const fs = require('fs');
const cron = require('node-cron');

const { initializeDatabase, getQuery, runQuery, allQuery } = require('./database');
const { initWebSocket, broadcast, broadcastScanProgress, broadcastOnlineStatus, broadcastTrafficUpdate, broadcastAlert } = require('./websocket');
const { scanLocalNetwork, scanIpRange, getVendorFromMac, getLocalNetworkInfo } = require('./services/deviceScanner');

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

const scheduledTasks = new Map();

function startAutoScan() {
  console.log('[Scheduler] 正在初始化自动扫描任务...');

  const quickScanCron = '*/5 * * * *';
  const quickTask = cron.schedule(quickScanCron, async () => {
    console.log('[Scheduler] 触发快速在线状态检查');
    try {
      const devices = await allQuery('SELECT id, mac, ip, is_online FROM devices WHERE ignored = 0');
      if (devices.length === 0) return;

      const nowIso = new Date().toISOString();
      let changedCount = 0;

      for (const dev of devices) {
        if (!dev.ip) continue;
        try {
          const ping = require('ping');
          const res = await ping.promise.probe(dev.ip, { timeout: 1, extra: ['-c', '1'] });
          const nowOnline = res.alive ? 1 : 0;

          if (nowOnline !== dev.is_online) {
            changedCount++;
            await runQuery('UPDATE devices SET is_online = ?, last_seen = ? WHERE id = ?',
              [nowOnline, nowIso, dev.id]);
            await runQuery(
              'INSERT INTO connection_history (device_id, mac, event_type, timestamp, ip) VALUES (?, ?, ?, ?, ?)',
              [dev.id, dev.mac, nowOnline ? 'online' : 'offline', nowIso, dev.ip]
            );
            broadcast(nowOnline ? 'device_online' : 'device_offline', {
              id: dev.id, mac: dev.mac, ip: dev.ip, timestamp: nowIso
            });
          } else if (nowOnline) {
            await runQuery('UPDATE devices SET last_seen = ? WHERE id = ?', [nowIso, dev.id]);
          }
        } catch (e) {
          // 单设备失败不影响其他
        }
      }

      if (changedCount > 0) {
        broadcast('devices:refresh', { changed: changedCount, timestamp: nowIso });
      }
      broadcastOnlineStatus({
        type: 'status_update',
        timestamp: nowIso,
        changed: changedCount
      });
      console.log(`[Scheduler] 在线状态检查完成，${changedCount} 台设备状态变化`);
    } catch (e) {
      console.error('[Scheduler] 快速扫描异常:', e.message);
    }
  });
  scheduledTasks.set('quick_scan', quickTask);
  console.log(`[Scheduler] 快速在线检查任务已启动，周期: 5分钟`);

  const fullScanCron = '0 */2 * * *';
  const fullTask = cron.schedule(fullScanCron, async () => {
    console.log('[Scheduler] 触发完整局域网扫描');
    try {
      broadcastScanProgress({
        status: 'scheduled', message: '定时扫描开始', timestamp: new Date().toISOString()
      });
      const result = await performRealScanAndSave(true);
      broadcastScanProgress({
        status: 'completed', ...result, message: `定时扫描完成，发现 ${result.total || 0} 台设备`
      });
      broadcast('devices:refresh', {});
      console.log(`[Scheduler] 完整扫描完成:`, result);
    } catch (e) {
      console.error('[Scheduler] 完整扫描异常:', e.message);
    }
  });
  scheduledTasks.set('full_scan', fullTask);
  console.log(`[Scheduler] 完整扫描任务已启动，周期: 每2小时`);
}

async function performRealScanAndSave(useMockOnFail = true) {
  try {
    console.log('[Init] 正在执行真实局域网扫描...');
    let scanResult;
    try {
      scanResult = await scanLocalNetwork();
    } catch (scanErr) {
      console.warn('[Init] 真实扫描失败:', scanErr.message);
      if (!useMockOnFail) {
        throw scanErr;
      }
      throw scanErr;
    }

    if (!scanResult || !scanResult.devices || scanResult.devices.length === 0) {
      console.warn('[Init] 扫描结果为空');
      return { count: 0, method: 'real', empty: true };
    }

    const nowIso = new Date().toISOString();
    const isMock = !!scanResult.isMock;
    let count = 0;

    for (const dev of scanResult.devices) {
      if (!dev.mac && !dev.ip) continue;

      let mac = dev.mac;
      let existing = null;
      if (mac) {
        existing = await getQuery('SELECT id, is_online FROM devices WHERE mac = ?', [mac]);
      }

      const vendor = dev.vendor || (mac ? getVendorFromMac(mac) : null) || 'Unknown';
      const isOnline = dev.isOnline !== false ? 1 : 0;
      const deviceType = inferDeviceType(dev.type || dev.device_type || dev.category, vendor, dev.os);
      const hostname = dev.hostname || dev.name || null;
      const osInfo = dev.os || dev.os_info || null;

      if (existing) {
        await runQuery(
          'UPDATE devices SET ip = ?, hostname = ?, vendor = ?, device_type = ?, os_info = ?, is_online = ?, last_seen = ? WHERE id = ?',
          [dev.ip || null, hostname, vendor, deviceType, osInfo, isOnline, nowIso, existing.id]
        );
        if (isOnline && !existing.is_online) {
          await runQuery(
            'INSERT INTO connection_history (device_id, mac, event_type, timestamp, ip) VALUES (?, ?, ?, ?, ?)',
            [existing.id, mac, 'online', nowIso, dev.ip || null]
          );
          broadcast('device_online', { id: existing.id, mac, ip: dev.ip, timestamp: nowIso });
        }
      } else if (mac) {
        const result = await runQuery(
          `INSERT INTO devices (mac, ip, hostname, device_type, vendor, os_info, signal_strength, rssi, is_online, first_seen, last_seen, group_name, custom_name)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [mac, dev.ip || null, hostname, deviceType, vendor, osInfo, null, null, isOnline, nowIso, nowIso, '未分组', null]
        );
        if (isOnline) {
          await runQuery(
            'INSERT INTO connection_history (device_id, mac, event_type, timestamp, ip) VALUES (?, ?, ?, ?, ?)',
            [result.id, mac, 'online', nowIso, dev.ip || null]
          );
        }
        if (!isMock) {
          broadcastAlert({
            type: 'NEW_DEVICE',
            level: deviceType === 'unknown' ? 'warning' : 'info',
            title: '发现新设备',
            message: `新设备接入网络：${vendor}（${hostname || dev.ip}）`,
            device_id: result.id,
            mac,
            data: { vendor, ip: dev.ip, device_type: deviceType, method: 'scan' },
            read: 0,
            timestamp: nowIso
          });
        }
        count++;
      }
    }

    console.log(`[Init] 扫描完成，发现 ${scanResult.devices.length} 台设备，新增 ${count} 台`);
    return { count, total: scanResult.devices.length, method: isMock ? 'mock-fallback' : 'real' };
  } catch (e) {
    console.error('[Init] 真实扫描初始化失败:', e.message);
    return { count: 0, method: 'failed', error: e.message };
  }
}

function inferDeviceType(type, vendor, os) {
  if (!type) {
    const vl = (vendor || '').toLowerCase();
    const ol = (os || '').toLowerCase();
    if (ol.includes('ios') || vl.includes('apple') && (ol.includes('phone') || type === 'smartphone')) return 'phone';
    if (ol.includes('tv') || type === 'smarttv' || type === 'tvbox') return 'tv';
    if (type === 'console' || ol.includes('playstation') || ol.includes('switch') || ol.includes('xbox')) return 'console';
    if (type === 'camera' || vl.includes('hikvision') || vl.includes('dahua') || type === 'cctv') return 'camera';
    if (type === 'router' || type === 'gateway' || vl.includes('cisco') || vl.includes('tplink') || vl.includes('huawei') && type !== 'phone') return 'router';
    if (type === 'smartspeaker' || type === 'light' || type === 'plug' || type === 'climate' || type === 'security' || type === 'sensor') return 'smart_home';
    if (type === 'laptop' || type === 'desktop' || type === 'sbc' || ol.includes('windows') || ol.includes('macos') || ol.includes('linux')) return 'computer';
    if (type === 'smartphone' || type === 'mobile' || ol.includes('android')) return 'phone';
    if (type === 'tablet') return 'tablet';
    if (type === 'nas' || type === 'storage') return 'computer';
    if (type === 'iot' || type === 'peripheral' || type === 'printer') return 'smart_home';
    return 'unknown';
  }
  const typeMap = {
    router: 'router', gateway: 'router',
    smartphone: 'phone', phone: 'phone', mobile: 'phone',
    tablet: 'tablet',
    laptop: 'computer', desktop: 'computer', sbc: 'computer', pc: 'computer',
    smarttv: 'tv', tvbox: 'tv', tv: 'tv',
    console: 'console',
    camera: 'camera', cctv: 'camera',
    smartspeaker: 'smart_home', light: 'smart_home', plug: 'smart_home',
    climate: 'smart_home', security: 'smart_home', iot: 'smart_home', sensor: 'smart_home',
    nas: 'computer', storage: 'computer',
    printer: 'smart_home', peripheral: 'smart_home'
  };
  return typeMap[type] || 'unknown';
}

const trafficState = {
  intervalTimer: null,
  lastValues: new Map(),
  history: []
};

function startTrafficMonitoring() {
  if (trafficState.intervalTimer) return;
  console.log('[Traffic] 正在启动实时流量监控...');

  const { getTotalTrafficRate, estimateDeviceActivity } = require('./services/systemTraffic');

  trafficState.intervalTimer = setInterval(async () => {
    try {
      const totalRate = await getTotalTrafficRate();
      const devices = await allQuery(
        'SELECT id, mac, device_type, is_online, ip, hostname, vendor, custom_name FROM devices WHERE ignored = 0'
      );
      const nowIso = new Date().toISOString();
      const snapshot = [];

      for (const dev of devices) {
        const traffic = estimateDeviceActivity(dev, totalRate);
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
          is_estimated: traffic.is_estimated,
          estimate_confidence: traffic.estimate_confidence,
          based_on: traffic.based_on,
          timestamp: nowIso
        });
      }

      trafficState.history.push({ timestamp: Date.now(), devices: snapshot, totalRate });
      if (trafficState.history.length > 900) {
        trafficState.history.shift();
      }

      const totalUp = snapshot.reduce((s, d) => s + d.upload_speed, 0);
      const totalDown = snapshot.reduce((s, d) => s + d.download_speed, 0);

      broadcastTrafficUpdate({
        timestamp: nowIso,
        snapshot,
        total_upload: totalUp,
        total_download: totalDown,
        system_total_upload: totalRate.total_upload_kbps,
        system_total_download: totalRate.total_download_kbps,
        system_has_real_data: totalRate.has_real_data,
        device_traffic_is_estimated: true,
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
          const existing = await getQuery('SELECT id FROM traffic_stats WHERE device_id = ? AND date = ? AND period_type = ?',
            [d.device_id, today, 'hourly']);
          if (existing) {
            await runQuery(
              'UPDATE traffic_stats SET total_upload = total_upload + ?, total_download = total_download + ?, peak_upload_speed = MAX(peak_upload_speed, ?), peak_download_speed = MAX(peak_download_speed, ?) WHERE id = ?',
              [agg.up || 0, agg.down || 0, agg.peak_up || 0, agg.peak_down || 0, existing.id]
            );
          } else {
            await runQuery(
              'INSERT INTO traffic_stats (device_id, mac, date, period_type, total_upload, total_download, peak_upload_speed, peak_download_speed) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
              [d.device_id, d.mac, today, 'hourly', agg.up || 0, agg.down || 0, agg.peak_up || 0, agg.peak_down || 0]
            );
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
          await runQuery(
            'INSERT OR IGNORE INTO traffic_stats (device_id, mac, date, period_type, total_upload, total_download, peak_upload_speed, peak_download_speed) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [d.device_id, d.mac, yesterday, 'daily', agg.up || 0, agg.down || 0, agg.peak_up || 0, agg.peak_down || 0]
          );
        }
      }
      const cutoff = new Date(Date.now() - 7 * 86400 * 1000).toISOString();
      await runQuery('DELETE FROM traffic_records WHERE timestamp < ?', [cutoff]);
      console.log('[Traffic] 清理7天前的原始流量记录完成');
    } catch (e) {
      console.error('[Traffic] 每日聚合异常:', e.message);
    }
  });

  console.log('[Traffic] 实时流量监控已启动 (2秒采样，系统总流量真实，设备级流量为活跃度估算)');
}

async function startServer() {
  try {
    console.log('\n========================================');
    console.log('  家庭网络设备管理工具 - 后端服务');
    console.log('========================================\n');

    console.log('[Database] 正在初始化数据库...');
    await initializeDatabase();
    console.log('[Database] 数据库初始化完成');

    const { count: devCount } = await getQuery('SELECT COUNT(*) as count FROM devices') || { count: 0 };
    if (devCount === 0) {
      console.log('[Init] 数据库为空，启动首次真实扫描...');
      await performRealScanAndSave(true);
    } else {
      console.log(`[Init] 数据库已有 ${devCount} 台设备，将在后台刷新在线状态`);
      setImmediate(() => performRealScanAndSave(true).catch(e => console.warn('[Init] 后台扫描刷新失败:', e.message)));
    }

    const server = http.createServer(app);
    const wsServer = http.createServer();

    console.log('[WebSocket] 正在初始化WebSocket服务...');
    initWebSocket(wsServer);
    console.log('[WebSocket] WebSocket服务初始化完成');

    loadRoutes();

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
