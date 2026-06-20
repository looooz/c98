const express = require('express');
const router = express.Router();
const { runQuery, getQuery, allQuery } = require('../database');

const buildResponse = (success, data = null, message = '', error = '') => {
  const resp = { success, message };
  if (success) resp.data = data;
  else resp.error = error;
  return resp;
};

const toTs = (isoStr) => isoStr ? new Date(isoStr).getTime() : null;

router.get('/overview', async (req, res) => {
  try {
    const now = Date.now();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayIso = todayStart.toISOString();

    const deviceCount = await getQuery('SELECT COUNT(*) as total, SUM(is_online) as online FROM devices');
    const trafficToday = await getQuery(
      `SELECT
         COALESCE(SUM(upload_bytes), 0) as upload,
         COALESCE(SUM(download_bytes), 0) as download
       FROM traffic_records
       WHERE timestamp >= ?`,
      [todayIso]
    );
    const alertCount = await getQuery(
      `SELECT COUNT(*) as total, SUM(CASE WHEN read = 0 THEN 1 ELSE 0 END) as unread
       FROM alerts
       WHERE timestamp >= ?`,
      [todayIso]
    );
    const newToday = await getQuery(
      `SELECT COUNT(*) as count FROM devices WHERE first_seen >= ?`,
      [todayIso]
    );
    const activeDevices = await getQuery(
      `SELECT COUNT(DISTINCT device_id) as count FROM traffic_records WHERE timestamp >= ?`,
      [todayIso]
    );

    res.json(buildResponse(true, {
      timestamp: now,
      devices: {
        total: deviceCount.total,
        online: deviceCount.online || 0,
        offline: deviceCount.total - (deviceCount.online || 0),
        new_today: newToday.count,
        active_today: activeDevices.count
      },
      traffic_today: {
        upload: trafficToday.upload,
        download: trafficToday.download,
        total: trafficToday.upload + trafficToday.download
      },
      alerts: {
        today: alertCount.total,
        unread: alertCount.unread || 0
      }
    }, '获取总览数据成功'));
  } catch (err) {
    res.status(500).json(buildResponse(false, null, '获取总览数据失败', err.message));
  }
});

router.get('/devices/by-type', async (req, res) => {
  try {
    const rows = await allQuery(
      `SELECT device_type as name, COUNT(*) as value, SUM(is_online) as online
       FROM devices
       GROUP BY device_type
       ORDER BY value DESC`
    );

    const colors = [
      '#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de',
      '#3ba272', '#fc8452', '#9a60b4', '#ea7ccc', '#48b8c2'
    ];
    const data = rows.map((r, i) => ({
      name: r.name || 'unknown',
      value: r.value,
      online: r.online || 0,
      itemStyle: { color: colors[i % colors.length] }
    }));

    res.json(buildResponse(true, {
      total: rows.reduce((s, r) => s + r.value, 0),
      data
    }, '获取设备类型统计成功'));
  } catch (err) {
    res.status(500).json(buildResponse(false, null, '获取设备类型统计失败', err.message));
  }
});

router.get('/devices/by-group', async (req, res) => {
  try {
    const rows = await allQuery(
      `SELECT group_name as name, COUNT(*) as total, SUM(is_online) as online,
              SUM(CASE WHEN ignored = 1 THEN 1 ELSE 0 END) as ignored
       FROM devices
       GROUP BY group_name
       ORDER BY total DESC`
    );

    res.json(buildResponse(true, rows, '获取分组统计成功'));
  } catch (err) {
    res.status(500).json(buildResponse(false, null, '获取分组统计失败', err.message));
  }
});

router.get('/devices/online-trend', async (req, res) => {
  try {
    const days = 30;
    const dayMs = 24 * 60 * 60 * 1000;
    const result = [];
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const startIso = new Date(now.getTime() - days * dayMs).toISOString();

    const history = await allQuery(
      `SELECT timestamp, duration, event_type, device_id
       FROM connection_history
       WHERE timestamp >= ?
       ORDER BY timestamp ASC`,
      [startIso]
    );

    for (let i = days - 1; i >= 0; i--) {
      const dayStart = now.getTime() - i * dayMs;
      const dayEnd = dayStart + dayMs;
      const dateStr = new Date(dayStart).toISOString().split('T')[0];

      const deviceMinutes = new Map();
      for (const h of history) {
        const ts = toTs(h.timestamp);
        if (ts < dayStart || ts >= dayEnd) continue;
        const minutes = Math.max(1, (h.duration || 60) / 60);
        deviceMinutes.set(h.device_id, (deviceMinutes.get(h.device_id) || 0) + minutes);
      }

      const onlineDevices = deviceMinutes.size;
      const avgMinutes = onlineDevices > 0
        ? [...deviceMinutes.values()].reduce((a, b) => a + b, 0) / onlineDevices
        : 0;

      result.push({
        date: dateStr,
        timestamp: dayStart,
        online_count: onlineDevices,
        peak: onlineDevices,
        avg_minutes: Math.round(avgMinutes)
      });
    }

    res.json(buildResponse(true, {
      days,
      trend: result,
      summary: {
        avg_online: Math.round(result.reduce((s, d) => s + d.online_count, 0) / days),
        max_online: Math.max(...result.map(d => d.online_count)),
        min_online: Math.min(...result.map(d => d.online_count))
      }
    }, '获取在线峰值趋势成功'));
  } catch (err) {
    res.status(500).json(buildResponse(false, null, '获取在线峰值趋势失败', err.message));
  }
});

router.get('/devices/new-trend', async (req, res) => {
  try {
    const days = 30;
    const dayMs = 24 * 60 * 60 * 1000;
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const startTime = now.getTime() - days * dayMs;
    const startIso = new Date(startTime).toISOString();

    const rows = await allQuery(
      `SELECT first_seen FROM devices WHERE first_seen >= ? ORDER BY first_seen ASC`,
      [startIso]
    );

    const daily = {};
    for (let i = days - 1; i >= 0; i--) {
      const dayKey = now.getTime() - i * dayMs;
      daily[dayKey] = 0;
    }

    for (const row of rows) {
      const ts = toTs(row.first_seen);
      if (!ts) continue;
      const date = new Date(ts);
      date.setHours(0, 0, 0, 0);
      const key = date.getTime();
      if (daily[key] !== undefined) daily[key]++;
    }

    const newThisPeriod = Object.values(daily).reduce((s, v) => s + v, 0);
    const totalCumulative = await getQuery('SELECT COUNT(*) as count FROM devices');

    const trend = [];
    let runningTotal = Math.max(0, totalCumulative.count - newThisPeriod);
    for (const [ts, count] of Object.entries(daily)) {
      runningTotal += count;
      trend.push({
        date: new Date(parseInt(ts)).toISOString().split('T')[0],
        timestamp: parseInt(ts),
        new_count: count,
        cumulative: runningTotal
      });
    }

    res.json(buildResponse(true, {
      days,
      trend,
      summary: {
        new_period: newThisPeriod,
        total_cumulative: totalCumulative.count
      }
    }, '获取新增设备趋势成功'));
  } catch (err) {
    res.status(500).json(buildResponse(false, null, '获取新增设备趋势失败', err.message));
  }
});

router.get('/traffic/top', async (req, res) => {
  try {
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
    const period = req.query.period || 'today';

    const now = new Date();
    let startTime;
    switch (period) {
      case 'today':
        startTime = new Date(now);
        startTime.setHours(0, 0, 0, 0);
        break;
      case 'week':
        startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startTime = new Date(now);
        startTime.setHours(0, 0, 0, 0);
    }
    const startIso = startTime.toISOString();

    const rows = await allQuery(
      `SELECT
         tr.device_id,
         d.custom_name,
         d.mac,
         d.ip,
         d.icon,
         COALESCE(SUM(tr.upload_bytes), 0) as upload,
         COALESCE(SUM(tr.download_bytes), 0) as download,
         COALESCE(SUM(tr.upload_bytes + tr.download_bytes), 0) as total
       FROM traffic_records tr
       LEFT JOIN devices d ON d.id = tr.device_id
       WHERE tr.timestamp >= ?
       GROUP BY tr.device_id
       ORDER BY total DESC
       LIMIT ?`,
      [startIso, limit]
    );

    const totalTraffic = rows.reduce((s, r) => s + r.total, 0);
    const result = rows.map(r => ({
      ...r,
      mac_address: r.mac,
      ip_address: r.ip,
      percentage: totalTraffic > 0 ? parseFloat(((r.total / totalTraffic) * 100).toFixed(2)) : 0
    }));

    res.json(buildResponse(true, {
      period,
      limit,
      total: totalTraffic,
      list: result
    }, '获取流量Top成功'));
  } catch (err) {
    res.status(500).json(buildResponse(false, null, '获取流量Top失败', err.message));
  }
});

router.get('/export/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const now = Date.now();
    const nowIso = new Date(now).toISOString();
    let data = null;
    let filename = '';

    switch (type) {
      case 'devices': {
        const rows = await allQuery('SELECT * FROM devices ORDER BY first_seen DESC');
        data = rows.map(r => ({
          ...r,
          ip_address: r.ip,
          mac_address: r.mac,
          online: !!r.is_online
        }));
        filename = `devices_${now}.json`;
        break;
      }
      case 'traffic': {
        const daysIso = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();
        const rows = await allQuery(
          `SELECT tr.*, d.custom_name, d.mac
           FROM traffic_records tr
           LEFT JOIN devices d ON d.id = tr.device_id
           WHERE tr.timestamp >= ?
           ORDER BY tr.timestamp DESC`,
          [daysIso]
        );
        data = rows.map(r => ({ ...r, mac_address: r.mac }));
        filename = `traffic_${now}.json`;
        break;
      }
      case 'history': {
        const daysIso = new Date(now - 90 * 24 * 60 * 60 * 1000).toISOString();
        const rows = await allQuery(
          `SELECT ch.*, d.custom_name, d.mac
           FROM connection_history ch
           LEFT JOIN devices d ON d.id = ch.device_id
           WHERE ch.timestamp >= ?
           ORDER BY ch.timestamp DESC`,
          [daysIso]
        );
        data = rows.map(r => ({ ...r, mac_address: r.mac }));
        filename = `connection_history_${now}.json`;
        break;
      }
      case 'monthly': {
        const monthStart = new Date();
        monthStart.setDate(1);
        monthStart.setHours(0, 0, 0, 0);
        const monthIso = monthStart.toISOString();

        const devices = await getQuery('SELECT COUNT(*) as count FROM devices');
        const traffic = await getQuery(
          `SELECT COALESCE(SUM(upload_bytes),0) as upload, COALESCE(SUM(download_bytes),0) as download
           FROM traffic_records WHERE timestamp >= ?`,
          [monthIso]
        );
        const activeDevices = await getQuery(
          `SELECT COUNT(DISTINCT device_id) as count FROM traffic_records WHERE timestamp >= ?`,
          [monthIso]
        );
        const alerts = await getQuery(
          `SELECT COUNT(*) as count FROM alerts WHERE timestamp >= ?`,
          [monthIso]
        );
        const newDevices = await getQuery(
          `SELECT COUNT(*) as count FROM devices WHERE first_seen >= ?`,
          [monthIso]
        );

        data = {
          month: monthStart.toISOString().slice(0, 7),
          generated_at: now,
          summary: {
            total_devices: devices.count,
            new_devices: newDevices.count,
            active_devices: activeDevices.count,
            traffic_upload: traffic.upload,
            traffic_download: traffic.download,
            traffic_total: traffic.upload + traffic.download,
            alerts_count: alerts.count
          }
        };
        filename = `monthly_report_${monthStart.toISOString().slice(0, 7)}_${now}.json`;
        break;
      }
      default:
        return res.status(400).json(buildResponse(false, null, '不支持的导出类型', 'INVALID_TYPE'));
    }

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/json');
    res.json(buildResponse(true, data, `导出${type}报表成功`));
  } catch (err) {
    res.status(500).json(buildResponse(false, null, '导出报表失败', err.message));
  }
});

router.get('/monthly-report', async (req, res) => {
  try {
    const now = new Date();
    const month = req.query.month ? new Date(req.query.month + '-01') : new Date(now.getFullYear(), now.getMonth(), 1);
    const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
    const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0, 23, 59, 59, 999);
    const startIso = monthStart.toISOString();
    const endIso = monthEnd.toISOString();

    const totalDevices = await getQuery('SELECT COUNT(*) as count FROM devices WHERE first_seen <= ?', [endIso]);
    const newDevices = await getQuery(
      'SELECT COUNT(*) as count FROM devices WHERE first_seen >= ? AND first_seen <= ?',
      [startIso, endIso]
    );
    const onlineNow = await getQuery('SELECT SUM(is_online) as count FROM devices');
    const traffic = await getQuery(
      `SELECT COALESCE(SUM(upload_bytes),0) as upload, COALESCE(SUM(download_bytes),0) as download
       FROM traffic_records WHERE timestamp >= ? AND timestamp <= ?`,
      [startIso, endIso]
    );
    const activeDevices = await getQuery(
      `SELECT COUNT(DISTINCT device_id) as count FROM traffic_records WHERE timestamp >= ? AND timestamp <= ?`,
      [startIso, endIso]
    );
    const alerts = await allQuery(
      `SELECT level, COUNT(*) as count FROM alerts WHERE timestamp >= ? AND timestamp <= ? GROUP BY level`,
      [startIso, endIso]
    );
    const topDevices = await allQuery(
      `SELECT tr.device_id, d.custom_name, d.mac,
              COALESCE(SUM(tr.upload_bytes+tr.download_bytes),0) as total
       FROM traffic_records tr
       LEFT JOIN devices d ON d.id = tr.device_id
       WHERE tr.timestamp >= ? AND tr.timestamp <= ?
       GROUP BY tr.device_id
       ORDER BY total DESC
       LIMIT 5`,
      [startIso, endIso]
    );

    const daysInMonth = monthEnd.getDate();
    const dailyTraffic = [];
    for (let i = 1; i <= daysInMonth; i++) {
      const dayStart = new Date(month.getFullYear(), month.getMonth(), i);
      const dayEndIso = new Date(month.getFullYear(), month.getMonth(), i, 23, 59, 59, 999).toISOString();
      const dayStartIso = dayStart.toISOString();
      const t = await getQuery(
        `SELECT COALESCE(SUM(upload_bytes),0) as upload, COALESCE(SUM(download_bytes),0) as download
         FROM traffic_records WHERE timestamp >= ? AND timestamp <= ?`,
        [dayStartIso, dayEndIso]
      );
      dailyTraffic.push({
        day: i,
        date: dayStart.toISOString().split('T')[0],
        upload: t.upload,
        download: t.download,
        total: t.upload + t.download
      });
    }

    res.json(buildResponse(true, {
      month: `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`,
      generated_at: now.getTime(),
      summary: {
        total_devices: totalDevices.count,
        new_devices: newDevices.count,
        online_now: onlineNow.count || 0,
        active_devices: activeDevices.count,
        traffic: {
          upload: traffic.upload,
          download: traffic.download,
          total: traffic.upload + traffic.download
        },
        alerts_by_level: alerts.reduce((m, a) => ({ ...m, [a.level]: a.count }), {})
      },
      top_devices: topDevices.map(d => ({ ...d, mac_address: d.mac })),
      daily_traffic: dailyTraffic
    }, '获取月度报告成功'));
  } catch (err) {
    res.status(500).json(buildResponse(false, null, '获取月度报告失败', err.message));
  }
});

module.exports = router;
