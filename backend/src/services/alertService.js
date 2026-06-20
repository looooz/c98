const { v4: uuidv4 } = require('uuid');

const ALERT_TYPES = {
  NEW_DEVICE: 'NEW_DEVICE',
  UNKNOWN_DEVICE: 'UNKNOWN_DEVICE',
  DEVICE_OFFLINE: 'DEVICE_OFFLINE',
  DEVICE_ONLINE: 'DEVICE_ONLINE',
  TRAFFIC_SPIKE: 'TRAFFIC_SPIKE',
  PARENTAL_BLOCKED: 'PARENTAL_BLOCKED'
};

const ALERT_LEVELS = {
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
  CRITICAL: 'critical'
};

const ALERT_LEVEL_WEIGHT = {
  info: 1,
  warning: 2,
  error: 3,
  critical: 4
};

const TYPE_DEFAULT_LEVEL = {
  [ALERT_TYPES.NEW_DEVICE]: ALERT_LEVELS.WARNING,
  [ALERT_TYPES.UNKNOWN_DEVICE]: ALERT_LEVELS.WARNING,
  [ALERT_TYPES.DEVICE_OFFLINE]: ALERT_LEVELS.INFO,
  [ALERT_TYPES.DEVICE_ONLINE]: ALERT_LEVELS.INFO,
  [ALERT_TYPES.TRAFFIC_SPIKE]: ALERT_LEVELS.WARNING,
  [ALERT_TYPES.PARENTAL_BLOCKED]: ALERT_LEVELS.CRITICAL
};

const TYPE_TITLES = {
  [ALERT_TYPES.NEW_DEVICE]: '新设备接入',
  [ALERT_TYPES.UNKNOWN_DEVICE]: '未知设备接入',
  [ALERT_TYPES.DEVICE_OFFLINE]: '设备离线',
  [ALERT_TYPES.DEVICE_ONLINE]: '设备上线',
  [ALERT_TYPES.TRAFFIC_SPIKE]: '流量异常',
  [ALERT_TYPES.PARENTAL_BLOCKED]: '访问被拦截'
};

const ONE_HOUR = 60 * 60 * 1000;
const ONE_DAY = 24 * ONE_HOUR;

class AlertService {
  constructor() {
    this.alerts = [];
    this.knownDevices = new Map();
    this.deviceOnlineStatus = new Map();
    this.deviceTrafficHistory = new Map();
    this.init();
  }

  init() {
    this.alerts = [];
    this.knownDevices = new Map();
    this.deviceOnlineStatus = new Map();
    this.deviceTrafficHistory = new Map();
    this.generateMockAlerts();
  }

  generateMockAlerts() {
    const now = Date.now();
    const mockData = [
      { type: ALERT_TYPES.NEW_DEVICE, level: ALERT_LEVELS.WARNING, offset: 7, titleSuffix: 'iPhone-15-Pro', deviceId: 'dev-phone-001', mac: '00:1A:2B:CC:DD:02', data: { ip: '192.168.1.3', vendor: 'Apple Inc.' } },
      { type: ALERT_TYPES.NEW_DEVICE, level: ALERT_LEVELS.WARNING, offset: 6.5, titleSuffix: 'MacBook-Pro', deviceId: 'dev-laptop-001', mac: 'F4:5C:89:AA:BB:01', data: { ip: '192.168.1.2', vendor: 'Apple Inc.' } },
      { type: ALERT_TYPES.NEW_DEVICE, level: ALERT_LEVELS.WARNING, offset: 6, titleSuffix: 'Xiaomi-Mi-14', deviceId: 'dev-phone-002', mac: '68:DB:CA:11:22:04', data: { ip: '192.168.1.5', vendor: 'Xiaomi Communications' } },
      { type: ALERT_TYPES.UNKNOWN_DEVICE, level: ALERT_LEVELS.WARNING, offset: 5, titleSuffix: '未知设备', deviceId: 'dev-unknown-001', mac: '00:11:22:AA:BB:CC', data: { ip: '192.168.1.100', vendor: 'Unknown Vendor' } },
      { type: ALERT_TYPES.TRAFFIC_SPIKE, level: ALERT_LEVELS.WARNING, offset: 3, titleSuffix: 'Smart-TV-Sony 流量突增', deviceId: 'dev-tv-001', mac: 'F0:99:BF:77:88:07', data: { currentSpeed: 24.5, avgSpeed: 5.2, increasePercent: 371, unit: 'Mbps' } },
      { type: ALERT_TYPES.TRAFFIC_SPIKE, level: ALERT_LEVELS.WARNING, offset: 2, titleSuffix: 'NAS-Server 流量突增', deviceId: 'dev-nas-001', mac: '00:25:00:33:44:21', data: { currentSpeed: 68.3, avgSpeed: 12.1, increasePercent: 464, unit: 'Mbps' } },
      { type: ALERT_TYPES.DEVICE_OFFLINE, level: ALERT_LEVELS.INFO, offset: 1.5, titleSuffix: 'Windows-PC 离线', deviceId: 'dev-desktop-001', mac: '80:91:33:55:66:06', data: { ip: '192.168.1.7', offlineFor: '1.5 小时' } },
      { type: ALERT_TYPES.DEVICE_ONLINE, level: ALERT_LEVELS.INFO, offset: 1, titleSuffix: 'PS5 上线', deviceId: 'dev-console-001', mac: '40:33:1A:DD:EE:10', data: { ip: '192.168.1.20' } },
      { type: ALERT_TYPES.PARENTAL_BLOCKED, level: ALERT_LEVELS.CRITICAL, offset: 0.5, titleSuffix: '被拦截的网站访问', deviceId: 'dev-phone-003', mac: '50:32:37:33:44:05', data: { url: 'example-blocked-site.com', category: 'games', rule: '游戏时间限制' } },
      { type: ALERT_TYPES.DEVICE_ONLINE, level: ALERT_LEVELS.INFO, offset: 0.2, titleSuffix: 'Chromecast 上线', deviceId: 'dev-tvbox-002', mac: '64:20:0C:BB:CC:09', data: { ip: '192.168.1.11' } }
    ];

    for (const item of mockData) {
      const timestamp = now - item.offset * ONE_HOUR;
      const isRead = item.offset > 3;
      this.alerts.push({
        id: uuidv4(),
        type: item.type,
        level: item.level,
        title: TYPE_TITLES[item.type] + (item.titleSuffix ? `: ${item.titleSuffix}` : ''),
        message: this.getDefaultMessage(item.type, item.data),
        deviceId: item.deviceId,
        mac: item.mac,
        data: item.data || {},
        isRead,
        readAt: isRead ? timestamp + Math.random() * 30 * 60 * 1000 : null,
        createdAt: timestamp,
        updatedAt: timestamp
      });
    }

    this.alerts.sort((a, b) => b.createdAt - a.createdAt);
  }

  getDefaultMessage(type, data) {
    switch (type) {
      case ALERT_TYPES.NEW_DEVICE:
        return `新设备已接入网络：${data ? data.ip : 'N/A'}${data && data.vendor ? ` (${data.vendor})` : ''}`;
      case ALERT_TYPES.UNKNOWN_DEVICE:
        return `检测到未识别的设备接入：${data ? data.ip : 'N/A'}，请确认是否为授权设备`;
      case ALERT_TYPES.DEVICE_OFFLINE:
        return `设备已从网络断开，最后在线时间：${data && data.offlineFor ? data.offlineFor : '未知'}`;
      case ALERT_TYPES.DEVICE_ONLINE:
        return `设备重新连接到网络，IP：${data ? data.ip : 'N/A'}`;
      case ALERT_TYPES.TRAFFIC_SPIKE:
        return `当前流量 ${data ? data.currentSpeed : 'N/A'}${data ? data.unit : 'Mbps'}，超过平均值 ${data ? data.increasePercent : 'N/A'}%，疑似异常`;
      case ALERT_TYPES.PARENTAL_BLOCKED:
        return `家长控制已拦截访问：${data && data.url ? data.url : 'N/A'}${data && data.rule ? `（规则：${data.rule}）` : ''}`;
      default:
        return '系统告警';
    }
  }

  createAlert(type, level, title, message, deviceId, mac, data) {
    const now = Date.now();
    const alertLevel = level || TYPE_DEFAULT_LEVEL[type] || ALERT_LEVELS.INFO;
    const alertTitle = title || TYPE_TITLES[type] || '系统告警';
    const alertMessage = message || this.getDefaultMessage(type, data);

    const alert = {
      id: uuidv4(),
      type,
      level: alertLevel,
      title: alertTitle,
      message: alertMessage,
      deviceId: deviceId || null,
      mac: mac || null,
      data: data || {},
      isRead: false,
      readAt: null,
      createdAt: now,
      updatedAt: now
    };

    this.alerts.unshift(alert);

    if (this.alerts.length > 10000) {
      this.alerts = this.alerts.slice(0, 10000);
    }

    return alert;
  }

  checkNewDevices(devices) {
    const alerts = [];

    if (!devices || !Array.isArray(devices)) {
      return alerts;
    }

    for (const device of devices) {
      const deviceKey = device.mac || device.id;
      if (!deviceKey) continue;

      if (!this.knownDevices.has(deviceKey)) {
        this.knownDevices.set(deviceKey, {
          firstSeen: Date.now(),
          lastSeen: Date.now(),
          ...device
        });

        const isUnknown = !device.vendor || device.vendor === 'Unknown Vendor' ||
          !device.name || device.name.startsWith('device-') || device.name.startsWith('unknown') ||
          device.type === 'unknown' || device.category === 'other';

        const type = isUnknown ? ALERT_TYPES.UNKNOWN_DEVICE : ALERT_TYPES.NEW_DEVICE;
        const alert = this.createAlert(
          type,
          isUnknown ? ALERT_LEVELS.WARNING : ALERT_LEVELS.WARNING,
          null,
          null,
          device.id,
          device.mac,
          {
            ip: device.ip,
            name: device.name,
            vendor: device.vendor,
            os: device.os,
            type: device.type,
            category: device.category
          }
        );
        alerts.push(alert);
      } else {
        const existing = this.knownDevices.get(deviceKey);
        existing.lastSeen = Date.now();
        existing.ip = device.ip;
        existing.isOnline = device.isOnline;
      }
    }

    return alerts;
  }

  checkOnlineStatusChanges(oldDevices, newDevices) {
    const alerts = [];

    const oldMap = new Map();
    const newMap = new Map();

    (oldDevices || []).forEach((d) => {
      const key = d.mac || d.id;
      if (key) oldMap.set(key, d);
    });

    (newDevices || []).forEach((d) => {
      const key = d.mac || d.id;
      if (key) {
        newMap.set(key, d);
        this.deviceOnlineStatus.set(key, d.isOnline !== false);
      }
    });

    for (const [key, newDev] of newMap.entries()) {
      const oldDev = oldMap.get(key);
      const wasOnline = oldDev ? oldDev.isOnline !== false : false;
      const isOnline = newDev.isOnline !== false;

      if (oldDev && wasOnline && !isOnline) {
        const alert = this.createAlert(
          ALERT_TYPES.DEVICE_OFFLINE,
          ALERT_LEVELS.INFO,
          null,
          null,
          newDev.id,
          newDev.mac,
          {
            ip: newDev.ip,
            name: newDev.name,
            offlineFor: '刚刚离线',
            lastOnline: oldDev.lastSeen || Date.now()
          }
        );
        alerts.push(alert);
      } else if (!wasOnline && isOnline) {
        if (this.knownDevices.has(newDev.mac || newDev.id)) {
          const alert = this.createAlert(
            ALERT_TYPES.DEVICE_ONLINE,
            ALERT_LEVELS.INFO,
            null,
            null,
            newDev.id,
            newDev.mac,
            {
              ip: newDev.ip,
              name: newDev.name,
              vendor: newDev.vendor
            }
          );
          alerts.push(alert);
        }
      }
    }

    for (const [key, oldDev] of oldMap.entries()) {
      if (!newMap.has(key) && oldDev.isOnline !== false) {
        const alert = this.createAlert(
          ALERT_TYPES.DEVICE_OFFLINE,
          ALERT_LEVELS.INFO,
          null,
          null,
          oldDev.id,
          oldDev.mac,
          {
            ip: oldDev.ip,
            name: oldDev.name,
            offlineFor: '设备未响应',
            lastOnline: oldDev.lastSeen || Date.now()
          }
        );
        alerts.push(alert);
        this.deviceOnlineStatus.set(key, false);
      }
    }

    return alerts;
  }

  checkTrafficAnomaly(deviceId, currentSpeed, history) {
    const hist = history || this.deviceTrafficHistory.get(deviceId) || [];

    if (hist.length < 10) {
      if (Array.isArray(hist)) {
        hist.push({
          speed: currentSpeed,
          timestamp: Date.now()
        });
        this.deviceTrafficHistory.set(deviceId, hist.slice(-60));
      }
      return null;
    }

    const avgSpeed = hist.reduce((acc, h) => acc + (h.speed ? h.speed.down || 0 : 0), 0) / hist.length;
    const stdDev = Math.sqrt(
      hist.reduce((acc, h) => {
        const diff = (h.speed ? h.speed.down || 0 : 0) - avgSpeed;
        return acc + diff * diff;
      }, 0) / hist.length
    );

    const currentDown = currentSpeed && (typeof currentSpeed === 'object')
      ? (currentSpeed.down || 0)
      : (currentSpeed || 0);

    const threshold = avgSpeed + (stdDev * 3);
    const increasePercent = avgSpeed > 0.01 ? Math.round(((currentDown - avgSpeed) / avgSpeed) * 100) : 0;
    const isSpike = currentDown > threshold && currentDown > 2 && increasePercent > 200;

    hist.push({
      speed: currentSpeed,
      timestamp: Date.now()
    });
    this.deviceTrafficHistory.set(deviceId, hist.slice(-60));

    if (isSpike) {
      const alert = this.createAlert(
        ALERT_TYPES.TRAFFIC_SPIKE,
        increasePercent > 500 ? ALERT_LEVELS.ERROR : ALERT_LEVELS.WARNING,
        null,
        null,
        deviceId,
        null,
        {
          currentSpeed: Math.round(currentDown * 100) / 100,
          avgSpeed: Math.round(avgSpeed * 100) / 100,
          increasePercent,
          unit: 'Mbps',
          threshold: Math.round(threshold * 100) / 100,
          standardDeviation: Math.round(stdDev * 100) / 100
        }
      );
      return alert;
    }

    return null;
  }

  getAlerts(params) {
    const {
      page = 1,
      pageSize = 20,
      type = null,
      level = null,
      isRead = null,
      deviceId = null,
      mac = null,
      startTime = null,
      endTime = null,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = params || {};

    let filtered = [...this.alerts];

    if (type) {
      const types = Array.isArray(type) ? type : [type];
      filtered = filtered.filter((a) => types.includes(a.type));
    }

    if (level) {
      const levels = Array.isArray(level) ? level : [level];
      filtered = filtered.filter((a) => levels.includes(a.level));
    }

    if (isRead !== null && isRead !== undefined) {
      filtered = filtered.filter((a) => a.isRead === !!isRead);
    }

    if (deviceId) {
      filtered = filtered.filter((a) => a.deviceId === deviceId);
    }

    if (mac) {
      filtered = filtered.filter((a) => a.mac && a.mac.toLowerCase() === mac.toLowerCase());
    }

    if (startTime) {
      filtered = filtered.filter((a) => a.createdAt >= startTime);
    }

    if (endTime) {
      filtered = filtered.filter((a) => a.createdAt <= endTime);
    }

    filtered.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'level') {
        cmp = ALERT_LEVEL_WEIGHT[a.level] - ALERT_LEVEL_WEIGHT[b.level];
      } else if (sortBy === 'createdAt') {
        cmp = a.createdAt - b.createdAt;
      } else if (sortBy === 'updatedAt') {
        cmp = a.updatedAt - b.updatedAt;
      } else {
        cmp = a.createdAt - b.createdAt;
      }
      return sortOrder === 'asc' ? cmp : -cmp;
    });

    const total = filtered.length;
    const start = (page - 1) * pageSize;
    const paged = filtered.slice(start, start + pageSize);

    const unread = this.alerts.filter((a) => !a.isRead).length;

    const statsByLevel = this.alerts.reduce((acc, a) => {
      if (!acc[a.level]) acc[a.level] = 0;
      acc[a.level]++;
      return acc;
    }, {});

    const statsByType = this.alerts.reduce((acc, a) => {
      if (!acc[a.type]) acc[a.type] = 0;
      acc[a.type]++;
      return acc;
    }, {});

    const last24h = Date.now() - ONE_DAY;
    const todayCount = this.alerts.filter((a) => a.createdAt >= last24h).length;

    return {
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize) || 1,
        hasNext: start + pageSize < total,
        hasPrev: page > 1
      },
      items: paged,
      stats: {
        unread,
        todayCount,
        byLevel: statsByLevel,
        byType: statsByType
      }
    };
  }

  markAlertRead(id) {
    const alert = this.alerts.find((a) => a.id === id);
    if (!alert) {
      return { success: false, error: 'ALERT_NOT_FOUND', id };
    }

    if (alert.isRead) {
      return { success: true, alreadyRead: true, id };
    }

    alert.isRead = true;
    alert.readAt = Date.now();
    alert.updatedAt = alert.readAt;

    return { success: true, id, alert };
  }

  markAllRead() {
    const now = Date.now();
    let count = 0;

    for (const alert of this.alerts) {
      if (!alert.isRead) {
        alert.isRead = true;
        alert.readAt = now;
        alert.updatedAt = now;
        count++;
      }
    }

    return {
      success: true,
      markedCount: count,
      totalUnreadBefore: count,
      totalAlerts: this.alerts.length
    };
  }

  getUnreadCount() {
    const unread = this.alerts.filter((a) => !a.isRead);

    const byLevel = unread.reduce((acc, a) => {
      if (!acc[a.level]) acc[a.level] = 0;
      acc[a.level]++;
      return acc;
    }, {});

    const byType = unread.reduce((acc, a) => {
      if (!acc[a.type]) acc[a.type] = 0;
      acc[a.type]++;
      return acc;
    }, {});

    return {
      total: unread.length,
      byLevel,
      byType
    };
  }

  deleteAlert(id) {
    const idx = this.alerts.findIndex((a) => a.id === id);
    if (idx < 0) {
      return { success: false, error: 'ALERT_NOT_FOUND', id };
    }

    this.alerts.splice(idx, 1);
    return { success: true, id };
  }

  deleteOldAlerts(maxAgeDays) {
    const maxAge = (maxAgeDays || 30) * ONE_DAY;
    const cutoff = Date.now() - maxAge;
    const beforeLen = this.alerts.length;
    this.alerts = this.alerts.filter((a) => a.createdAt >= cutoff);
    return {
      success: true,
      deletedCount: beforeLen - this.alerts.length,
      remainingCount: this.alerts.length
    };
  }
}

const alertService = new AlertService();

const checkNewDevices = (devices) => alertService.checkNewDevices(devices);
const checkOnlineStatusChanges = (oldDevices, newDevices) => alertService.checkOnlineStatusChanges(oldDevices, newDevices);
const checkTrafficAnomaly = (deviceId, currentSpeed, history) => alertService.checkTrafficAnomaly(deviceId, currentSpeed, history);
const createAlert = (type, level, title, message, deviceId, mac, data) =>
  alertService.createAlert(type, level, title, message, deviceId, mac, data);
const getAlerts = (params) => alertService.getAlerts(params);
const markAlertRead = (id) => alertService.markAlertRead(id);
const markAllRead = () => alertService.markAllRead();
const getUnreadCount = () => alertService.getUnreadCount();

module.exports = {
  AlertService,
  alertService,
  ALERT_TYPES,
  ALERT_LEVELS,
  checkNewDevices,
  checkOnlineStatusChanges,
  checkTrafficAnomaly,
  createAlert,
  getAlerts,
  markAlertRead,
  markAllRead,
  getUnreadCount
};
