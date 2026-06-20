const os = require('os');
const { exec } = require('child_process');

let lastStats = null;
let lastTime = 0;

function getActiveInterfaces() {
  const interfaces = os.networkInterfaces();
  const result = {};

  for (const [name, addrs] of Object.entries(interfaces)) {
    if (name.startsWith('lo') || name.startsWith('docker') || name.startsWith('veth') || name.startsWith('bridge')) continue;
    let hasExternal = false;
    let ipAddr = null;
    for (const addr of addrs) {
      if (addr.family === 'IPv4' && !addr.internal) {
        hasExternal = true;
        ipAddr = addr.address;
        break;
      }
    }
    if (!hasExternal) continue;
    result[name] = {
      rx_bytes: 0,
      tx_bytes: 0,
      rx_packets: 0,
      tx_packets: 0,
      ip: ipAddr
    };
  }
  return result;
}

function readNetworkStats() {
  return new Promise(async (resolve) => {
    const ifaces = getActiveInterfaces();
    const ifaceNames = Object.keys(ifaces);

    if (ifaceNames.length === 0) {
      resolve({});
      return;
    }

    if (process.platform === 'linux') {
      try {
        const fs = require('fs');
        const data = fs.readFileSync('/proc/net/dev', 'utf8');
        const lines = data.split('\n');
        for (let i = 2; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          const parts = line.split(/\s+/);
          const iface = parts[0].replace(':', '');
          if (ifaces[iface]) {
            ifaces[iface].rx_bytes = parseInt(parts[1], 10) || 0;
            ifaces[iface].rx_packets = parseInt(parts[2], 10) || 0;
            ifaces[iface].tx_bytes = parseInt(parts[9], 10) || 0;
            ifaces[iface].tx_packets = parseInt(parts[10], 10) || 0;
          }
        }
        resolve(ifaces);
        return;
      } catch (e) {
        console.warn('[systemTraffic] 读取 /proc/net/dev 失败:', e.message);
      }
    }

    if (process.platform === 'darwin') {
      let completed = 0;
      const allDone = () => {
        completed++;
        if (completed >= ifaceNames.length) {
          resolve(ifaces);
        }
      };

      ifaceNames.forEach(name => {
        exec(`netstat -bI ${name} 2>/dev/null | head -5`, { timeout: 2000 }, (err, stdout) => {
          if (!err && stdout) {
            const lines = stdout.trim().split('\n');
            if (lines.length >= 2) {
              const parts = lines[lines.length - 1].trim().split(/\s+/);
              if (parts.length >= 10) {
                ifaces[name].rx_packets = parseInt(parts[3], 10) || 0;
                ifaces[name].tx_packets = parseInt(parts[5], 10) || 0;
                ifaces[name].rx_bytes = parseInt(parts[6], 10) || 0;
                ifaces[name].tx_bytes = parseInt(parts[9], 10) || 0;
              }
            }
          }
          allDone();
        });
      });

      setTimeout(() => {
        if (completed < ifaceNames.length) {
          resolve(ifaces);
        }
      }, 3000);
      return;
    }

    resolve(ifaces);
  });
}

async function getTotalTrafficRate() {
  const current = await readNetworkStats();
  const now = Date.now();

  if (!lastStats || !lastTime || (now - lastTime) < 500) {
    if (!lastStats) lastStats = current;
    lastTime = now;
    return {
      total_upload: 0,
      total_download: 0,
      total_upload_kbps: 0,
      total_download_kbps: 0,
      interfaces: current,
      source: 'init',
      interval_ms: 0
    };
  }

  const intervalSec = (now - lastTime) / 1000;
  let totalDownloadBytes = 0;
  let totalUploadBytes = 0;

  for (const [name, stat] of Object.entries(current)) {
    if (lastStats[name]) {
      const rxDelta = Math.max(0, stat.rx_bytes - lastStats[name].rx_bytes);
      const txDelta = Math.max(0, stat.tx_bytes - lastStats[name].tx_bytes);
      totalDownloadBytes += rxDelta;
      totalUploadBytes += txDelta;
    }
  }

  const downloadBps = totalDownloadBytes / intervalSec;
  const uploadBps = totalUploadBytes / intervalSec;

  const prevStats = lastStats;
  lastStats = current;
  lastTime = now;

  const hasData = totalDownloadBytes > 0 || totalUploadBytes > 0;

  return {
    total_upload: Math.round(uploadBps),
    total_download: Math.round(downloadBps),
    total_upload_kbps: Math.round(uploadBps * 8 / 1024),
    total_download_kbps: Math.round(downloadBps * 8 / 1024),
    interfaces: current,
    source: hasData ? 'system' : 'unavailable',
    interval_ms: now - (lastTime - intervalSec * 1000),
    has_real_data: hasData
  };
}

function estimateDeviceActivity(device, totalRate) {
  if (!device) {
    return { upload_speed: 0, download_speed: 0, upload_bytes: 0, download_bytes: 0, is_estimated: true };
  }

  const isOnline = device.is_online === 1 || device.is_online === true || device.isOnline === true;
  if (!isOnline) {
    return { upload_speed: 0, download_speed: 0, upload_bytes: 0, download_bytes: 0, is_estimated: false };
  }

  const typeWeight = {
    router: 1.0,
    computer: 0.35,
    tv: 0.25,
    console: 0.2,
    phone: 0.15,
    tablet: 0.1,
    camera: 0.18,
    smart_home: 0.05,
    unknown: 0.1
  };

  const weight = typeWeight[device.device_type] || typeWeight.unknown;
  const baseTotal = totalRate?.has_real_data && totalRate?.total_download_kbps > 10
    ? totalRate.total_download_kbps
    : 800;

  const jitter = 0.7 + Math.random() * 0.6;
  const downloadKbps = baseTotal * weight * jitter;
  const uploadKbps = downloadKbps * 0.25;

  return {
    upload_speed: Math.round(uploadKbps * 100) / 100,
    download_speed: Math.round(downloadKbps * 100) / 100,
    upload_bytes: Math.round(uploadKbps * 1024 / 8 * 2),
    download_bytes: Math.round(downloadKbps * 1024 / 8 * 2),
    is_estimated: true,
    estimate_confidence: weight > 0.25 ? 'medium' : 'low',
    based_on: totalRate?.has_real_data ? 'system_total' : 'baseline_estimate'
  };
}

module.exports = {
  getActiveInterfaces,
  readNetworkStats,
  getTotalTrafficRate,
  estimateDeviceActivity
};

