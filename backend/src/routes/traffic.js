const express = require('express');
const router = express.Router();
const { runQuery, getQuery, allQuery } = require('../database');
const { broadcast } = require('../websocket');

const buildResponse = (success, data = null, message = '', error = '') => {
  const resp = { success, message };
  if (success) resp.data = data;
  else resp.error = error;
  return resp;
};

const getPeriodRange = (period) => {
  const now = new Date();
  const start = new Date();
  switch (period) {
    case 'today':
      start.setHours(0, 0, 0, 0);
      break;
    case 'week':
      start.setDate(now.getDate() - 7);
      break;
    case 'month':
      start.setMonth(now.getMonth() - 1);
      break;
    case 'year':
      start.setFullYear(now.getFullYear() - 1);
      break;
    default:
      start.setHours(0, 0, 0, 0);
  }
  return { startTime: start.toISOString(), endTime: now.toISOString(), startTs: start.getTime(), endTs: now.getTime() };
};

const toTs = (isoStr) => isoStr ? new Date(isoStr).getTime() : null;

router.get('/realtime', async (req, res) => {
  try {
    const fiveSecAgo = new Date(Date.now() - 5000).toISOString();
    const rows = await allQuery(
      `SELECT tr.device_id, d.custom_name, d.mac,
              COALESCE(SUM(tr.upload_speed), 0) as upload_speed,
              COALESCE(SUM(tr.download_speed), 0) as download_speed,
              MAX(tr.timestamp) as timestamp
       FROM traffic_records tr
       LEFT JOIN devices d ON d.id = tr.device_id
       WHERE tr.timestamp >= ?
       GROUP BY tr.device_id`,
      [fiveSecAgo]
    );

    const devices = await allQuery('SELECT id, custom_name, mac, is_online FROM devices WHERE is_online = 1');
    const resultMap = {};
    for (const dev of devices) {
      resultMap[dev.id] = {
        device_id: dev.id,
        custom_name: dev.custom_name,
        mac_address: dev.mac,
        upload_speed: 0,
        download_speed: 0,
        timestamp: new Date().toISOString()
      };
    }
    for (const row of rows) {
      if (resultMap[row.device_id]) {
        resultMap[row.device_id].upload_speed = row.upload_speed || 0;
        resultMap[row.device_id].download_speed = row.download_speed || 0;
        resultMap[row.device_id].timestamp = row.timestamp;
      }
    }

    res.json(buildResponse(true, Object.values(resultMap), '获取实时流量成功'));
  } catch (err) {
    res.status(500).json(buildResponse(false, null, '获取实时流量失败', err.message));
  }
});

router.get('/realtime/:deviceId', async (req, res) => {
  try {
    const fiveSecAgo = new Date(Date.now() - 5000).toISOString();
    const rows = await allQuery(
      `SELECT tr.*, d.custom_name, d.mac
       FROM traffic_records tr
       LEFT JOIN devices d ON d.id = tr.device_id
       WHERE tr.device_id = ? AND tr.timestamp >= ?
       ORDER BY tr.timestamp DESC`,
      [req.params.deviceId, fiveSecAgo]
    );

    const latest = rows[0] || {
      device_id: req.params.deviceId,
      upload_speed: 0,
      download_speed: 0,
      timestamp: new Date().toISOString()
    };

    res.json(buildResponse(true, latest, '获取设备实时流量成功'));
  } catch (err) {
    res.status(500).json(buildResponse(false, null, '获取设备实时流量失败', err.message));
  }
});

router.get('/history/:deviceId', async (req, res) => {
  try {
    let { startTime, endTime, interval = '1h' } = req.query;
    const startTs = startTime ? parseInt(startTime) : Date.now() - 24 * 60 * 60 * 1000;
    const endTs = endTime ? parseInt(endTime) : Date.now();
    const startIso = new Date(startTs).toISOString();
    const endIso = new Date(endTs).toISOString();

    const intervalMs = {
      '1m': 60 * 1000,
      '5m': 5 * 60 * 1000,
      '15m': 15 * 60 * 1000,
      '30m': 30 * 60 * 1000,
      '1h': 60 * 60 * 1000,
      '6h': 6 * 60 * 60 * 1000,
      '1d': 24 * 60 * 60 * 1000
    }[interval] || 60 * 60 * 1000;

    const rows = await allQuery(
      `SELECT * FROM traffic_records
       WHERE device_id = ? AND timestamp >= ? AND timestamp <= ?
       ORDER BY timestamp ASC`,
      [req.params.deviceId, startIso, endIso]
    );

    const aggregated = {};
    for (const row of rows) {
      const ts = toTs(row.timestamp);
      const bucket = Math.floor(ts / intervalMs) * intervalMs;
      if (!aggregated[bucket]) {
        aggregated[bucket] = {
          timestamp: bucket,
          upload: 0,
          download: 0,
          avg_upload_speed: 0,
          avg_download_speed: 0,
          count: 0
        };
      }
      aggregated[bucket].upload += row.upload_bytes || 0;
      aggregated[bucket].download += row.download_bytes || 0;
      aggregated[bucket].avg_upload_speed += row.upload_speed || 0;
      aggregated[bucket].avg_download_speed += row.download_speed || 0;
      aggregated[bucket].count++;
    }

    const data = Object.values(aggregated).map(item => ({
      ...item,
      avg_upload_speed: item.count ? Math.round(item.avg_upload_speed / item.count) : 0,
      avg_download_speed: item.count ? Math.round(item.avg_download_speed / item.count) : 0
    }));

    res.json(buildResponse(true, data, '获取历史流量成功'));
  } catch (err) {
    res.status(500).json(buildResponse(false, null, '获取历史流量失败', err.message));
  }
});

router.get('/stats', async (req, res) => {
  try {
    const period = req.query.period || 'today';
    const { startTime, endTime, startTs, endTs } = getPeriodRange(period);

    const totalRow = await getQuery(
      `SELECT
         COALESCE(SUM(upload_bytes), 0) as total_upload,
         COALESCE(SUM(download_bytes), 0) as total_download,
         COUNT(DISTINCT device_id) as active_devices
       FROM traffic_records
       WHERE timestamp >= ? AND timestamp <= ?`,
      [startTime, endTime]
    );

    const peakRow = await getQuery(
      `SELECT MAX(upload_speed + download_speed) as peak_speed
       FROM traffic_records
       WHERE timestamp >= ? AND timestamp <= ?`,
      [startTime, endTime]
    );

    const avgSpeedRow = await getQuery(
      `SELECT
         COALESCE(AVG(upload_speed), 0) as avg_upload_speed,
         COALESCE(AVG(download_speed), 0) as avg_download_speed
       FROM traffic_records
       WHERE timestamp >= ? AND timestamp <= ?`,
      [startTime, endTime]
    );

    res.json(buildResponse(true, {
      period,
      startTs,
      endTs,
      total_upload: totalRow.total_upload,
      total_download: totalRow.total_download,
      total: totalRow.total_upload + totalRow.total_download,
      active_devices: totalRow.active_devices,
      peak_speed: peakRow.peak_speed || 0,
      avg_upload_speed: Math.round(avgSpeedRow.avg_upload_speed),
      avg_download_speed: Math.round(avgSpeedRow.avg_download_speed)
    }, '获取流量统计成功'));
  } catch (err) {
    res.status(500).json(buildResponse(false, null, '获取流量统计失败', err.message));
  }
});

router.get('/rankings', async (req, res) => {
  try {
    const period = req.query.period || 'today';
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
    const { startTime, endTime } = getPeriodRange(period);

    const rows = await allQuery(
      `SELECT
         tr.device_id,
         d.custom_name,
         d.mac,
         d.icon,
         COALESCE(SUM(tr.upload_bytes), 0) as upload,
         COALESCE(SUM(tr.download_bytes), 0) as download,
         COALESCE(SUM(tr.upload_bytes + tr.download_bytes), 0) as total
       FROM traffic_records tr
       LEFT JOIN devices d ON d.id = tr.device_id
       WHERE tr.timestamp >= ? AND tr.timestamp <= ?
       GROUP BY tr.device_id
       ORDER BY total DESC
       LIMIT ?`,
      [startTime, endTime, limit]
    );

    const result = rows.map(r => ({ ...r, mac_address: r.mac }));

    res.json(buildResponse(true, { period, limit, list: result }, '获取流量排行成功'));
  } catch (err) {
    res.status(500).json(buildResponse(false, null, '获取流量排行失败', err.message));
  }
});

router.get('/trend', async (req, res) => {
  try {
    const period = req.query.period || 'week';
    const deviceId = req.query.deviceId;

    const { startTime, endTime, startTs, endTs } = getPeriodRange(period);

    let intervalMs;
    switch (period) {
      case 'today':
        intervalMs = 60 * 60 * 1000;
        break;
      case 'week':
        intervalMs = 24 * 60 * 60 * 1000;
        break;
      case 'month':
        intervalMs = 24 * 60 * 60 * 1000;
        break;
      case 'year':
        intervalMs = 30 * 24 * 60 * 60 * 1000;
        break;
      default:
        intervalMs = 24 * 60 * 60 * 1000;
    }

    const params = [startTime, endTime];
    let deviceSql = '';
    if (deviceId) {
      deviceSql = ' AND device_id = ?';
      params.push(deviceId);
    }

    const rows = await allQuery(
      `SELECT timestamp, upload_bytes, download_bytes
       FROM traffic_records
       WHERE timestamp >= ? AND timestamp <= ?${deviceSql}
       ORDER BY timestamp ASC`,
      params
    );

    const aggregated = {};
    for (const row of rows) {
      const ts = toTs(row.timestamp);
      const bucket = Math.floor(ts / intervalMs) * intervalMs;
      if (!aggregated[bucket]) {
        aggregated[bucket] = { timestamp: bucket, upload: 0, download: 0 };
      }
      aggregated[bucket].upload += row.upload_bytes || 0;
      aggregated[bucket].download += row.download_bytes || 0;
    }

    const labels = [];
    const uploadData = [];
    const downloadData = [];

    for (let t = Math.floor(startTs / intervalMs) * intervalMs; t <= endTs; t += intervalMs) {
      labels.push(new Date(t).toLocaleString());
      const item = aggregated[t] || { upload: 0, download: 0 };
      uploadData.push(item.upload);
      downloadData.push(item.download);
    }

    res.json(buildResponse(true, {
      period,
      labels,
      upload: uploadData,
      download: downloadData,
      device_id: deviceId || null
    }, '获取流量趋势成功'));
  } catch (err) {
    res.status(500).json(buildResponse(false, null, '获取流量趋势失败', err.message));
  }
});

module.exports = router;
