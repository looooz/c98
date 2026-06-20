const { v4: uuidv4 } = require('uuid');

const PROFILE_SPEEDS = {
  tiny: { downBase: 0.01, downMax: 0.1, upBase: 0.005, upMax: 0.02, spikeChance: 0.01 },
  low: { downBase: 0.1, downMax: 1.5, upBase: 0.05, upMax: 0.5, spikeChance: 0.02 },
  medium: { downBase: 1, downMax: 8, upBase: 0.5, upMax: 3, spikeChance: 0.05 },
  high: { downBase: 5, downMax: 30, upBase: 2, upMax: 10, spikeChance: 0.08 },
  heavy: { downBase: 10, downMax: 80, upBase: 5, upMax: 30, spikeChance: 0.12 },
  streaming: { downBase: 8, downMax: 25, upBase: 0.5, upMax: 2, spikeChance: 0.15 },
  gaming: { downBase: 2, downMax: 15, upBase: 1, upMax: 8, spikeChance: 0.2 },
  cctv: { downBase: 0.5, downMax: 2, upBase: 4, upMax: 12, spikeChance: 0.03 }
};

const PROFILE_USAGE_HOURS = {
  tiny: { start: 0, end: 24, weekendMultiplier: 1.0 },
  low: { start: 0, end: 24, weekendMultiplier: 1.1 },
  medium: { start: 6, end: 24, weekendMultiplier: 1.4 },
  high: { start: 7, end: 2, weekendMultiplier: 1.5 },
  heavy: { start: 9, end: 2, weekendMultiplier: 1.3 },
  streaming: { start: 12, end: 2, weekendMultiplier: 1.8 },
  gaming: { start: 14, end: 2, weekendMultiplier: 2.0 },
  cctv: { start: 0, end: 24, weekendMultiplier: 1.0 }
};

const ONE_SECOND = 1000;
const ONE_MINUTE = 60 * ONE_SECOND;
const ONE_HOUR = 60 * ONE_MINUTE;
const ONE_DAY = 24 * ONE_HOUR;
const ONE_WEEK = 7 * ONE_DAY;
const ONE_MONTH = 30 * ONE_DAY;

class TrafficMonitor {
  constructor() {
    this.isRunning = false;
    this.intervalId = null;
    this.sampleInterval = 2 * ONE_SECOND;
    this.devices = new Map();
    this.realtimeData = new Map();
    this.historyData = [];
    this.hourlyAggregates = [];
    this.dailyAggregates = [];
    this.lastAggregateTime = {
      hourly: 0,
      daily: 0
    };
    this.initHistoryData();
  }

  initHistoryData() {
    const now = Date.now();
    const twoWeeksAgo = now - 14 * ONE_DAY;
    this.historyData = [];
    this.hourlyAggregates = [];
    this.dailyAggregates = [];

    for (let t = twoWeeksAgo; t <= now; t += ONE_MINUTE) {
      this.historyData.push({
        timestamp: t,
        samples: []
      });
    }

    this.seedHistoryData();
  }

  seedHistoryData() {
    const devices = this.getMockDevices();
    devices.forEach((d) => this.devices.set(d.id, d));

    for (let i = 0; i < this.historyData.length; i++) {
      const entry = this.historyData[i];
      const samples = [];
      for (const device of this.devices.values()) {
        const speed = this.generateTrafficForDevice(device, entry.timestamp);
        if (speed.down > 0 || speed.up > 0) {
          samples.push({
            deviceId: device.id,
            mac: device.mac,
            down: speed.down,
            up: speed.up,
            bytesDown: Math.round(speed.down * 125000 * (this.sampleInterval / 1000)),
            bytesUp: Math.round(speed.up * 125000 * (this.sampleInterval / 1000))
          });
        }
      }
      entry.samples = samples;
    }

    this.rebuildAggregates();
  }

  rebuildAggregates() {
    const now = Date.now();

    const hourlyMap = new Map();
    const dailyMap = new Map();

    for (const entry of this.historyData) {
      const hourKey = Math.floor(entry.timestamp / ONE_HOUR) * ONE_HOUR;
      const dayKey = Math.floor(entry.timestamp / ONE_DAY) * ONE_DAY;

      for (const sample of entry.samples) {
        if (!hourlyMap.has(hourKey)) hourlyMap.set(hourKey, new Map());
        if (!dailyMap.has(dayKey)) dailyMap.set(dayKey, new Map());

        const hourDev = hourlyMap.get(hourKey);
        const dayDev = dailyMap.get(dayKey);

        if (!hourDev.has(sample.deviceId)) {
          hourDev.set(sample.deviceId, {
            timestamp: hourKey,
            deviceId: sample.deviceId,
            mac: sample.mac,
            bytesDown: 0,
            bytesUp: 0,
            peakDown: 0,
            peakUp: 0,
            avgDown: 0,
            avgUp: 0,
            sampleCount: 0
          });
        }
        if (!dayDev.has(sample.deviceId)) {
          dayDev.set(sample.deviceId, {
            timestamp: dayKey,
            deviceId: sample.deviceId,
            mac: sample.mac,
            bytesDown: 0,
            bytesUp: 0,
            peakDown: 0,
            peakUp: 0,
            avgDown: 0,
            avgUp: 0,
            sampleCount: 0
          });
        }

        const hd = hourDev.get(sample.deviceId);
        hd.bytesDown += sample.bytesDown;
        hd.bytesUp += sample.bytesUp;
        hd.peakDown = Math.max(hd.peakDown, sample.down);
        hd.peakUp = Math.max(hd.peakUp, sample.up);
        hd.avgDown += sample.down;
        hd.avgUp += sample.up;
        hd.sampleCount++;

        const dd = dayDev.get(sample.deviceId);
        dd.bytesDown += sample.bytesDown;
        dd.bytesUp += sample.bytesUp;
        dd.peakDown = Math.max(dd.peakDown, sample.down);
        dd.peakUp = Math.max(dd.peakUp, sample.up);
        dd.avgDown += sample.down;
        dd.avgUp += sample.up;
        dd.sampleCount++;
      }
    }

    this.hourlyAggregates = [];
    for (const [, devMap] of hourlyMap) {
      for (const agg of devMap.values()) {
        if (agg.sampleCount > 0) {
          agg.avgDown = agg.avgDown / agg.sampleCount;
          agg.avgUp = agg.avgUp / agg.sampleCount;
        }
        this.hourlyAggregates.push(agg);
      }
    }
    this.hourlyAggregates.sort((a, b) => a.timestamp - b.timestamp);

    this.dailyAggregates = [];
    for (const [, devMap] of dailyMap) {
      for (const agg of devMap.values()) {
        if (agg.sampleCount > 0) {
          agg.avgDown = agg.avgDown / agg.sampleCount;
          agg.avgUp = agg.avgUp / agg.sampleCount;
        }
        this.dailyAggregates.push(agg);
      }
    }
    this.dailyAggregates.sort((a, b) => a.timestamp - b.timestamp);

    if (this.hourlyAggregates.length > 0) {
      this.lastAggregateTime.hourly = this.hourlyAggregates[this.hourlyAggregates.length - 1].timestamp;
    }
    if (this.dailyAggregates.length > 0) {
      this.lastAggregateTime.daily = this.dailyAggregates[this.dailyAggregates.length - 1].timestamp;
    }
  }

  getMockDevices() {
    return [
      { id: 'dev-router-001', name: 'TP-Link-AC1200', mac: '90:72:40:12:34:56', trafficProfile: 'high', category: 'networking', isOnline: true },
      { id: 'dev-laptop-001', name: 'MacBook-Pro', mac: 'F4:5C:89:AA:BB:01', trafficProfile: 'heavy', category: 'computer', isOnline: true },
      { id: 'dev-phone-001', name: 'iPhone-15-Pro', mac: '00:1A:2B:CC:DD:02', trafficProfile: 'medium', category: 'mobile', isOnline: true },
      { id: 'dev-tablet-001', name: 'iPad-Air', mac: '04:15:52:EE:FF:03', trafficProfile: 'medium', category: 'mobile', isOnline: false },
      { id: 'dev-phone-002', name: 'Xiaomi-Mi-14', mac: '68:DB:CA:11:22:04', trafficProfile: 'medium', category: 'mobile', isOnline: true },
      { id: 'dev-phone-003', name: 'Samsung-Galaxy', mac: '50:32:37:33:44:05', trafficProfile: 'medium', category: 'mobile', isOnline: true },
      { id: 'dev-desktop-001', name: 'Windows-PC', mac: '80:91:33:55:66:06', trafficProfile: 'heavy', category: 'computer', isOnline: false },
      { id: 'dev-tv-001', name: 'Smart-TV-Sony', mac: 'F0:99:BF:77:88:07', trafficProfile: 'streaming', category: 'entertainment', isOnline: true },
      { id: 'dev-tvbox-001', name: 'Apple-TV-4K', mac: 'C8:69:CD:99:AA:08', trafficProfile: 'streaming', category: 'entertainment', isOnline: false },
      { id: 'dev-tvbox-002', name: 'Chromecast', mac: '64:20:0C:BB:CC:09', trafficProfile: 'streaming', category: 'entertainment', isOnline: true },
      { id: 'dev-console-001', name: 'PS5', mac: '40:33:1A:DD:EE:10', trafficProfile: 'gaming', category: 'entertainment', isOnline: false },
      { id: 'dev-console-002', name: 'Switch', mac: '8C:85:90:FF:00:11', trafficProfile: 'gaming', category: 'entertainment', isOnline: true },
      { id: 'dev-speaker-001', name: 'Echo-Dot', mac: '44:00:10:11:22:12', trafficProfile: 'low', category: 'iot', isOnline: true },
      { id: 'dev-speaker-002', name: 'HomePod-Mini', mac: '98:01:A7:33:44:13', trafficProfile: 'low', category: 'iot', isOnline: true },
      { id: 'dev-ac-001', name: 'Xiaomi-AC', mac: '78:31:C1:55:66:14', trafficProfile: 'low', category: 'iot', isOnline: true },
      { id: 'dev-bulb-001', name: 'Smart-Bulb', mac: '84:38:35:77:88:15', trafficProfile: 'tiny', category: 'iot', isOnline: true },
      { id: 'dev-plug-001', name: 'Smart-Plug', mac: '88:66:5A:99:AA:16', trafficProfile: 'tiny', category: 'iot', isOnline: true },
      { id: 'dev-lock-001', name: 'Smart-Lock', mac: '9C:20:7B:BB:CC:17', trafficProfile: 'tiny', category: 'iot', isOnline: true },
      { id: 'dev-camera-001', name: 'Security-Camera', mac: 'A8:5C:2C:DD:EE:18', trafficProfile: 'cctv', category: 'iot', isOnline: true },
      { id: 'dev-camera-002', name: 'Doorbell-Cam', mac: 'B4:4B:D6:FF:00:19', trafficProfile: 'cctv', category: 'iot', isOnline: true },
      { id: 'dev-sbc-001', name: 'Raspberry-Pi', mac: 'DC:A6:32:11:22:20', trafficProfile: 'low', category: 'computer', isOnline: true },
      { id: 'dev-nas-001', name: 'NAS-Server', mac: '00:25:00:33:44:21', trafficProfile: 'heavy', category: 'storage', isOnline: true },
      { id: 'dev-printer-001', name: 'HP-Printer', mac: 'AC:3C:0A:55:66:22', trafficProfile: 'tiny', category: 'peripheral', isOnline: false },
      { id: 'dev-unknown-001', name: 'Unknown-Device', mac: '00:11:22:AA:BB:CC', trafficProfile: 'low', category: 'other', isOnline: false }
    ];
  }

  generateTrafficForDevice(device, timestamp) {
    const profile = PROFILE_SPEEDS[device.trafficProfile] || PROFILE_SPEEDS.low;
    const usageHours = PROFILE_USAGE_HOURS[device.trafficProfile] || PROFILE_USAGE_HOURS.low;

    const date = new Date(timestamp);
    const hour = date.getHours();
    const minutes = date.getMinutes();
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;

    let hourMultiplier = 0;
    if (usageHours.start < usageHours.end) {
      hourMultiplier = (hour >= usageHours.start && hour < usageHours.end) ? 1 : 0.05;
    } else {
      hourMultiplier = (hour >= usageHours.start || hour < usageHours.end) ? 1 : 0.05;
    }

    if (hourMultiplier > 0.1) {
      if (hour >= 7 && hour <= 9) hourMultiplier = 0.6;
      else if (hour >= 12 && hour <= 13) hourMultiplier = 0.8;
      else if (hour >= 18 && hour <= 19) hourMultiplier = 0.9;
      else if (hour >= 20 && hour <= 22) hourMultiplier = 1.2;
      else if (hour >= 0 && hour <= 5) hourMultiplier = 0.2;
    }

    if (isWeekend && usageHours.weekendMultiplier) {
      hourMultiplier *= usageHours.weekendMultiplier;
    }

    if (device.isOnline === false) {
      hourMultiplier *= 0.1;
    }

    if (Math.random() < 0.05) {
      hourMultiplier *= 0;
    }

    const wave = Math.sin((minutes / 60) * Math.PI * 2) * 0.2 + 1;
    const noise = 0.7 + Math.random() * 0.6;

    let downSpeed = 0;
    let upSpeed = 0;

    if (hourMultiplier > 0) {
      downSpeed = (profile.downBase + Math.random() * (profile.downMax - profile.downBase)) * hourMultiplier * wave * noise;
      upSpeed = (profile.upBase + Math.random() * (profile.upMax - profile.upBase)) * hourMultiplier * wave * noise;

      if (Math.random() < profile.spikeChance) {
        const spikeMultiplier = 3 + Math.random() * 7;
        downSpeed *= spikeMultiplier;
        upSpeed *= spikeMultiplier * 0.3;
      }

      if (device.category === 'networking') {
        let totalDown = 0;
        let totalUp = 0;
        for (const dev of this.devices.values()) {
          if (dev.id !== device.id) {
            const subSpeed = this.generateTrafficForDevice(dev, timestamp);
            totalDown += subSpeed.down;
            totalUp += subSpeed.up;
          }
        }
        downSpeed = totalDown * 0.9;
        upSpeed = totalUp * 0.9;
      }
    }

    return {
      down: Math.max(0, Math.round(downSpeed * 100) / 100),
      up: Math.max(0, Math.round(upSpeed * 100) / 100)
    };
  }

  setDevices(devices) {
    devices.forEach((d) => {
      const existing = this.devices.get(d.id);
      this.devices.set(d.id, {
        id: d.id,
        name: d.name,
        mac: d.mac,
        trafficProfile: d.trafficProfile || this.inferProfile(d),
        category: d.category || 'other',
        isOnline: d.isOnline !== false
      });
    });
  }

  inferProfile(device) {
    const cat = device.category || device.type;
    const profileMap = {
      router: 'high',
      networking: 'high',
      storage: 'heavy',
      nas: 'heavy',
      computer: 'heavy',
      laptop: 'heavy',
      desktop: 'heavy',
      mobile: 'medium',
      smartphone: 'medium',
      tablet: 'medium',
      entertainment: 'streaming',
      smarttv: 'streaming',
      tvbox: 'streaming',
      console: 'gaming',
      cctv: 'cctv',
      camera: 'cctv',
      iot: 'low',
      smartspeaker: 'low',
      climate: 'low',
      light: 'tiny',
      plug: 'tiny',
      printer: 'tiny',
      security: 'tiny',
      sbc: 'low',
      peripheral: 'tiny',
      other: 'low',
      unknown: 'low'
    };
    return profileMap[cat] || 'low';
  }

  startMonitoring(callback) {
    if (this.isRunning) return { started: false, reason: 'already_running' };

    this.isRunning = true;
    console.log('[trafficMonitor] 流量监控已启动');

    this.collectTrafficSample();

    this.intervalId = setInterval(() => {
      const sample = this.collectTrafficSample();
      if (typeof callback === 'function') {
        try {
          callback(sample);
        } catch (e) {}
      }
    }, this.sampleInterval);

    return { started: true, interval: this.sampleInterval };
  }

  stopMonitoring() {
    if (!this.isRunning) return { stopped: false, reason: 'not_running' };

    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    console.log('[trafficMonitor] 流量监控已停止');
    return { stopped: true };
  }

  collectTrafficSample() {
    const timestamp = Date.now();
    const samples = [];

    for (const device of this.devices.values()) {
      const speed = this.generateTrafficForDevice(device, timestamp);
      const bytesDown = Math.round(speed.down * 125000 * (this.sampleInterval / 1000));
      const bytesUp = Math.round(speed.up * 125000 * (this.sampleInterval / 1000));

      const sample = {
        id: uuidv4(),
        timestamp,
        deviceId: device.id,
        mac: device.mac,
        deviceName: device.name,
        down: speed.down,
        up: speed.up,
        bytesDown,
        bytesUp
      };

      this.realtimeData.set(device.id, {
        ...sample,
        history: this.getRecentHistory(device.id, 30)
      });

      if (speed.down > 0 || speed.up > 0) {
        samples.push(sample);
      }
    }

    if (this.historyData.length > 0) {
      const lastEntry = this.historyData[this.historyData.length - 1];
      if (timestamp - lastEntry.timestamp >= ONE_MINUTE) {
        this.historyData.push({
          timestamp,
          samples: samples.map((s) => ({
            deviceId: s.deviceId,
            mac: s.mac,
            down: s.down,
            up: s.up,
            bytesDown: s.bytesDown,
            bytesUp: s.bytesUp
          }))
        });

        if (this.historyData.length > 60 * 24 * 14) {
          this.historyData = this.historyData.slice(-60 * 24 * 14);
        }

        this.aggregateTrafficData();
      } else {
        lastEntry.samples = lastEntry.samples.concat(
          samples.map((s) => ({
            deviceId: s.deviceId,
            mac: s.mac,
            down: s.down,
            up: s.up,
            bytesDown: s.bytesDown,
            bytesUp: s.bytesUp
          }))
        );
      }
    }

    const totalDown = samples.reduce((acc, s) => acc + s.down, 0);
    const totalUp = samples.reduce((acc, s) => acc + s.up, 0);

    return {
      timestamp,
      samples,
      total: {
        down: Math.round(totalDown * 100) / 100,
        up: Math.round(totalUp * 100) / 100,
        activeDevices: samples.length
      }
    };
  }

  getRecentHistory(deviceId, minutes) {
    const now = Date.now();
    const cutoff = now - minutes * ONE_MINUTE;
    const result = [];

    for (let i = this.historyData.length - 1; i >= 0; i--) {
      const entry = this.historyData[i];
      if (entry.timestamp < cutoff) break;
      const match = entry.samples.find((s) => s.deviceId === deviceId);
      if (match) {
        result.push({
          timestamp: entry.timestamp,
          down: match.down,
          up: match.up
        });
      } else {
        result.push({
          timestamp: entry.timestamp,
          down: 0,
          up: 0
        });
      }
    }

    return result.reverse();
  }

  getRealtimeTraffic(deviceId) {
    if (!deviceId) {
      const result = {
        timestamp: Date.now(),
        devices: []
      };
      let totalDown = 0;
      let totalUp = 0;

      for (const [id, data] of this.realtimeData.entries()) {
        result.devices.push({
          deviceId: id,
          mac: data.mac,
          deviceName: data.deviceName,
          down: data.down,
          up: data.up,
          bytesDown: data.bytesDown,
          bytesUp: data.bytesUp
        });
        totalDown += data.down;
        totalUp += data.up;
      }

      result.total = {
        down: Math.round(totalDown * 100) / 100,
        up: Math.round(totalUp * 100) / 100,
        activeDevices: result.devices.filter((d) => d.down > 0 || d.up > 0).length
      };
      return result;
    }

    const data = this.realtimeData.get(deviceId);
    if (!data) {
      return {
        timestamp: Date.now(),
        deviceId,
        down: 0,
        up: 0,
        bytesDown: 0,
        bytesUp: 0,
        history: []
      };
    }

    return {
      timestamp: data.timestamp,
      deviceId,
      mac: data.mac,
      deviceName: data.deviceName,
      down: data.down,
      up: data.up,
      bytesDown: data.bytesDown,
      bytesUp: data.bytesUp,
      history: data.history || []
    };
  }

  getTrafficHistory(deviceId, startTime, endTime) {
    const start = startTime || Date.now() - ONE_DAY;
    const end = endTime || Date.now();
    const result = [];

    for (const entry of this.historyData) {
      if (entry.timestamp < start) continue;
      if (entry.timestamp > end) break;

      let data = null;
      if (deviceId) {
        const match = entry.samples.find((s) => s.deviceId === deviceId);
        data = match ? {
          down: match.down,
          up: match.up,
          bytesDown: match.bytesDown,
          bytesUp: match.bytesUp
        } : { down: 0, up: 0, bytesDown: 0, bytesUp: 0 };
      } else {
        let totalDown = 0;
        let totalUp = 0;
        let totalBytesDown = 0;
        let totalBytesUp = 0;
        for (const s of entry.samples) {
          totalDown += s.down;
          totalUp += s.up;
          totalBytesDown += s.bytesDown;
          totalBytesUp += s.bytesUp;
        }
        data = {
          down: Math.round(totalDown * 100) / 100,
          up: Math.round(totalUp * 100) / 100,
          bytesDown: totalBytesDown,
          bytesUp: totalBytesUp
        };
      }

      result.push({
        timestamp: entry.timestamp,
        ...data
      });
    }

    return {
      deviceId,
      startTime: start,
      endTime: end,
      points: result,
      summary: this.calculateSummary(result)
    };
  }

  calculateSummary(points) {
    if (points.length === 0) {
      return {
        totalBytesDown: 0,
        totalBytesUp: 0,
        avgDown: 0,
        avgUp: 0,
        peakDown: 0,
        peakUp: 0
      };
    }

    let totalBytesDown = 0;
    let totalBytesUp = 0;
    let peakDown = 0;
    let peakUp = 0;
    let sumDown = 0;
    let sumUp = 0;
    let count = 0;

    for (const p of points) {
      totalBytesDown += p.bytesDown || 0;
      totalBytesUp += p.bytesUp || 0;
      if (p.down > peakDown) peakDown = p.down;
      if (p.up > peakUp) peakUp = p.up;
      if (p.down > 0 || p.up > 0) {
        sumDown += p.down;
        sumUp += p.up;
        count++;
      }
    }

    return {
      totalBytesDown,
      totalBytesUp,
      avgDown: count > 0 ? Math.round((sumDown / count) * 100) / 100 : 0,
      avgUp: count > 0 ? Math.round((sumUp / count) * 100) / 100 : 0,
      peakDown: Math.round(peakDown * 100) / 100,
      peakUp: Math.round(peakUp * 100) / 100
    };
  }

  getTrafficStats(deviceId, period) {
    const now = Date.now();
    let startTime;
    let aggregateList;

    switch (period) {
      case 'week':
        startTime = now - ONE_WEEK;
        aggregateList = this.hourlyAggregates;
        break;
      case 'month':
        startTime = now - ONE_MONTH;
        aggregateList = this.dailyAggregates;
        break;
      case 'day':
      default:
        startTime = now - ONE_DAY;
        aggregateList = this.hourlyAggregates;
    }

    const relevant = aggregateList.filter((a) =>
      a.timestamp >= startTime &&
      (!deviceId || a.deviceId === deviceId)
    );

    const byDevice = new Map();
    for (const agg of relevant) {
      if (!byDevice.has(agg.deviceId)) {
        byDevice.set(agg.deviceId, {
          bytesDown: 0,
          bytesUp: 0,
          peakDown: 0,
          peakUp: 0,
          sumAvgDown: 0,
          sumAvgUp: 0,
          count: 0,
          firstTimestamp: agg.timestamp,
          lastTimestamp: agg.timestamp,
          mac: agg.mac
        });
      }
      const d = byDevice.get(agg.deviceId);
      d.bytesDown += agg.bytesDown;
      d.bytesUp += agg.bytesUp;
      d.peakDown = Math.max(d.peakDown, agg.peakDown);
      d.peakUp = Math.max(d.peakUp, agg.peakUp);
      d.sumAvgDown += agg.avgDown;
      d.sumAvgUp += agg.avgUp;
      d.count++;
      d.firstTimestamp = Math.min(d.firstTimestamp, agg.timestamp);
      d.lastTimestamp = Math.max(d.lastTimestamp, agg.timestamp);
    }

    const stats = [];
    for (const [id, d] of byDevice.entries()) {
      const device = this.devices.get(id);
      stats.push({
        deviceId: id,
        mac: d.mac,
        deviceName: device ? device.name : id,
        period,
        startTime: d.firstTimestamp,
        endTime: d.lastTimestamp,
        bytesDown: d.bytesDown,
        bytesUp: d.bytesUp,
        bytesTotal: d.bytesDown + d.bytesUp,
        avgDown: d.count > 0 ? Math.round((d.sumAvgDown / d.count) * 100) / 100 : 0,
        avgUp: d.count > 0 ? Math.round((d.sumAvgUp / d.count) * 100) / 100 : 0,
        peakDown: Math.round(d.peakDown * 100) / 100,
        peakUp: Math.round(d.peakUp * 100) / 100
      });
    }

    if (deviceId) {
      return stats[0] || {
        deviceId,
        period,
        startTime,
        endTime: now,
        bytesDown: 0,
        bytesUp: 0,
        bytesTotal: 0,
        avgDown: 0,
        avgUp: 0,
        peakDown: 0,
        peakUp: 0
      };
    }

    stats.sort((a, b) => b.bytesTotal - a.bytesTotal);
    return {
      period,
      startTime,
      endTime: now,
      deviceCount: stats.length,
      stats
    };
  }

  calculateTrafficRankings(period, limit) {
    const rankLimit = limit || 10;
    const result = this.getTrafficStats(null, period);

    const rankings = (result.stats || []).slice(0, rankLimit).map((s, idx) => ({
      rank: idx + 1,
      deviceId: s.deviceId,
      mac: s.mac,
      deviceName: s.deviceName,
      bytesDown: s.bytesDown,
      bytesUp: s.bytesUp,
      bytesTotal: s.bytesTotal,
      percentage: result.stats.reduce((acc, r) => acc + r.bytesTotal, 0) > 0
        ? Math.round((s.bytesTotal / result.stats.reduce((acc, r) => acc + r.bytesTotal, 0)) * 10000) / 100
        : 0
    }));

    const total = result.stats.reduce((acc, r) => acc + r.bytesTotal, 0);

    return {
      period,
      limit: rankLimit,
      totalDevices: (result.stats || []).length,
      totalBytes: total,
      rankings
    };
  }

  aggregateTrafficData() {
    const now = Date.now();

    const currentHour = Math.floor(now / ONE_HOUR) * ONE_HOUR;
    if (currentHour > this.lastAggregateTime.hourly) {
      this.performAggregation('hourly', ONE_HOUR, this.lastAggregateTime.hourly);
      this.lastAggregateTime.hourly = currentHour;
    }

    const currentDay = Math.floor(now / ONE_DAY) * ONE_DAY;
    if (currentDay > this.lastAggregateTime.daily) {
      this.performAggregation('daily', ONE_DAY, this.lastAggregateTime.daily);
      this.lastAggregateTime.daily = currentDay;
    }
  }

  performAggregation(type, windowSize, lastTime) {
    const now = Date.now();
    const targetList = type === 'hourly' ? this.hourlyAggregates : this.dailyAggregates;

    if (lastTime === 0) lastTime = this.historyData.length > 0 ? this.historyData[0].timestamp : now - ONE_DAY;

    const start = Math.floor(lastTime / windowSize) * windowSize;

    for (let windowStart = start; windowStart < now; windowStart += windowSize) {
      const windowEnd = windowStart + windowSize;
      const existingIdx = targetList.findIndex((a) =>
        Math.floor(a.timestamp / windowSize) * windowSize === windowStart
      );

      const deviceAggs = new Map();

      for (const entry of this.historyData) {
        if (entry.timestamp < windowStart) continue;
        if (entry.timestamp >= windowEnd) break;

        for (const sample of entry.samples) {
          if (!deviceAggs.has(sample.deviceId)) {
            deviceAggs.set(sample.deviceId, {
              bytesDown: 0,
              bytesUp: 0,
              peakDown: 0,
              peakUp: 0,
              sumDown: 0,
              sumUp: 0,
              count: 0,
              mac: sample.mac
            });
          }
          const agg = deviceAggs.get(sample.deviceId);
          agg.bytesDown += sample.bytesDown;
          agg.bytesUp += sample.bytesUp;
          agg.peakDown = Math.max(agg.peakDown, sample.down);
          agg.peakUp = Math.max(agg.peakUp, sample.up);
          agg.sumDown += sample.down;
          agg.sumUp += sample.up;
          agg.count++;
        }
      }

      for (const [deviceId, agg] of deviceAggs.entries()) {
        const newEntry = {
          timestamp: windowStart,
          deviceId,
          mac: agg.mac,
          bytesDown: agg.bytesDown,
          bytesUp: agg.bytesUp,
          peakDown: Math.round(agg.peakDown * 100) / 100,
          peakUp: Math.round(agg.peakUp * 100) / 100,
          avgDown: agg.count > 0 ? Math.round((agg.sumDown / agg.count) * 100) / 100 : 0,
          avgUp: agg.count > 0 ? Math.round((agg.sumUp / agg.count) * 100) / 100 : 0,
          sampleCount: agg.count
        };

        if (existingIdx >= 0) {
          const found = targetList.findIndex((a) =>
            Math.floor(a.timestamp / windowSize) * windowSize === windowStart &&
            a.deviceId === deviceId
          );
          if (found >= 0) {
            targetList[found] = newEntry;
          } else {
            targetList.push(newEntry);
          }
        } else {
          targetList.push(newEntry);
        }
      }
    }

    targetList.sort((a, b) => a.timestamp - b.timestamp);

    const maxAge = type === 'hourly' ? 30 : 90;
    const cutoff = now - maxAge * ONE_DAY;
    while (targetList.length > 0 && targetList[0].timestamp < cutoff) {
      targetList.shift();
    }
  }
}

const trafficMonitor = new TrafficMonitor();

const startMonitoring = (callback) => trafficMonitor.startMonitoring(callback);
const stopMonitoring = () => trafficMonitor.stopMonitoring();
const collectTrafficSample = () => trafficMonitor.collectTrafficSample();
const getRealtimeTraffic = (deviceId) => trafficMonitor.getRealtimeTraffic(deviceId);
const getTrafficHistory = (deviceId, startTime, endTime) => trafficMonitor.getTrafficHistory(deviceId, startTime, endTime);
const getTrafficStats = (deviceId, period) => trafficMonitor.getTrafficStats(deviceId, period);
const calculateTrafficRankings = (period, limit) => trafficMonitor.calculateTrafficRankings(period, limit);
const aggregateTrafficData = () => trafficMonitor.aggregateTrafficData();
const setDevices = (devices) => trafficMonitor.setDevices(devices);

module.exports = {
  TrafficMonitor,
  trafficMonitor,
  startMonitoring,
  stopMonitoring,
  collectTrafficSample,
  getRealtimeTraffic,
  getTrafficHistory,
  getTrafficStats,
  calculateTrafficRankings,
  aggregateTrafficData,
  setDevices
};
