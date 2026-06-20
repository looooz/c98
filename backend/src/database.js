const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const DB_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DB_DIR, 'network_manager.db');

if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

let db = null;

function getDatabase() {
  if (!db) {
    throw new Error('Database not initialized');
  }
  return db;
}

function openDatabase() {
  return new Promise((resolve, reject) => {
    db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        return reject(err);
      }
      resolve(db);
    });
  });
}

function runQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    const database = getDatabase();
    database.run(sql, params, function (err) {
      if (err) {
        return reject(err);
      }
      resolve({
        id: this.lastID,
        changes: this.changes
      });
    });
  });
}

function getQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    const database = getDatabase();
    database.get(sql, params, (err, row) => {
      if (err) {
        return reject(err);
      }
      resolve(row || null);
    });
  });
}

function allQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    const database = getDatabase();
    database.all(sql, params, (err, rows) => {
      if (err) {
        return reject(err);
      }
      resolve(rows || []);
    });
  });
}

function execQuery(sql) {
  return new Promise((resolve, reject) => {
    const database = getDatabase();
    database.exec(sql, (err) => {
      if (err) {
        return reject(err);
      }
      resolve();
    });
  });
}

function beginTransaction() {
  return runQuery('BEGIN TRANSACTION');
}

function commitTransaction() {
  return runQuery('COMMIT');
}

function rollbackTransaction() {
  return runQuery('ROLLBACK');
}

const CREATE_TABLES_SQL = `
  CREATE TABLE IF NOT EXISTS devices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ip TEXT,
    mac TEXT UNIQUE,
    hostname TEXT,
    device_type TEXT DEFAULT 'unknown',
    vendor TEXT,
    icon TEXT,
    group_name TEXT,
    notes TEXT,
    custom_name TEXT,
    is_online INTEGER DEFAULT 0,
    first_seen TEXT,
    last_seen TEXT,
    signal_strength INTEGER,
    os_info TEXT,
    ignored INTEGER DEFAULT 0,
    merged_to INTEGER,
    rssi INTEGER
  );

  CREATE TABLE IF NOT EXISTS connection_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id INTEGER,
    mac TEXT,
    event_type TEXT,
    timestamp TEXT,
    duration INTEGER,
    ip TEXT,
    FOREIGN KEY (device_id) REFERENCES devices(id)
  );

  CREATE INDEX IF NOT EXISTS idx_connection_history_device ON connection_history(device_id);
  CREATE INDEX IF NOT EXISTS idx_connection_history_mac ON connection_history(mac);
  CREATE INDEX IF NOT EXISTS idx_connection_history_timestamp ON connection_history(timestamp);

  CREATE TABLE IF NOT EXISTS traffic_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id INTEGER,
    mac TEXT,
    timestamp TEXT,
    upload_bytes INTEGER DEFAULT 0,
    download_bytes INTEGER DEFAULT 0,
    upload_speed REAL DEFAULT 0,
    download_speed REAL DEFAULT 0,
    FOREIGN KEY (device_id) REFERENCES devices(id)
  );

  CREATE INDEX IF NOT EXISTS idx_traffic_records_device ON traffic_records(device_id);
  CREATE INDEX IF NOT EXISTS idx_traffic_records_mac ON traffic_records(mac);
  CREATE INDEX IF NOT EXISTS idx_traffic_records_timestamp ON traffic_records(timestamp);

  CREATE TABLE IF NOT EXISTS traffic_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id INTEGER,
    mac TEXT,
    date TEXT,
    period_type TEXT,
    total_upload INTEGER DEFAULT 0,
    total_download INTEGER DEFAULT 0,
    peak_upload_speed REAL DEFAULT 0,
    peak_download_speed REAL DEFAULT 0,
    FOREIGN KEY (device_id) REFERENCES devices(id),
    UNIQUE(device_id, period_type, date)
  );

  CREATE INDEX IF NOT EXISTS idx_traffic_stats_device ON traffic_stats(device_id);
  CREATE INDEX IF NOT EXISTS idx_traffic_stats_mac ON traffic_stats(mac);
  CREATE INDEX IF NOT EXISTS idx_traffic_stats_date ON traffic_stats(date);

  CREATE TABLE IF NOT EXISTS parental_rules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id INTEGER,
    mac TEXT,
    rule_type TEXT,
    enabled INTEGER DEFAULT 1,
    schedule_json TEXT,
    blocked_websites TEXT,
    keywords TEXT,
    is_blocked INTEGER DEFAULT 0,
    FOREIGN KEY (device_id) REFERENCES devices(id)
  );

  CREATE INDEX IF NOT EXISTS idx_parental_rules_device ON parental_rules(device_id);
  CREATE INDEX IF NOT EXISTS idx_parental_rules_mac ON parental_rules(mac);

  CREATE TABLE IF NOT EXISTS scheduled_tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    rule_id INTEGER,
    device_id INTEGER,
    cron_expr TEXT,
    action TEXT,
    next_run TEXT,
    enabled INTEGER DEFAULT 1,
    FOREIGN KEY (rule_id) REFERENCES parental_rules(id),
    FOREIGN KEY (device_id) REFERENCES devices(id)
  );

  CREATE INDEX IF NOT EXISTS idx_scheduled_tasks_rule ON scheduled_tasks(rule_id);
  CREATE INDEX IF NOT EXISTS idx_scheduled_tasks_device ON scheduled_tasks(device_id);
  CREATE INDEX IF NOT EXISTS idx_scheduled_tasks_next_run ON scheduled_tasks(next_run);

  CREATE TABLE IF NOT EXISTS alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT,
    level TEXT,
    title TEXT,
    message TEXT,
    device_id INTEGER,
    mac TEXT,
    data_json TEXT,
    read INTEGER DEFAULT 0,
    timestamp TEXT,
    FOREIGN KEY (device_id) REFERENCES devices(id)
  );

  CREATE INDEX IF NOT EXISTS idx_alerts_device ON alerts(device_id);
  CREATE INDEX IF NOT EXISTS idx_alerts_mac ON alerts(mac);
  CREATE INDEX IF NOT EXISTS idx_alerts_read ON alerts(read);
  CREATE INDEX IF NOT EXISTS idx_alerts_timestamp ON alerts(timestamp);

  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    alert_id INTEGER,
    channel TEXT,
    status TEXT,
    sent_at TEXT,
    FOREIGN KEY (alert_id) REFERENCES alerts(id)
  );

  CREATE INDEX IF NOT EXISTS idx_notifications_alert ON notifications(alert_id);
  CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);

  CREATE TABLE IF NOT EXISTS scan_configs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    scan_type TEXT,
    ip_range TEXT,
    schedule TEXT,
    auto_scan INTEGER DEFAULT 1,
    hourly TEXT,
    daily TEXT,
    last_run TEXT
  );

  CREATE TABLE IF NOT EXISTS system_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT UNIQUE,
    value TEXT,
    updated_at TEXT
  );
`;

const DEFAULT_SETTINGS = [
  { key: 'network_name', value: '我的家庭网络' },
  { key: 'auto_scan', value: 'true' },
  { key: 'scan_interval', value: '300' },
  { key: 'alert_new_device', value: 'true' },
  { key: 'alert_offline_device', value: 'true' },
  { key: 'traffic_retention_days', value: '30' },
  { key: 'notification_email', value: '' },
  { key: 'notification_webhook', value: '' },
  { key: 'theme', value: 'light' },
  { key: 'language', value: 'zh-CN' }
];

async function initializeDatabase() {
  await openDatabase();
  await execQuery(CREATE_TABLES_SQL);

  const existingSettings = await allQuery('SELECT key FROM system_settings');
  const existingKeys = new Set(existingSettings.map(s => s.key));

  for (const setting of DEFAULT_SETTINGS) {
    if (!existingKeys.has(setting.key)) {
      await runQuery(
        'INSERT INTO system_settings (key, value, updated_at) VALUES (?, ?, ?)',
        [setting.key, setting.value, new Date().toISOString()]
      );
    }
  }

  const scanConfigCount = await getQuery('SELECT COUNT(*) as count FROM scan_configs');
  if (scanConfigCount.count === 0) {
    await runQuery(
      'INSERT INTO scan_configs (scan_type, ip_range, schedule, auto_scan, hourly, daily, last_run) VALUES (?, ?, ?, ?, ?, ?, ?)',
      ['full', '192.168.1.1-192.168.1.254', '0 */5 * * * *', 1, '0 * * * *', '0 3 * * *', null]
    );
  }

  return db;
}

module.exports = {
  DB_PATH,
  getDatabase,
  openDatabase,
  initializeDatabase,
  runQuery,
  getQuery,
  allQuery,
  execQuery,
  beginTransaction,
  commitTransaction,
  rollbackTransaction
};
