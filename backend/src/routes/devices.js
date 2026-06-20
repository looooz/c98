const express = require('express');
const router = express.Router();
const { runQuery, getQuery, allQuery } = require('../database');
const { broadcast, broadcastScanProgress, broadcastAlert } = require('../websocket');
const { scanLocalNetwork, scanIpRange, mockScan, getLocalNetworkInfo, getVendorFromMac } = require('../services/deviceScanner');

const buildResponse = (success, data = null, message = '', error = '') => {
  const resp = { success, message };
  if (success) resp.data = data;
  else resp.error = error;
  return resp;
};

const getPagination = (query) => {
  const page = Math.max(1, parseInt(query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(query.pageSize) || 20));
  return { page, pageSize, offset: (page - 1) * pageSize };
};

const toTs = (isoStr) => isoStr ? new Date(isoStr).getTime() : null;
const toIso = (ts) => ts ? new Date(ts).toISOString() : null;

router.get('/', async (req, res) => {
  try {
    const { page, pageSize, offset } = getPagination(req.query);
    const { online, type, group, keyword, sortBy } = req.query;

    const where = [];
    const params = [];

    if (online !== undefined) {
      where.push('is_online = ?');
      params.push(online === 'true' || online === '1' ? 1 : 0);
    }
    if (type) {
      where.push('device_type = ?');
      params.push(type);
    }
    if (group) {
      where.push('group_name = ?');
      params.push(group);
    }
    if (keyword) {
      where.push('(custom_name LIKE ? OR mac LIKE ? OR ip LIKE ? OR hostname LIKE ?)');
      const kw = `%${keyword}%`;
      params.push(kw, kw, kw, kw);
    }

    let sql = 'SELECT * FROM devices';
    if (where.length) sql += ' WHERE ' + where.join(' AND ');

    const sortMap = {
      name: 'custom_name',
      mac: 'mac',
      ip: 'ip',
      online: 'is_online',
      last_seen: 'last_seen'
    };
    const sortField = sortMap[sortBy] || 'last_seen';
    sql += ` ORDER BY ${sortField} DESC LIMIT ? OFFSET ?`;
    params.push(pageSize, offset);

    const rows = await allQuery(sql, params);

    let countSql = 'SELECT COUNT(*) as total FROM devices';
    if (where.length) countSql += ' WHERE ' + where.join(' AND ');
    const { total } = await getQuery(countSql, params.slice(0, params.length - 2));

    const list = rows.map(r => ({
      ...r,
      ip_address: r.ip,
      mac_address: r.mac,
      online: !!r.is_online,
      first_seen_ts: toTs(r.first_seen),
      last_seen_ts: toTs(r.last_seen)
    }));

    res.json(buildResponse(true, { list, page, pageSize, total }, '获取设备列表成功'));
  } catch (err) {
    res.status(500).json(buildResponse(false, null, '获取设备列表失败', err.message));
  }
});

router.get('/:id', async (req, res) => {
  try {
    const device = await getQuery('SELECT * FROM devices WHERE id = ?', [req.params.id]);
    if (!device) {
      return res.status(404).json(buildResponse(false, null, '设备不存在', 'NOT_FOUND'));
    }
    const resp = {
      ...device,
      ip_address: device.ip,
      mac_address: device.mac,
      online: !!device.is_online,
      first_seen_ts: toTs(device.first_seen),
      last_seen_ts: toTs(device.last_seen)
    };
    res.json(buildResponse(true, resp, '获取设备详情成功'));
  } catch (err) {
    res.status(500).json(buildResponse(false, null, '获取设备详情失败', err.message));
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { custom_name, icon, group_name, notes, device_type } = req.body;
    const fields = [];
    const params = [];

    if (custom_name !== undefined) { fields.push('custom_name = ?'); params.push(custom_name); }
    if (icon !== undefined) { fields.push('icon = ?'); params.push(icon); }
    if (group_name !== undefined) { fields.push('group_name = ?'); params.push(group_name); }
    if (notes !== undefined) { fields.push('notes = ?'); params.push(notes); }
    if (device_type !== undefined) { fields.push('device_type = ?'); params.push(device_type); }

    if (!fields.length) {
      return res.status(400).json(buildResponse(false, null, '没有可更新的字段', 'NO_FIELDS'));
    }

    params.push(req.params.id);
    await runQuery(`UPDATE devices SET ${fields.join(', ')} WHERE id = ?`, params);

    const updated = await getQuery('SELECT * FROM devices WHERE id = ?', [req.params.id]);
    const resp = {
      ...updated,
      ip_address: updated.ip,
      mac_address: updated.mac,
      online: !!updated.is_online
    };
    broadcast('device:updated', resp);
    res.json(buildResponse(true, resp, '设备信息更新成功'));
  } catch (err) {
    res.status(500).json(buildResponse(false, null, '更新设备信息失败', err.message));
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await runQuery('DELETE FROM devices WHERE id = ?', [req.params.id]);
    broadcast('device:deleted', { id: req.params.id });
    res.json(buildResponse(true, null, '设备删除成功'));
  } catch (err) {
    res.status(500).json(buildResponse(false, null, '删除设备失败', err.message));
  }
});

const scanProgress = {
  running: false,
  total: 0,
  current: 0,
  found: [],
  message: ''
};

const saveDevicesToDb = async (deviceList) => {
  const now = new Date();
  const nowIso = now.toISOString();
  const stats = { new: 0, updated: 0, online: 0, offline: 0, newDevices: [] };

  const previousOnline = new Set();
  const prevRows = await allQuery('SELECT mac FROM devices WHERE is_online = 1');
  prevRows.forEach(r => previousOnline.add(r.mac));

  const scannedMacs = new Set(deviceList.map(d => d.mac));

  for (const dev of deviceList) {
    if (!dev.mac) continue;

    const existing = await getQuery('SELECT * FROM devices WHERE mac = ?', [dev.mac]);
    const isOnline = dev.is_online !== false ? 1 : 0;
    if (isOnline) stats.online++; else stats.offline++;

    if (!existing) {
      const vendor = dev.vendor || getVendorFromMac(dev.mac) || 'Unknown';
      const result = await runQuery(
        `INSERT INTO devices (mac, ip, hostname, device_type, vendor, os_info, signal_strength, rssi, is_online, first_seen, last_seen, group_name)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          dev.mac,
          dev.ip || null,
          dev.hostname || null,
          dev.device_type || 'unknown',
          vendor,
          dev.os_info || null,
          dev.signal_strength || null,
          dev.rssi || null,
          isOnline,
          nowIso,
          nowIso,
          '未分组'
        ]
      );
      stats.new++;
      const newDev = {
        id: result.id,
        mac: dev.mac,
        ip: dev.ip,
        vendor,
        device_type: dev.device_type || 'unknown',
        is_online: isOnline,
        custom_name: null,
        hostname: dev.hostname
      };
      stats.newDevices.push(newDev);

      await runQuery(
        'INSERT INTO connection_history (device_id, mac, event_type, timestamp, ip) VALUES (?, ?, ?, ?, ?)',
        [result.id, dev.mac, 'online', nowIso, dev.ip || null]
      );

      broadcastAlert({
        id: 'new_' + result.id,
        type: 'NEW_DEVICE',
        level: newDev.device_type === 'unknown' && vendor === 'Unknown' ? 'warning' : 'info',
        title: '新设备接入',
        message: `发现新设备：${vendor} ${newDev.hostname || dev.ip || dev.mac}`,
        device_id: result.id,
        mac: dev.mac,
        data: { vendor, ip: dev.ip, device_type: newDev.device_type },
        read: 0,
        timestamp: nowIso
      });
    } else {
      const fields = [];
      const params = [];

      if (dev.ip && dev.ip !== existing.ip) { fields.push('ip = ?'); params.push(dev.ip); }
      if (dev.hostname && !existing.hostname) { fields.push('hostname = ?'); params.push(dev.hostname); }
      if (!existing.vendor || existing.vendor === 'Unknown') {
        const v = dev.vendor || getVendorFromMac(dev.mac);
        if (v) { fields.push('vendor = ?'); params.push(v); }
      }
      if (dev.os_info && !existing.os_info) { fields.push('os_info = ?'); params.push(dev.os_info); }
      if (dev.signal_strength != null) { fields.push('signal_strength = ?'); params.push(dev.signal_strength); }
      if (dev.rssi != null) { fields.push('rssi = ?'); params.push(dev.rssi); }
      if (dev.device_type && existing.device_type === 'unknown') { fields.push('device_type = ?'); params.push(dev.device_type); }

      fields.push('is_online = ?'); params.push(isOnline);
      fields.push('last_seen = ?'); params.push(nowIso);

      params.push(existing.id);
      await runQuery(`UPDATE devices SET ${fields.join(', ')} WHERE id = ?`, params);
      stats.updated++;

      if (!previousOnline.has(dev.mac) && isOnline === 1) {
        await runQuery(
          'INSERT INTO connection_history (device_id, mac, event_type, timestamp, ip) VALUES (?, ?, ?, ?, ?)',
          [existing.id, dev.mac, 'online', nowIso, dev.ip || existing.ip]
        );
        broadcast('device_online', { id: existing.id, mac: dev.mac, ip: dev.ip || existing.ip, timestamp: nowIso });
      }
    }
  }

  for (const oldMac of previousOnline) {
    if (!scannedMacs.has(oldMac)) {
      const d = await getQuery('SELECT id, mac, ip FROM devices WHERE mac = ?', [oldMac]);
      if (d) {
        await runQuery('UPDATE devices SET is_online = 0, last_seen = ? WHERE id = ?', [nowIso, d.id]);
        await runQuery(
          'INSERT INTO connection_history (device_id, mac, event_type, timestamp, ip) VALUES (?, ?, ?, ?, ?)',
          [d.id, d.mac, 'offline', nowIso, d.ip]
        );
        broadcast('device_offline', { id: d.id, mac: d.mac, ip: d.ip, timestamp: nowIso });
        stats.offline++;
      }
    }
  }

  return stats;
};

router.post('/scan', async (req, res) => {
  try {
    const { ipRange, useMock = false } = req.body;

    if (scanProgress.running) {
      return res.status(409).json(buildResponse(false, null, '扫描正在进行中', 'SCANNING'));
    }

    scanProgress.running = true;
    scanProgress.total = 254;
    scanProgress.current = 0;
    scanProgress.found = [];
    scanProgress.message = '开始扫描...';

    broadcastScanProgress({
      running: true, status: 'starting', current: 0, total: 254,
      message: '开始扫描局域网设备...', timestamp: new Date().toISOString()
    });

    res.json(buildResponse(true, { started: true, ipRange, useMock }, '扫描已启动'));

    setImmediate(async () => {
      try {
        const scanStart = Date.now();
        let scannedDevices;
        let scanMethod = '';

        if (useMock) {
          scanMethod = 'mock';
          scannedDevices = mockScan();
          scanProgress.current = 60; scanProgress.total = 100;
          broadcastScanProgress({ running: true, status: 'scanning', current: 60, total: 100, message: '模拟扫描数据生成中 (60%)' });
          await new Promise(r => setTimeout(r, 400));
        } else if (ipRange) {
          scanMethod = 'range';
          const [startIp, endIp] = ipRange.split(/[-~]/).map(s => s.trim());
          broadcastScanProgress({ running: true, status: 'scanning', current: 10, total: 100, message: `正在扫描范围: ${startIp} - ${endIp}` });
          try {
            scannedDevices = await scanIpRange(startIp, endIp, (progress) => {
              const pct = Math.round(progress * 0.8 + 10);
              scanProgress.current = pct;
              if (pct % 10 === 0) {
                broadcastScanProgress({ running: true, status: 'scanning', current: pct, total: 100, message: `扫描进度 ${pct}%` });
              }
            });
          } catch (e) {
            console.log('范围扫描失败，回退到模拟:', e.message);
            scanMethod = 'mock-fallback';
            scannedDevices = mockScan();
          }
        } else {
          scanMethod = 'local';
          broadcastScanProgress({ running: true, status: 'scanning', current: 15, total: 100, message: '正在扫描本地网络...' });
          try {
            scannedDevices = await scanLocalNetwork();
            if (!scannedDevices || scannedDevices.length === 0) {
              throw new Error('未扫描到设备');
            }
          } catch (e) {
            console.log('本地扫描失败，回退到模拟:', e.message);
            scanMethod = 'mock-fallback';
            scannedDevices = mockScan();
          }
          scanProgress.current = 75;
          broadcastScanProgress({ running: true, status: 'processing', current: 75, total: 100, message: `发现 ${scannedDevices.length} 台设备，正在写入数据库...` });
        }

        scanProgress.found = scannedDevices;
        scanProgress.current = 85;
        broadcastScanProgress({ running: true, status: 'saving', current: 85, total: 100, message: '正在更新设备数据库...' });

        const dbStats = await saveDevicesToDb(scannedDevices);

        scanProgress.running = false;
        scanProgress.current = 100;
        scanProgress.message = `扫描完成，发现 ${scannedDevices.length} 台设备`;
        broadcastScanProgress({
          running: false, status: 'completed', current: 100, total: 100,
          message: `扫描完成，发现 ${scannedDevices.length} 台设备，新设备 ${dbStats.new} 台`,
          stats: {
            totalFound: scannedDevices.length,
            ...dbStats,
            duration: Date.now() - scanStart,
            method: scanMethod
          }
        });
        broadcast('devices:refresh', {});
      } catch (err) {
        console.error('[Scan] 扫描异常:', err);
        scanProgress.running = false;
        scanProgress.message = '扫描失败: ' + err.message;
        broadcastScanProgress({
          running: false, status: 'failed', error: err.message,
          message: '扫描失败: ' + err.message
        });
      }
    });
  } catch (err) {
    scanProgress.running = false;
    res.status(500).json(buildResponse(false, null, '启动扫描失败', err.message));
  }
});

router.get('/network/info', async (req, res) => {
  try {
    const info = getLocalNetworkInfo();
    res.json(buildResponse(true, info, '获取网络信息成功'));
  } catch (err) {
    res.status(500).json(buildResponse(false, null, '获取网络信息失败', err.message));
  }
});

router.get('/scan/progress', (req, res) => {
  res.json(buildResponse(true, scanProgress, '获取扫描进度成功'));
});

router.post('/:id/ignore', async (req, res) => {
  try {
    await runQuery('UPDATE devices SET ignored = 1 WHERE id = ?', [req.params.id]);
    const device = await getQuery('SELECT * FROM devices WHERE id = ?', [req.params.id]);
    const resp = {
      ...device,
      ip_address: device.ip,
      mac_address: device.mac,
      online: !!device.is_online
    };
    broadcast('device:ignored', resp);
    res.json(buildResponse(true, resp, '设备已忽略'));
  } catch (err) {
    res.status(500).json(buildResponse(false, null, '忽略设备失败', err.message));
  }
});

router.post('/:id/unignore', async (req, res) => {
  try {
    await runQuery('UPDATE devices SET ignored = 0 WHERE id = ?', [req.params.id]);
    const device = await getQuery('SELECT * FROM devices WHERE id = ?', [req.params.id]);
    const resp = {
      ...device,
      ip_address: device.ip,
      mac_address: device.mac,
      online: !!device.is_online
    };
    broadcast('device:unignored', resp);
    res.json(buildResponse(true, resp, '已取消忽略'));
  } catch (err) {
    res.status(500).json(buildResponse(false, null, '取消忽略失败', err.message));
  }
});

router.post('/merge', async (req, res) => {
  try {
    const { sourceIds, targetId } = req.body;

    if (!sourceIds || !Array.isArray(sourceIds) || !sourceIds.length || !targetId) {
      return res.status(400).json(buildResponse(false, null, '参数缺失', 'MISSING_PARAMS'));
    }

    const target = await getQuery('SELECT * FROM devices WHERE id = ?', [targetId]);
    if (!target) {
      return res.status(404).json(buildResponse(false, null, '目标设备不存在', 'NOT_FOUND'));
    }

    for (const sid of sourceIds) {
      const src = await getQuery('SELECT mac FROM devices WHERE id = ?', [sid]);
      if (src) {
        await runQuery('UPDATE connection_history SET device_id = ?, mac = ? WHERE device_id = ?', [targetId, target.mac, sid]);
        await runQuery('UPDATE traffic_records SET device_id = ?, mac = ? WHERE device_id = ?', [targetId, target.mac, sid]);
        await runQuery('UPDATE parental_rules SET device_id = ?, mac = ? WHERE device_id = ?', [targetId, target.mac, sid]);
        await runQuery('UPDATE scheduled_tasks SET device_id = ? WHERE device_id = ?', [targetId, sid]);
        await runQuery('UPDATE alerts SET device_id = ?, mac = ? WHERE device_id = ?', [targetId, target.mac, sid]);
      }
      await runQuery('UPDATE devices SET merged_to = ? WHERE id = ?', [targetId, sid]);
      await runQuery('DELETE FROM devices WHERE id = ?', [sid]);
    }

    const merged = await getQuery('SELECT * FROM devices WHERE id = ?', [targetId]);
    const resp = {
      ...merged,
      ip_address: merged.ip,
      mac_address: merged.mac,
      online: !!merged.is_online
    };
    broadcast('device:merged', { target: resp, sourceIds });
    res.json(buildResponse(true, resp, `已合并 ${sourceIds.length} 个设备`));
  } catch (err) {
    res.status(500).json(buildResponse(false, null, '合并设备失败', err.message));
  }
});

router.post('/import', async (req, res) => {
  try {
    const devices = req.body;
    if (!Array.isArray(devices)) {
      return res.status(400).json(buildResponse(false, null, '数据格式错误，需要JSON数组', 'INVALID_FORMAT'));
    }

    let imported = 0;
    let failed = 0;

    for (const dev of devices) {
      const mac = dev.mac_address || dev.mac;
      if (!mac) {
        failed++;
        continue;
      }
      const existing = await getQuery('SELECT id FROM devices WHERE mac = ?', [mac]);
      if (existing) {
        failed++;
        continue;
      }
      const nowIso = new Date().toISOString();
      await runQuery(
        `INSERT INTO devices (mac, ip, hostname, custom_name, device_type, icon, group_name, notes, is_online, ignored, first_seen, last_seen)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          mac,
          dev.ip_address || dev.ip || null,
          dev.hostname || null,
          dev.custom_name || null,
          dev.device_type || 'unknown',
          dev.icon || null,
          dev.group_name || '未分组',
          dev.notes || null,
          dev.online || dev.is_online ? 1 : 0,
          dev.ignored ? 1 : 0,
          nowIso,
          nowIso
        ]
      );
      imported++;
    }

    broadcast('devices:imported', { imported, failed });
    res.json(buildResponse(true, { imported, failed }, `导入完成: 成功${imported}条, 失败${failed}条`));
  } catch (err) {
    res.status(500).json(buildResponse(false, null, '导入设备失败', err.message));
  }
});

router.get('/export', async (req, res) => {
  try {
    const rows = await allQuery('SELECT * FROM devices ORDER BY last_seen DESC');
    const list = rows.map(r => ({
      ...r,
      ip_address: r.ip,
      mac_address: r.mac,
      online: !!r.is_online
    }));
    res.setHeader('Content-Disposition', `attachment; filename="devices_${Date.now()}.json"`);
    res.setHeader('Content-Type', 'application/json');
    res.json(buildResponse(true, list, '导出设备列表成功'));
  } catch (err) {
    res.status(500).json(buildResponse(false, null, '导出设备失败', err.message));
  }
});

router.get('/groups', async (req, res) => {
  try {
    const rows = await allQuery(
      'SELECT group_name as name, COUNT(*) as count, SUM(is_online) as online_count FROM devices GROUP BY group_name ORDER BY name'
    );
    res.json(buildResponse(true, rows, '获取分组列表成功'));
  } catch (err) {
    res.status(500).json(buildResponse(false, null, '获取分组列表失败', err.message));
  }
});

router.get('/types', async (req, res) => {
  try {
    const rows = await allQuery(
      'SELECT device_type as type, COUNT(*) as count, SUM(is_online) as online_count FROM devices GROUP BY device_type ORDER BY count DESC'
    );
    res.json(buildResponse(true, rows, '获取设备类型统计成功'));
  } catch (err) {
    res.status(500).json(buildResponse(false, null, '获取设备类型统计失败', err.message));
  }
});

module.exports = router;
