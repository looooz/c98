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

const blockedDevices = new Map();

const isDeviceBlocked = (deviceId) => {
  const blockInfo = blockedDevices.get(deviceId);
  if (!blockInfo) return false;
  if (blockInfo.until && blockInfo.until < Date.now()) {
    blockedDevices.delete(deviceId);
    return false;
  }
  return true;
};

const parseRule = (r) => {
  if (!r) return r;
  return {
    ...r,
    mac_address: r.mac,
    device_name: r.custom_name,
    schedule: r.schedule_json ? (() => { try { return JSON.parse(r.schedule_json); } catch (e) { return r.schedule_json; } })() : null,
    blocked_websites: r.blocked_websites ? (() => { try { return JSON.parse(r.blocked_websites); } catch (e) { return r.blocked_websites; } })() : null,
    keywords: r.keywords ? (() => { try { return JSON.parse(r.keywords); } catch (e) { return r.keywords; } })() : null
  };
};

router.get('/rules', async (req, res) => {
  try {
    const rows = await allQuery(
      `SELECT pr.*, d.custom_name, d.mac
       FROM parental_rules pr
       LEFT JOIN devices d ON d.id = pr.device_id
       ORDER BY pr.id DESC`
    );
    res.json(buildResponse(true, rows.map(parseRule), '获取规则列表成功'));
  } catch (err) {
    res.status(500).json(buildResponse(false, null, '获取规则列表失败', err.message));
  }
});

router.get('/rules/:deviceId', async (req, res) => {
  try {
    const rows = await allQuery(
      `SELECT pr.*, d.custom_name, d.mac
       FROM parental_rules pr
       LEFT JOIN devices d ON d.id = pr.device_id
       WHERE pr.device_id = ?
       ORDER BY pr.id DESC`,
      [req.params.deviceId]
    );
    res.json(buildResponse(true, rows.map(parseRule), '获取设备规则成功'));
  } catch (err) {
    res.status(500).json(buildResponse(false, null, '获取设备规则失败', err.message));
  }
});

router.post('/rules', async (req, res) => {
  try {
    const { deviceId, ruleType, schedule, blockedWebsites, keywords, enabled } = req.body;

    if (!deviceId) {
      return res.status(400).json(buildResponse(false, null, '缺少设备ID', 'MISSING_DEVICE_ID'));
    }
    if (!ruleType) {
      return res.status(400).json(buildResponse(false, null, '缺少规则类型', 'MISSING_RULE_TYPE'));
    }

    const device = await getQuery('SELECT id, custom_name, mac FROM devices WHERE id = ?', [deviceId]);
    if (!device) {
      return res.status(404).json(buildResponse(false, null, '设备不存在', 'NOT_FOUND'));
    }

    const result = await runQuery(
      `INSERT INTO parental_rules (device_id, mac, rule_type, enabled, schedule_json, blocked_websites, keywords, is_blocked)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        deviceId,
        device.mac,
        ruleType,
        enabled !== undefined ? enabled ? 1 : 0 : 1,
        schedule ? JSON.stringify(schedule) : null,
        blockedWebsites ? JSON.stringify(blockedWebsites) : null,
        keywords ? JSON.stringify(keywords) : null,
        0
      ]
    );

    const rule = await getQuery(
      `SELECT pr.*, d.custom_name, d.mac
       FROM parental_rules pr
       LEFT JOIN devices d ON d.id = pr.device_id
       WHERE pr.id = ?`,
      [result.id]
    );

    const resp = parseRule(rule);
    broadcast('parental:rule_created', resp);
    res.status(201).json(buildResponse(true, resp, '规则创建成功'));
  } catch (err) {
    res.status(500).json(buildResponse(false, null, '创建规则失败', err.message));
  }
});

router.put('/rules/:id', async (req, res) => {
  try {
    const { ruleType, schedule, blockedWebsites, keywords, enabled } = req.body;
    const fields = [];
    const params = [];

    if (ruleType !== undefined) { fields.push('rule_type = ?'); params.push(ruleType); }
    if (schedule !== undefined) { fields.push('schedule_json = ?'); params.push(JSON.stringify(schedule)); }
    if (blockedWebsites !== undefined) { fields.push('blocked_websites = ?'); params.push(JSON.stringify(blockedWebsites)); }
    if (keywords !== undefined) { fields.push('keywords = ?'); params.push(JSON.stringify(keywords)); }
    if (enabled !== undefined) { fields.push('enabled = ?'); params.push(enabled ? 1 : 0); }

    if (!fields.length) {
      return res.status(400).json(buildResponse(false, null, '没有可更新的字段', 'NO_FIELDS'));
    }

    params.push(req.params.id);
    await runQuery(`UPDATE parental_rules SET ${fields.join(', ')} WHERE id = ?`, params);

    const rule = await getQuery(
      `SELECT pr.*, d.custom_name, d.mac
       FROM parental_rules pr
       LEFT JOIN devices d ON d.id = pr.device_id
       WHERE pr.id = ?`,
      [req.params.id]
    );

    if (!rule) {
      return res.status(404).json(buildResponse(false, null, '规则不存在', 'NOT_FOUND'));
    }

    const resp = parseRule(rule);
    broadcast('parental:rule_updated', resp);
    res.json(buildResponse(true, resp, '规则更新成功'));
  } catch (err) {
    res.status(500).json(buildResponse(false, null, '更新规则失败', err.message));
  }
});

router.delete('/rules/:id', async (req, res) => {
  try {
    const rule = await getQuery('SELECT * FROM parental_rules WHERE id = ?', [req.params.id]);
    if (!rule) {
      return res.status(404).json(buildResponse(false, null, '规则不存在', 'NOT_FOUND'));
    }

    await runQuery('DELETE FROM parental_rules WHERE id = ?', [req.params.id]);
    broadcast('parental:rule_deleted', { id: req.params.id, device_id: rule.device_id });
    res.json(buildResponse(true, null, '规则删除成功'));
  } catch (err) {
    res.status(500).json(buildResponse(false, null, '删除规则失败', err.message));
  }
});

router.post('/rules/:id/toggle', async (req, res) => {
  try {
    const rule = await getQuery('SELECT * FROM parental_rules WHERE id = ?', [req.params.id]);
    if (!rule) {
      return res.status(404).json(buildResponse(false, null, '规则不存在', 'NOT_FOUND'));
    }

    const newEnabled = rule.enabled ? 0 : 1;
    await runQuery('UPDATE parental_rules SET enabled = ? WHERE id = ?', [newEnabled, req.params.id]);

    const updated = await getQuery(
      `SELECT pr.*, d.custom_name, d.mac
       FROM parental_rules pr
       LEFT JOIN devices d ON d.id = pr.device_id
       WHERE pr.id = ?`,
      [req.params.id]
    );

    const resp = parseRule(updated);
    broadcast('parental:rule_toggled', resp);
    res.json(buildResponse(true, resp, `规则已${newEnabled ? '启用' : '禁用'}`));
  } catch (err) {
    res.status(500).json(buildResponse(false, null, '切换规则状态失败', err.message));
  }
});

router.post('/devices/:deviceId/block', async (req, res) => {
  try {
    const { duration } = req.body;
    const device = await getQuery('SELECT id, custom_name, mac FROM devices WHERE id = ?', [req.params.deviceId]);
    if (!device) {
      return res.status(404).json(buildResponse(false, null, '设备不存在', 'NOT_FOUND'));
    }

    const blockInfo = {
      device_id: req.params.deviceId,
      blocked_at: Date.now(),
      until: duration ? Date.now() + duration * 60 * 1000 : null,
      duration_minutes: duration || null
    };
    blockedDevices.set(req.params.deviceId, blockInfo);

    await runQuery(
      'UPDATE parental_rules SET is_blocked = 1 WHERE device_id = ? AND rule_type = ?',
      [req.params.deviceId, 'internet']
    );

    const broadcastData = {
      id: device.id,
      custom_name: device.custom_name,
      mac_address: device.mac,
      ...blockInfo,
      blocked: true
    };
    broadcast('parental:device_blocked', broadcastData);
    res.json(buildResponse(true, broadcastData, duration ? `设备已断网 ${duration} 分钟` : '设备已立即断网'));
  } catch (err) {
    res.status(500).json(buildResponse(false, null, '断网操作失败', err.message));
  }
});

router.post('/devices/:deviceId/unblock', async (req, res) => {
  try {
    const device = await getQuery('SELECT id, custom_name, mac FROM devices WHERE id = ?', [req.params.deviceId]);
    if (!device) {
      return res.status(404).json(buildResponse(false, null, '设备不存在', 'NOT_FOUND'));
    }

    blockedDevices.delete(req.params.deviceId);

    await runQuery(
      'UPDATE parental_rules SET is_blocked = 0 WHERE device_id = ? AND rule_type = ?',
      [req.params.deviceId, 'internet']
    );

    const broadcastData = {
      id: device.id,
      custom_name: device.custom_name,
      mac_address: device.mac,
      unblocked: true,
      unblocked_at: Date.now()
    };
    broadcast('parental:device_unblocked', broadcastData);
    res.json(buildResponse(true, broadcastData, '设备网络已恢复'));
  } catch (err) {
    res.status(500).json(buildResponse(false, null, '恢复网络失败', err.message));
  }
});

router.get('/schedules', async (req, res) => {
  try {
    const rows = await allQuery(
      `SELECT st.*, d.custom_name, d.mac
       FROM scheduled_tasks st
       LEFT JOIN devices d ON d.id = st.device_id
       ORDER BY st.id DESC`
    );
    const result = rows.map(r => ({
      ...r,
      mac_address: r.mac,
      device_name: r.custom_name,
      cron_expression: r.cron_expr
    }));
    res.json(buildResponse(true, result, '获取定时任务成功'));
  } catch (err) {
    res.status(500).json(buildResponse(false, null, '获取定时任务失败', err.message));
  }
});

router.post('/schedules', async (req, res) => {
  try {
    const { deviceId, ruleId, name, action, cronExpr, nextRun, enabled } = req.body;

    if (!deviceId || !action || !cronExpr) {
      return res.status(400).json(buildResponse(false, null, '参数缺失', 'MISSING_PARAMS'));
    }

    const device = await getQuery('SELECT id FROM devices WHERE id = ?', [deviceId]);
    if (!device) {
      return res.status(404).json(buildResponse(false, null, '设备不存在', 'NOT_FOUND'));
    }

    const result = await runQuery(
      `INSERT INTO scheduled_tasks (rule_id, device_id, cron_expr, action, next_run, enabled)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        ruleId || null,
        deviceId,
        cronExpr,
        action,
        nextRun || null,
        enabled !== undefined ? enabled ? 1 : 0 : 1
      ]
    );

    const schedule = await getQuery(
      `SELECT st.*, d.custom_name, d.mac
       FROM scheduled_tasks st
       LEFT JOIN devices d ON d.id = st.device_id
       WHERE st.id = ?`,
      [result.id]
    );

    const resp = {
      ...schedule,
      mac_address: schedule.mac,
      device_name: schedule.custom_name,
      cron_expression: schedule.cron_expr
    };

    broadcast('parental:schedule_created', resp);
    res.status(201).json(buildResponse(true, resp, '定时任务创建成功'));
  } catch (err) {
    res.status(500).json(buildResponse(false, null, '创建定时任务失败', err.message));
  }
});

router.delete('/schedules/:id', async (req, res) => {
  try {
    const schedule = await getQuery('SELECT * FROM scheduled_tasks WHERE id = ?', [req.params.id]);
    if (!schedule) {
      return res.status(404).json(buildResponse(false, null, '定时任务不存在', 'NOT_FOUND'));
    }

    await runQuery('DELETE FROM scheduled_tasks WHERE id = ?', [req.params.id]);
    broadcast('parental:schedule_deleted', { id: req.params.id, device_id: schedule.device_id });
    res.json(buildResponse(true, null, '定时任务删除成功'));
  } catch (err) {
    res.status(500).json(buildResponse(false, null, '删除定时任务失败', err.message));
  }
});

module.exports = router;
