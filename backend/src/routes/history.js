const express = require('express');
const router = express.Router();
const { runQuery, getQuery, allQuery } = require('../database');

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

router.get('/', async (req, res) => {
  try {
    const { page, pageSize, offset } = getPagination(req.query);
    const { deviceId, mac, startTime, endTime } = req.query;

    const where = [];
    const params = [];

    if (deviceId) {
      where.push('ch.device_id = ?');
      params.push(deviceId);
    }
    if (mac) {
      where.push('ch.mac = ?');
      params.push(mac);
    }
    if (startTime) {
      where.push('ch.timestamp >= ?');
      params.push(new Date(parseInt(startTime)).toISOString());
    }
    if (endTime) {
      where.push('ch.timestamp <= ?');
      params.push(new Date(parseInt(endTime)).toISOString());
    }

    let sql = `SELECT ch.*, d.custom_name, d.ip as ip_address
               FROM connection_history ch
               LEFT JOIN devices d ON d.id = ch.device_id`;
    if (where.length) sql += ' WHERE ' + where.join(' AND ');
    sql += ' ORDER BY ch.timestamp DESC LIMIT ? OFFSET ?';
    params.push(pageSize, offset);

    const rows = await allQuery(sql, params);

    let countSql = `SELECT COUNT(*) as total FROM connection_history ch
                    LEFT JOIN devices d ON d.id = ch.device_id`;
    if (where.length) countSql += ' WHERE ' + where.join(' AND ');
    const { total } = await getQuery(countSql, params.slice(0, params.length - 2));

    const list = rows.map(r => ({
      ...r,
      mac_address: r.mac,
      connect_time: toTs(r.timestamp),
      timestamp_ts: toTs(r.timestamp),
      duration_seconds: r.duration || 0
    }));

    res.json(buildResponse(true, { list, page, pageSize, total }, '获取连接历史成功'));
  } catch (err) {
    res.status(500).json(buildResponse(false, null, '获取连接历史失败', err.message));
  }
});

router.get('/timeline/:deviceId', async (req, res) => {
  try {
    const days = 7;
    const startTime = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const rows = await allQuery(
      `SELECT timestamp, duration, event_type, ip
       FROM connection_history
       WHERE device_id = ? AND timestamp >= ?
       ORDER BY timestamp ASC`,
      [req.params.deviceId, startTime]
    );

    const result = {};
    for (let i = 0; i < days; i++) {
      const dayStart = new Date();
      dayStart.setHours(0, 0, 0, 0);
      dayStart.setDate(dayStart.getDate() - (days - 1 - i));
      const key = dayStart.toISOString().split('T')[0];
      result[key] = [];
    }

    for (const row of rows) {
      const ts = toTs(row.timestamp);
      const connect = new Date(ts);
      const key = connect.toISOString().split('T')[0];
      if (result[key]) {
        const startMin = connect.getHours() * 60 + connect.getMinutes();
        const durationMin = Math.ceil((row.duration || 0) / 60);
        const endMin = Math.min(24 * 60, startMin + Math.max(1, durationMin));
        result[key].push({
          start: startMin,
          end: endMin,
          duration: row.duration || 0,
          event_type: row.event_type,
          ip_address: row.ip
        });
      }
    }

    const timeline = Object.keys(result).sort().map(date => ({
      date,
      periods: result[date],
      total_seconds: result[date].reduce((sum, p) => sum + p.duration, 0)
    }));

    res.json(buildResponse(true, { device_id: req.params.deviceId, days, timeline }, '获取设备时间线成功'));
  } catch (err) {
    res.status(500).json(buildResponse(false, null, '获取设备时间线失败', err.message));
  }
});

router.get('/daily/:deviceId', async (req, res) => {
  try {
    const days = Math.min(365, Math.max(1, parseInt(req.query.days) || 30));
    const startTime = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const rows = await allQuery(
      `SELECT timestamp, duration, event_type
       FROM connection_history
       WHERE device_id = ? AND timestamp >= ?
       ORDER BY timestamp ASC`,
      [req.params.deviceId, startTime]
    );

    const daily = {};
    const dayMs = 24 * 60 * 60 * 1000;

    for (const row of rows) {
      const ts = toTs(row.timestamp);
      const date = new Date(ts);
      date.setHours(0, 0, 0, 0);
      const dayKey = date.getTime();

      const duration = row.duration || 0;
      if (!daily[dayKey]) daily[dayKey] = 0;

      if (row.event_type === 'disconnect' || duration > 0) {
        daily[dayKey] += duration;
      } else if (row.event_type === 'connect') {
        daily[dayKey] += 60;
      }
    }

    const stats = [];
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    for (let i = days - 1; i >= 0; i--) {
      const dayKey = todayStart.getTime() - i * dayMs;
      const dateStr = new Date(dayKey).toISOString().split('T')[0];
      stats.push({
        date: dateStr,
        timestamp: dayKey,
        online_seconds: Math.round(daily[dayKey] || 0)
      });
    }

    const totalSeconds = stats.reduce((sum, d) => sum + d.online_seconds, 0);
    const avgSeconds = days > 0 ? Math.round(totalSeconds / days) : 0;

    res.json(buildResponse(true, {
      device_id: req.params.deviceId,
      days,
      stats,
      summary: {
        total_seconds: totalSeconds,
        avg_seconds: avgSeconds,
        online_days: stats.filter(s => s.online_seconds > 0).length
      }
    }, '获取每日在线时长成功'));
  } catch (err) {
    res.status(500).json(buildResponse(false, null, '获取每日在线时长失败', err.message));
  }
});

router.get('/devices', async (req, res) => {
  try {
    const connectEvents = await allQuery(
      `SELECT ch.device_id, ch.mac, ch.timestamp, ch.duration, ch.ip, ch.event_type
       FROM connection_history ch
       ORDER BY ch.timestamp ASC`
    );

    const agg = {};
    for (const ev of connectEvents) {
      const key = ev.device_id || ev.mac;
      if (!key) continue;
      if (!agg[key]) {
        agg[key] = {
          device_id: ev.device_id,
          mac: ev.mac,
          ip: ev.ip,
          first_seen: ev.timestamp,
          last_seen: ev.timestamp,
          connect_count: 0,
          total_duration: 0
        };
      }
      agg[key].last_seen = ev.timestamp;
      if (ev.timestamp < agg[key].first_seen) agg[key].first_seen = ev.timestamp;
      if (ev.event_type === 'connect') agg[key].connect_count++;
      agg[key].total_duration += ev.duration || 0;
    }

    const deviceIds = Object.values(agg).map(a => a.device_id).filter(Boolean);
    const devices = deviceIds.length
      ? await allQuery(
          `SELECT id, custom_name, mac, ip, hostname, device_type, is_online, group_name FROM devices WHERE id IN (${deviceIds.map(() => '?').join(',')})`,
          deviceIds
        )
      : [];
    const devMap = {};
    for (const d of devices) devMap[d.id] = d;

    const rows = Object.values(agg).map(a => {
      const d = devMap[a.device_id] || {};
      return {
        id: a.device_id,
        custom_name: d.custom_name,
        mac_address: a.mac || d.mac,
        ip_address: a.ip || d.ip,
        hostname: d.hostname,
        device_type: d.device_type,
        online: !!d.is_online,
        group_name: d.group_name,
        first_seen: a.first_seen,
        first_seen_ts: toTs(a.first_seen),
        last_seen: a.last_seen,
        last_seen_ts: toTs(a.last_seen),
        connect_count: a.connect_count,
        total_duration: a.total_duration
      };
    });

    rows.sort((a, b) => (b.last_seen_ts || 0) - (a.last_seen_ts || 0));

    res.json(buildResponse(true, rows, '获取历史设备列表成功'));
  } catch (err) {
    res.status(500).json(buildResponse(false, null, '获取历史设备列表失败', err.message));
  }
});

module.exports = router;
