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

const getPagination = (query) => {
  const page = Math.max(1, parseInt(query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(query.pageSize) || 20));
  return { page, pageSize, offset: (page - 1) * pageSize };
};

const parseAlert = (a) => {
  if (!a) return a;
  let details = a.data_json;
  if (details) {
    try { details = JSON.parse(details); } catch (e) {}
  }
  return {
    ...a,
    details,
    is_read: !!a.read,
    mac_address: a.mac,
    device_name: a.custom_name,
    created_at: a.timestamp,
    created_ts: a.timestamp ? new Date(a.timestamp).getTime() : null
  };
};

router.get('/', async (req, res) => {
  try {
    const { page, pageSize, offset } = getPagination(req.query);
    const { type, level, read } = req.query;

    const where = [];
    const params = [];

    if (type) {
      where.push('a.type = ?');
      params.push(type);
    }
    if (level) {
      where.push('a.level = ?');
      params.push(level);
    }
    if (read !== undefined) {
      where.push('a.read = ?');
      params.push(read === 'true' || read === '1' ? 1 : 0);
    }

    let sql = `SELECT a.*, d.custom_name, d.mac
               FROM alerts a
               LEFT JOIN devices d ON d.id = a.device_id`;
    if (where.length) sql += ' WHERE ' + where.join(' AND ');
    sql += ' ORDER BY a.timestamp DESC LIMIT ? OFFSET ?';
    params.push(pageSize, offset);

    const rows = await allQuery(sql, params);

    let countSql = `SELECT COUNT(*) as total FROM alerts a
                    LEFT JOIN devices d ON d.id = a.device_id`;
    if (where.length) countSql += ' WHERE ' + where.join(' AND ');
    const { total } = await getQuery(countSql, params.slice(0, params.length - 2));

    const unreadCount = await getQuery('SELECT COUNT(*) as count FROM alerts WHERE read = 0');

    res.json(buildResponse(true, {
      list: rows.map(parseAlert),
      page,
      pageSize,
      total,
      unread_count: unreadCount.count
    }, '获取告警列表成功'));
  } catch (err) {
    res.status(500).json(buildResponse(false, null, '获取告警列表失败', err.message));
  }
});

router.get('/unread-count', async (req, res) => {
  try {
    const total = await getQuery('SELECT COUNT(*) as count FROM alerts WHERE read = 0');
    const byLevel = await allQuery(
      'SELECT level, COUNT(*) as count FROM alerts WHERE read = 0 GROUP BY level'
    );
    const byType = await allQuery(
      'SELECT type, COUNT(*) as count FROM alerts WHERE read = 0 GROUP BY type'
    );

    res.json(buildResponse(true, {
      total: total.count,
      by_level: byLevel.reduce((m, r) => ({ ...m, [r.level]: r.count }), {}),
      by_type: byType.reduce((m, r) => ({ ...m, [r.type]: r.count }), {})
    }, '获取未读数量成功'));
  } catch (err) {
    res.status(500).json(buildResponse(false, null, '获取未读数量失败', err.message));
  }
});

router.put('/read-all', async (req, res) => {
  try {
    const result = await runQuery('UPDATE alerts SET read = 1 WHERE read = 0');

    broadcast('alerts:all_read', { count: result.changes || 0 });
    res.json(buildResponse(true, {
      marked_count: result.changes || 0
    }, `已将 ${result.changes || 0} 条告警标记为已读`));
  } catch (err) {
    res.status(500).json(buildResponse(false, null, '批量标记已读失败', err.message));
  }
});

router.get('/:id', async (req, res) => {
  try {
    const row = await getQuery(
      `SELECT a.*, d.custom_name, d.mac
       FROM alerts a
       LEFT JOIN devices d ON d.id = a.device_id
       WHERE a.id = ?`,
      [req.params.id]
    );

    if (!row) {
      return res.status(404).json(buildResponse(false, null, '告警不存在', 'NOT_FOUND'));
    }

    res.json(buildResponse(true, parseAlert(row), '获取告警详情成功'));
  } catch (err) {
    res.status(500).json(buildResponse(false, null, '获取告警详情失败', err.message));
  }
});

router.put('/:id/read', async (req, res) => {
  try {
    const alert = await getQuery('SELECT * FROM alerts WHERE id = ?', [req.params.id]);
    if (!alert) {
      return res.status(404).json(buildResponse(false, null, '告警不存在', 'NOT_FOUND'));
    }

    await runQuery('UPDATE alerts SET read = 1 WHERE id = ?', [req.params.id]);

    const updated = await getQuery(
      `SELECT a.*, d.custom_name, d.mac
       FROM alerts a
       LEFT JOIN devices d ON d.id = a.device_id
       WHERE a.id = ?`,
      [req.params.id]
    );

    broadcast('alert:read', { id: req.params.id });
    res.json(buildResponse(true, parseAlert(updated), '告警已标记为已读'));
  } catch (err) {
    res.status(500).json(buildResponse(false, null, '标记已读失败', err.message));
  }
});

router.post('/test-notification', async (req, res) => {
  try {
    const { channel = 'all', message, level = 'info' } = req.body;
    const testMessage = message || `[测试通知] 这是一条来自 ${level} 级别的测试告警通知 - ${new Date().toLocaleString()}`;
    const nowIso = new Date().toISOString();

    const result = await runQuery(
      `INSERT INTO alerts (type, level, title, message, device_id, mac, data_json, read, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        'test',
        level,
        '测试通知',
        testMessage,
        null,
        null,
        JSON.stringify({ channel, test: true, timestamp: Date.now() }),
        0,
        nowIso
      ]
    );

    const alert = await getQuery(
      `SELECT a.*, d.custom_name, d.mac
       FROM alerts a
       LEFT JOIN devices d ON d.id = a.device_id
       WHERE a.id = ?`,
      [result.id]
    );

    const parsed = parseAlert(alert);

    broadcast('alert:new', parsed);
    broadcast('notification', {
      id: result.id,
      type: 'test',
      level,
      title: '测试通知',
      message: testMessage,
      channel,
      timestamp: nowIso
    });

    res.json(buildResponse(true, {
      alert: parsed,
      sent_via: {
        websocket: true,
        channel
      }
    }, '测试通知已发送'));
  } catch (err) {
    res.status(500).json(buildResponse(false, null, '发送测试通知失败', err.message));
  }
});

module.exports = router;
