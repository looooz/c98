const express = require('express');
const router = express.Router();
const net = require('net');
const os = require('os');
const { broadcast } = require('../websocket');
const { runQuery, getQuery, allQuery } = require('../database');

const buildResponse = (success, data = null, message = '', error = '') => {
  const resp = { success, message };
  if (success) resp.data = data;
  else resp.error = error;
  return resp;
};

const speedTests = new Map();
const { v4: uuidv4 } = require('uuid');

router.post('/ping', async (req, res) => {
  try {
    const { target, count = 4 } = req.body;
    if (!target) {
      return res.status(400).json(buildResponse(false, null, '缺少目标地址', 'MISSING_TARGET'));
    }

    const ping = require('ping');
    const results = [];
    let successCount = 0;
    let totalTime = 0;

    for (let i = 0; i < count; i++) {
      const res = await ping.promise.probe(target, { timeout: 2 });
      const result = {
        seq: i + 1,
        target: target,
        ttl: res.ttl || null,
        time: res.alive ? (parseFloat(res.time) || 0) : null,
        success: res.alive
      };
      results.push(result);
      if (result.success) {
        successCount++;
        totalTime += result.time;
      }
      if (i < count - 1) {
        await new Promise(r => setTimeout(r, 200));
      }
    }

    const lossRate = ((count - successCount) / count * 100).toFixed(1);
    const avgTime = successCount > 0 ? (totalTime / successCount).toFixed(2) : null;
    const minTime = results.filter(r => r.success).length
      ? Math.min(...results.filter(r => r.success).map(r => r.time)).toFixed(2)
      : null;
    const maxTime = results.filter(r => r.success).length
      ? Math.max(...results.filter(r => r.success).map(r => r.time)).toFixed(2)
      : null;

    res.json(buildResponse(true, {
      target,
      count,
      sent: count,
      received: successCount,
      loss_rate: parseFloat(lossRate),
      min_time: minTime ? parseFloat(minTime) : null,
      avg_time: avgTime ? parseFloat(avgTime) : null,
      max_time: maxTime ? parseFloat(maxTime) : null,
      results
    }, 'Ping测试完成'));
  } catch (err) {
    res.status(500).json(buildResponse(false, null, 'Ping测试失败', err.message));
  }
});

router.get('/network/quality', async (req, res) => {
  try {
    const ping = require('ping');
    const targets = ['8.8.8.8', '1.1.1.1', '223.5.5.5'];
    const results = [];

    for (const target of targets) {
      const p = await ping.promise.probe(target, { timeout: 3 });
      results.push({
        target,
        latency: p.alive ? (parseFloat(p.time) || 0) : null,
        loss: p.alive ? 0 : 100,
        success: p.alive
      });
    }

    const validResults = results.filter(r => r.success);
    const avgLatency = validResults.length
      ? validResults.reduce((s, r) => s + r.latency, 0) / validResults.length
      : null;
    const avgLoss = 100 - (validResults.length / results.length * 100);

    let score = 100;
    if (avgLatency !== null) {
      if (avgLatency > 300) score -= 40;
      else if (avgLatency > 150) score -= 25;
      else if (avgLatency > 80) score -= 10;
      else if (avgLatency > 40) score -= 5;
    } else {
      score -= 50;
    }

    if (avgLoss > 20) score -= 40;
    else if (avgLoss > 10) score -= 20;
    else if (avgLoss > 5) score -= 10;
    else if (avgLoss > 1) score -= 5;

    score = Math.max(0, score);

    let level = 'excellent';
    if (score < 60) level = 'poor';
    else if (score < 80) level = 'fair';
    else if (score < 90) level = 'good';

    res.json(buildResponse(true, {
      timestamp: Date.now(),
      latency: {
        value: avgLatency ? parseFloat(avgLatency.toFixed(2)) : null,
        unit: 'ms'
      },
      packet_loss: {
        value: parseFloat(avgLoss.toFixed(1)),
        unit: '%'
      },
      score: score,
      level,
      details: results
    }, '网络质量检测完成'));
  } catch (err) {
    res.status(500).json(buildResponse(false, null, '网络质量检测失败', err.message));
  }
});

router.post('/speedtest', async (req, res) => {
  try {
    const taskId = uuidv4();
    const task = {
      id: taskId,
      status: 'running',
      created_at: Date.now(),
      progress: 0,
      result: null
    };
    speedTests.set(taskId, task);
    broadcast('speedtest:started', { taskId });

    setImmediate(async () => {
      try {
        task.progress = 10;
        broadcast('speedtest:progress', task);

        let speedTest;
        try {
          speedTest = require('speedtest-net');
        } catch (e) {
          task.status = 'completed';
          task.progress = 100;
          task.result = {
            download: Math.random() * 50 + 50,
            upload: Math.random() * 20 + 10,
            ping: Math.random() * 20 + 10,
            server: { name: '模拟测试服务器', country: 'CN', sponsor: 'Mock' },
            client: { ip: '模拟IP', isp: '模拟ISP' },
            note: 'speedtest-net 模块不可用，返回模拟数据'
          };
          speedTests.set(taskId, task);
          broadcast('speedtest:completed', task);
          return;
        }

        task.progress = 30;
        broadcast('speedtest:progress', task);

        const test = await speedTest({
          acceptLicense: true,
          acceptGdpr: true,
          progress: (event) => {
            if (event && event.percent) {
              task.progress = 30 + Math.round(event.percent * 0.7);
              broadcast('speedtest:progress', task);
            }
          }
        });

        task.status = 'completed';
        task.progress = 100;
        task.result = {
          download: test.download ? (test.download.bandwidth * 8 / 1000000).toFixed(2) : null,
          upload: test.upload ? (test.upload.bandwidth * 8 / 1000000).toFixed(2) : null,
          ping: test.ping ? test.ping.latency : null,
          server: test.server ? {
            name: test.server.name,
            country: test.server.country,
            sponsor: test.server.sponsor
          } : null,
          client: test.interface ? {
            ip: test.interface.externalIp,
            isp: test.isp
          } : null
        };
        speedTests.set(taskId, task);
        broadcast('speedtest:completed', task);
      } catch (err) {
        task.status = 'failed';
        task.error = err.message;
        speedTests.set(taskId, task);
        broadcast('speedtest:failed', task);
      }
    });

    res.json(buildResponse(true, { taskId, status: 'running' }, '速度测试已启动'));
  } catch (err) {
    res.status(500).json(buildResponse(false, null, '启动速度测试失败', err.message));
  }
});

router.get('/speedtest/:taskId', (req, res) => {
  try {
    const task = speedTests.get(req.params.taskId);
    if (!task) {
      return res.status(404).json(buildResponse(false, null, '任务不存在', 'NOT_FOUND'));
    }
    res.json(buildResponse(true, task, '获取测试结果成功'));
  } catch (err) {
    res.status(500).json(buildResponse(false, null, '获取测试结果失败', err.message));
  }
});

router.post('/portscan', async (req, res) => {
  try {
    const { target, ports } = req.body;
    if (!target) {
      return res.status(400).json(buildResponse(false, null, '缺少目标地址', 'MISSING_TARGET'));
    }

    const defaultPorts = [21, 22, 23, 25, 53, 80, 110, 143, 443, 445, 3306, 3389, 5432, 6379, 8080, 8443];
    const scanPorts = ports && Array.isArray(ports) && ports.length ? ports : defaultPorts;

    const results = [];
    const timeout = 2000;

    for (const port of scanPorts) {
      const result = await new Promise((resolve) => {
        const socket = new net.Socket();
        socket.setTimeout(timeout);
        const start = Date.now();

        socket.on('connect', () => {
          socket.destroy();
          resolve({ port, open: true, latency: Date.now() - start });
        });

        socket.on('timeout', () => {
          socket.destroy();
          resolve({ port, open: false, timeout: true });
        });

        socket.on('error', () => {
          resolve({ port, open: false, timeout: false });
        });

        socket.connect(port, target);
      });
      results.push(result);
    }

    const openPorts = results.filter(r => r.open).map(r => r.port);

    res.json(buildResponse(true, {
      target,
      scanned: scanPorts.length,
      open_count: openPorts.length,
      closed_count: results.length - openPorts.length,
      open_ports: openPorts,
      results
    }, '端口扫描完成'));
  } catch (err) {
    res.status(500).json(buildResponse(false, null, '端口扫描失败', err.message));
  }
});

router.post('/traceroute', async (req, res) => {
  try {
    const { target } = req.body;
    if (!target) {
      return res.status(400).json(buildResponse(false, null, '缺少目标地址', 'MISSING_TARGET'));
    }

    const { exec } = require('child_process');
    const isWin = process.platform === 'win32';
    const cmd = isWin ? `tracert -h 30 -w 2000 ${target}` : `traceroute -m 30 -w 2 ${target}`;

    exec(cmd, { timeout: 120000 }, (error, stdout, stderr) => {
      if (error && !stdout) {
        const mockHops = [];
        for (let i = 1; i <= 10; i++) {
          mockHops.push({
            hop: i,
            hostname: i === 10 ? target : `router-${i}.local`,
            ip: `192.168.${i}.${Math.floor(Math.random() * 255)}`,
            rtt: [
              Math.random() * 50 + i * 5,
              Math.random() * 50 + i * 5,
              Math.random() * 50 + i * 5
            ]
          });
        }
        return res.json(buildResponse(true, {
          target,
          hops: mockHops,
          note: 'traceroute 命令不可用，返回模拟数据',
          raw: stderr || error.message
        }, '路由追踪完成（模拟数据）'));
      }

      const lines = (stdout || '').split('\n').filter(l => l.trim());
      const hops = [];

      for (const line of lines) {
        const match = line.match(/^\s*(\d+)\s+(.*)$/);
        if (match) {
          const hopNum = parseInt(match[1]);
          const rest = match[2];
          const times = rest.match(/(\d+(?:\.\d+)?)\s*ms/g) || [];
          const rtt = times.map(t => parseFloat(t));
          const ipMatch = rest.match(/\((\d+\.\d+\.\d+\.\d+)\)/);
          const hostMatch = rest.match(/([\w.\-]+)\s+\(/);
          hops.push({
            hop: hopNum,
            hostname: hostMatch ? hostMatch[1] : null,
            ip: ipMatch ? ipMatch[1] : null,
            rtt
          });
        }
      }

      res.json(buildResponse(true, {
        target,
        hops,
        raw: stdout
      }, '路由追踪完成'));
    });
  } catch (err) {
    res.status(500).json(buildResponse(false, null, '路由追踪失败', err.message));
  }
});

router.get('/interfaces', (req, res) => {
  try {
    const ifaces = os.networkInterfaces();
    const result = [];

    for (const [name, addrs] of Object.entries(ifaces)) {
      const ipv4 = addrs.find(a => a.family === 'IPv4' && !a.internal);
      const ipv6 = addrs.find(a => a.family === 'IPv6' && !a.internal);
      const internal = addrs.find(a => a.internal);

      result.push({
        name,
        ipv4: ipv4 ? {
          address: ipv4.address,
          netmask: ipv4.netmask,
          cidr: ipv4.cidr,
          mac: ipv4.mac
        } : null,
        ipv6: ipv6 ? {
          address: ipv6.address,
          netmask: ipv6.netmask,
          cidr: ipv6.cidr,
          mac: ipv6.mac
        } : null,
        internal: internal ? {
          address: internal.address,
          family: internal.family
        } : null,
        is_internal: !!internal && addrs.every(a => a.internal)
      });
    }

    res.json(buildResponse(true, {
      hostname: os.hostname(),
      platform: os.platform(),
      interfaces: result
    }, '获取网络接口成功'));
  } catch (err) {
    res.status(500).json(buildResponse(false, null, '获取网络接口失败', err.message));
  }
});

module.exports = router;
