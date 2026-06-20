const os = require('os');
const { exec } = require('child_process');
const arp = require('arp');
const ping = require('ping');
const ip = require('ip');
const { v4: uuidv4 } = require('uuid');
const dns = require('dns');

const MAC_OUI_MAP = {
  '00:1A:2B': 'Apple Inc.',
  '00:1C:42': 'Apple Inc.',
  '00:1E:C2': 'Apple Inc.',
  '00:1F:5B': 'Apple Inc.',
  '00:21:E9': 'Apple Inc.',
  '00:23:12': 'Apple Inc.',
  '00:25:00': 'Apple Inc.',
  '00:25:4B': 'Apple Inc.',
  '00:26:08': 'Apple Inc.',
  '00:26:4A': 'Apple Inc.',
  '04:15:52': 'Apple Inc.',
  '04:54:53': 'Google Inc.',
  '10:02:B5': 'Samsung Electronics',
  '14:2D:27': 'Apple Inc.',
  '18:65:90': 'Apple Inc.',
  '1C:1A:C0': 'Apple Inc.',
  '20:16:D8': 'Apple Inc.',
  '24:A2:E1': 'Apple Inc.',
  '28:CF:DA': 'Apple Inc.',
  '28:6A:BA': 'Xiaomi Communications',
  '2C:BE:08': 'Apple Inc.',
  '34:AB:37': 'Google Inc.',
  '3C:2E:F5': 'Apple Inc.',
  '40:33:1A': 'Samsung Electronics',
  '44:00:10': 'Apple Inc.',
  '4C:32:75': 'Samsung Electronics',
  '50:32:37': 'Apple Inc.',
  '54:26:96': 'Apple Inc.',
  '58:55:CA': 'Apple Inc.',
  '5C:8D:4E': 'Xiaomi Communications',
  '60:03:08': 'Apple Inc.',
  '60:33:4B': 'Apple Inc.',
  '64:20:0C': 'Apple Inc.',
  '68:5B:35': 'Apple Inc.',
  '68:96:7B': 'Apple Inc.',
  '68:DB:CA': 'Xiaomi Communications',
  '70:3E:AC': 'Apple Inc.',
  '74:E1:82': 'Apple Inc.',
  '78:31:C1': 'Apple Inc.',
  '78:4F:43': 'Xiaomi Communications',
  '7C:04:D0': 'Apple Inc.',
  '7C:7D:3D': 'Apple Inc.',
  '80:91:33': 'Xiaomi Communications',
  '80:E6:50': 'Apple Inc.',
  '84:38:35': 'Apple Inc.',
  '88:66:5A': 'Apple Inc.',
  '8C:29:37': 'Apple Inc.',
  '8C:85:90': 'Xiaomi Communications',
  '90:0C:AA': 'Cisco Systems',
  '90:72:40': 'TP-Link Technologies',
  '94:94:26': 'TP-Link Technologies',
  '98:01:A7': 'Apple Inc.',
  '98:5A:EB': 'Apple Inc.',
  '9C:20:7B': 'Apple Inc.',
  'A0:99:9B': 'Apple Inc.',
  'A0:ED:CD': 'Apple Inc.',
  'A4:02:B9': 'TP-Link Technologies',
  'A4:5E:60': 'Apple Inc.',
  'A4:77:33': 'Xiaomi Communications',
  'A8:20:66': 'Apple Inc.',
  'A8:5C:2C': 'TP-Link Technologies',
  'AC:3C:0A': 'Xiaomi Communications',
  'AC:87:A3': 'Apple Inc.',
  'AC:BC:32': 'Google Inc.',
  'B0:34:95': 'Apple Inc.',
  'B0:72:BF': 'Xiaomi Communications',
  'B4:4B:D6': 'Xiaomi Communications',
  'B8:27:EB': 'Raspberry Pi Foundation',
  'B8:53:AC': 'Apple Inc.',
  'BC:15:AC': 'Apple Inc.',
  'BC:3B:AF': 'Xiaomi Communications',
  'BC:54:43': 'Apple Inc.',
  'BC:92:6B': 'TP-Link Technologies',
  'C0:25:A5': 'Google Inc.',
  'C0:56:27': 'Xiaomi Communications',
  'C0:74:AD': 'Cisco Systems',
  'C0:83:09': 'Apple Inc.',
  'C0:BD:D1': 'TP-Link Technologies',
  'C0:CC:F8': 'Apple Inc.',
  'C4:2C:03': 'Xiaomi Communications',
  'C4:B3:01': 'Cisco Systems',
  'C8:14:51': 'TP-Link Technologies',
  'C8:2A:14': 'TP-Link Technologies',
  'C8:3C:85': 'Apple Inc.',
  'C8:69:CD': 'Apple Inc.',
  'C8:85:50': 'TP-Link Technologies',
  'CC:08:8D': 'Xiaomi Communications',
  'CC:20:E8': 'TP-Link Technologies',
  'CC:9E:A2': 'Xiaomi Communications',
  'D0:03:4B': 'Xiaomi Communications',
  'D0:16:6B': 'Apple Inc.',
  'D0:4F:7E': 'Apple Inc.',
  'D0:A6:37': 'TP-Link Technologies',
  'D4:A3:3D': 'Xiaomi Communications',
  'D8:1D:72': 'Apple Inc.',
  'D8:3A:DD': 'Xiaomi Communications',
  'D8:50:E6': 'TP-Link Technologies',
  'D8:5C:3B': 'TP-Link Technologies',
  'D8:96:95': 'Xiaomi Communications',
  'DC:32:2F': 'Xiaomi Communications',
  'DC:41:5F': 'Google Inc.',
  'DC:A6:32': 'Raspberry Pi Foundation',
  'DC:9F:DB': 'Apple Inc.',
  'E0:63:E5': 'Google Inc.',
  'E0:78:C6': 'Xiaomi Communications',
  'E0:AC:CB': 'TP-Link Technologies',
  'E0:E4:7E': 'Xiaomi Communications',
  'E0:F5:9D': 'Xiaomi Communications',
  'E4:27:71': 'TP-Link Technologies',
  'E4:CE:8F': 'Xiaomi Communications',
  'E4:F8:9C': 'Xiaomi Communications',
  'E8:8D:28': 'Apple Inc.',
  'E8:B6:AC': 'Apple Inc.',
  'EC:08:6B': 'TP-Link Technologies',
  'EC:17:2F': 'Google Inc.',
  'EC:35:86': 'TP-Link Technologies',
  'EC:FA:BC': 'Apple Inc.',
  'F0:18:98': 'Xiaomi Communications',
  'F0:25:72': 'TP-Link Technologies',
  'F0:27:65': 'Google Inc.',
  'F0:5C:19': 'TP-Link Technologies',
  'F0:6B:CA': 'Apple Inc.',
  'F0:79:59': 'TP-Link Technologies',
  'F0:7C:06': 'Xiaomi Communications',
  'F0:99:BF': 'TP-Link Technologies',
  'F0:AC:67': 'TP-Link Technologies',
  'F0:B4:29': 'Xiaomi Communications',
  'F0:B4:79': 'TP-Link Technologies',
  'F0:D5:BF': 'TP-Link Technologies',
  'F4:0F:24': 'Apple Inc.',
  'F4:5C:89': 'Apple Inc.',
  'F4:8C:50': 'TP-Link Technologies',
  'F4:B7:E2': 'Google Inc.',
  'F4:CE:46': 'Apple Inc.',
  'F4:E0:7F': 'Xiaomi Communications',
  'F8:04:2E': 'Xiaomi Communications',
  'F8:1A:67': 'Apple Inc.',
  'F8:27:82': 'Apple Inc.',
  'F8:2E:FE': 'Xiaomi Communications',
  'F8:4D:89': 'Apple Inc.',
  'F8:54:33': 'TP-Link Technologies',
  'F8:72:EA': 'TP-Link Technologies',
  'F8:AB:05': 'TP-Link Technologies',
  'FC:52:8D': 'Google Inc.',
  'FC:77:74': 'Xiaomi Communications',
  'FC:A6:67': 'Google Inc.',
  'FC:C2:DE': 'Apple Inc.',
  'FC:D6:BD': 'TP-Link Technologies',
  'FC:EC:DA': 'Xiaomi Communications',
  'F0:DE:F1': 'TP-Link Technologies',
  '10:40:F3': 'Sony Interactive Entertainment',
  '14:DA:E9': 'Sony Interactive Entertainment',
  '1C:66:6D': 'Sony Interactive Entertainment',
  '2C:AA:8E': 'Sony Interactive Entertainment',
  '38:F1:81': 'Sony Interactive Entertainment',
  '00:17:FA': 'Microsoft Corporation',
  '00:1B:E8': 'Microsoft Corporation',
  '00:22:48': 'Microsoft Corporation',
  '00:50:F2': 'Intel Corporation',
  '00:E0:4C': 'Realtek Semiconductor',
  '00:13:EF': 'NVIDIA Corporation',
  '00:15:AF': 'Canon Inc.',
  '00:26:AB': 'Epson',
  '00:80:77': 'Brother Industries',
  '00:04:4B': 'Nintendo Co., Ltd.',
  '00:23:CC': 'Nintendo Co., Ltd.',
  '00:26:59': 'Nintendo Co., Ltd.',
  '00:01:6C': 'Cisco Systems',
  '00:0A:8A': 'Juniper Networks',
  '00:0C:86': 'Fortinet Inc.',
  '00:0D:B7': 'Ubiquiti Networks',
  '00:18:0A': 'NETGEAR Inc.',
  '00:1B:11': 'Dell Inc.',
  '00:23:AE': 'Dell Inc.',
  '00:26:B9': 'Hewlett-Packard',
  '00:50:8B': 'IBM Corporation',
  '00:50:C2': 'ASUSTeK Computer',
  '00:1E:EC': 'LG Electronics',
  '00:02:9B': 'Panasonic',
  '00:03:DB': 'Sharp Corporation',
  '00:04:7D': 'Toshiba Corporation',
  '00:1E:34': 'Hikvision Digital Technology',
  '00:26:96': 'Hikvision Digital Technology',
  '00:60:53': 'Dahua Technology',
  '00:12:41': 'Crestron Electronics',
  '00:13:D3': 'Control4',
  '00:15:66': 'Philips Lighting',
  '00:17:88': 'Signify (Philips Hue)',
  '00:1B:3C': 'Amazon Technologies',
  '00:71:47': 'Amazon Technologies',
  '48:5F:99': 'Meta Platforms',
  '1C:EF:C1': 'Xiaomi Communications',
  '20:AB:48': 'Xiaomi Communications',
  '50:EC:50': 'Xiaomi Communications',
  '60:14:8F': 'Xiaomi Communications',
  '9C:9E:BD': 'Xiaomi Communications',
  'A0:86:C6': 'Huawei Technologies',
  'B0:D1:7E': 'Huawei Technologies',
  'C8:94:BB': 'Huawei Technologies',
  'D4:6D:6D': 'Huawei Technologies',
  'E4:51:A2': 'Honor Device Co., Ltd.',
  '00:E0:FC': 'Samsung Electronics',
  '00:16:6F': 'Samsung Electronics',
  '00:19:66': 'LG Electronics',
  '00:1C:C2': 'LG Electronics',
  '00:19:DB': 'Sichuan Changhong',
  '00:1A:9D': 'Skyworth',
  '00:1E:2C': 'Konka Group',
  '00:24:DB': 'TCL Multimedia',
  '00:20:80': 'Cisco Meraki',
  '00:21:29': 'Belkin International',
  '00:22:3F': 'Buffalo Technology',
  '00:24:01': 'ASUSTeK Computer',
  '00:24:A9': 'Gigabyte Technology',
  '00:24:B6': 'Micro-Star International',
  '00:26:73': 'Motorola Mobility',
  '00:26:F1': 'OnePlus Technology',
  '44:6E:E5': 'OPPO Electronics',
  'C4:4B:7A': 'OPPO Electronics',
  '78:DB:2F': 'vivo Mobile Communication',
  'B8:B7:F1': 'Huawei Technologies',
  '00:30:AB': 'Qualcomm Technologies',
  '00:31:92': 'MediaTek Inc.',
  '00:80:91': 'Bose Corporation',
  '00:90:27': 'Sennheiser Electronic',
  '00:A0:DE': 'Garmin Ltd.',
  '04:03:D6': 'Fitbit Inc.',
  '04:B7:6D': 'GoPro Inc.',
  '05:05:1A': 'Roku Inc.',
  '08:BD:43': 'Amazon Echo',
  '0A:01:2F': 'Tesla Inc.'
};

const getVendorFromMac = (mac) => {
  if (!mac) return 'Unknown Vendor';
  const oui = mac.toUpperCase().slice(0, 8);
  return MAC_OUI_MAP[oui] || 'Unknown Vendor';
};

const detectOSByTTL = (ttl, vendor, hostname) => {
  const vl = (vendor || '').toLowerCase();
  const hl = (hostname || '').toLowerCase();

  if (vl.includes('apple') || vl.includes('iphone') || vl.includes('ipad') || vl.includes('macbook')) {
    if (hl.includes('iphone') || hl.includes('ipad') || hl.includes('ios')) {
      return 'iOS';
    }
    if (hl.includes('mac') || hl.includes('macbook') || hl.includes('imac') || hl.includes('macos')) {
      return 'macOS';
    }
    if (ttl !== undefined && ttl !== null) {
      if (ttl >= 120 && ttl <= 130) return 'iOS';
      if (ttl >= 60 && ttl <= 70) return 'macOS';
    }
    return 'Apple Device';
  }

  if (vl.includes('huawei') || vl.includes('honor') || vl.includes('xiaomi') || vl.includes('oppo') || 
      vl.includes('vivo') || vl.includes('samsung') || vl.includes('oneplus') || vl.includes('motorola')) {
    if (hl.includes('android') || hl.includes('phone') || hl.includes('mobile')) {
      return 'Android';
    }
    if (ttl !== undefined && ttl !== null && ttl >= 60 && ttl <= 70) {
      return 'Android';
    }
  }

  if (hl.includes('windows') || hl.includes('pc') || hl.includes('desktop') || hl.includes('laptop')) {
    return 'Windows';
  }

  if (hl.includes('linux') || hl.includes('ubuntu') || hl.includes('debian') || hl.includes('centos') || 
      hl.includes('raspberry') || hl.includes('pi') || hl.includes('openwrt') || hl.includes('lede')) {
    if (hl.includes('raspberry') || hl.includes('pi')) return 'Raspberry Pi OS';
    if (hl.includes('openwrt') || hl.includes('lede')) return 'OpenWrt';
    return 'Linux';
  }

  if (ttl === undefined || ttl === null) return 'Unknown';
  if (ttl >= 250) return 'Linux/Unix';
  if (ttl >= 120) return 'macOS/iOS';
  if (ttl >= 60) return 'Windows';
  if (ttl >= 30) return 'IoT Device';
  return 'Unknown';
};

const inferDeviceType = (vendor, os, hostname, mac, ip) => {
  const vl = (vendor || '').toLowerCase();
  const ol = (os || '').toLowerCase();
  const hl = (hostname || '').toLowerCase();

  if (ip && (ip.endsWith('.1') || ip.endsWith('.254'))) {
    return 'router';
  }

  if (vl.includes('cisco') || vl.includes('tplink') || vl.includes('netgear') || (vl.includes('huawei') && !ol.includes('android') && !ol.includes('ios')) ||
      vl.includes('ubiquiti') || vl.includes('fortinet') || vl.includes('juniper') || vl.includes('dlink') ||
      vl.includes('belkin') || vl.includes('buffalo') || vl.includes('meraki') ||
      hl.includes('router') || hl.includes('gateway') || hl.includes('modem') || hl.includes('ap') ||
      hl.includes('wifi') || hl.includes('openwrt') || hl.includes('lede') ||
      hl.includes('miwifi') || hl.includes('tplinkwifi') || hl.includes('tenda')) {
    return 'router';
  }

  if (vl.includes('apple') && (ol === 'ios' || hl.includes('iphone') || hl.includes('ipad'))) {
    if (hl.includes('ipad')) return 'tablet';
    return 'phone';
  }

  if ((vl.includes('samsung') || vl.includes('xiaomi') || vl.includes('huawei') || vl.includes('honor') ||
       vl.includes('oppo') || vl.includes('vivo') || vl.includes('oneplus') || vl.includes('motorola') ||
       (vl.includes('google') && !vl.includes('nest') && !vl.includes('home'))) && 
      (ol === 'android' || ol.includes('android') || hl.includes('phone') || hl.includes('mobile'))) {
    if (hl.includes('tab') || hl.includes('tablet') || hl.includes('pad')) return 'tablet';
    return 'phone';
  }

  if (hl.includes('ipad') || hl.includes('tablet') || hl.includes('tab') || hl.includes('pad')) {
    return 'tablet';
  }

  if (ol === 'windows' || ol === 'macos' || ol === 'linux' || 
      hl.includes('pc') || hl.includes('desktop') || hl.includes('laptop') || hl.includes('notebook') ||
      hl.includes('macbook') || hl.includes('imac') || hl.includes('thinkpad') ||
      vl.includes('dell') || vl.includes('hp') || vl.includes('hewlett') || vl.includes('lenovo') || vl.includes('asus') || 
      vl.includes('acer') || vl.includes('msi') || vl.includes('gigabyte') || vl.includes('microsoft') ||
      vl.includes('intel') || vl.includes('nvidia') ||
      hl.includes('raspberry') || hl.includes('pi') ||
      (vl.includes('apple') && (ol === 'macos' || hl.includes('mac')))) {
    return 'computer';
  }

  if (hl.includes('tv') || hl.includes('television') || hl.includes('tvbox') || hl.includes('box') ||
      vl.includes('tcl') || vl.includes('skyworth') || vl.includes('hisense') || vl.includes('changhong') ||
      vl.includes('konka') || (vl.includes('sony') && !vl.includes('playstation')) ||
      hl.includes('roku') || hl.includes('firetv') || hl.includes('chromecast') || hl.includes('apple-tv') ||
      hl.includes('mi-tv') || hl.includes('mitv') || hl.includes('mibox') ||
      (vl.includes('xiaomi') && (hl.includes('tv') || hl.includes('box')))) {
    return 'tv';
  }

  if (hl.includes('playstation') || hl.includes('ps4') || hl.includes('ps5') || hl.includes('ps3') ||
      hl.includes('xbox') || (hl.includes('switch') && !hl.includes('network')) || hl.includes('nintendo') ||
      vl.includes('sony interactive') || vl.includes('nintendo')) {
    return 'console';
  }

  if (hl.includes('camera') || hl.includes('cctv') || hl.includes('ipc') || hl.includes('ipcam') ||
      vl.includes('hikvision') || vl.includes('dahua') || vl.includes('axis') || vl.includes('honeywell')) {
    return 'camera';
  }

  if (hl.includes('alexa') || hl.includes('echo') || hl.includes('homepod') || hl.includes('google-home') ||
      hl.includes('小爱') || hl.includes('小度') || hl.includes('天猫精灵') || hl.includes('speaker') ||
      hl.includes('light') || hl.includes('bulb') || hl.includes('plug') || hl.includes('socket') ||
      (hl.includes('switch') && !hl.includes('nintendo') && !hl.includes('network')) || hl.includes('sensor') || hl.includes('detector') ||
      hl.includes('thermostat') || hl.includes('climate') || hl.includes('curtain') || hl.includes('door') ||
      hl.includes('lock') || (hl.includes('camera') && (vl.includes('xiaomi') || vl.includes('mi'))) ||
      vl.includes('signify') || vl.includes('philips lighting') || vl.includes('crestron') || 
      vl.includes('control4') || (vl.includes('amazon') && hl.includes('echo')) ||
      (vl.includes('google') && (hl.includes('nest') || hl.includes('home')))) {
    return 'smart_home';
  }

  if (hl.includes('printer') || hl.includes('print') || 
      vl.includes('canon') || vl.includes('epson') || vl.includes('brother')) {
    return 'smart_home';
  }

  if (hl.includes('nas') || hl.includes('storage') || hl.includes('synology') || hl.includes('qnap')) {
    return 'computer';
  }

  if (ol === 'ios' || ol === 'android') {
    return 'phone';
  }

  if (vl.includes('xiaomi') || vl.includes('mi')) {
    return 'phone';
  }

  if (vl.includes('samsung')) {
    return 'phone';
  }

  if (vl.includes('huawei') || vl.includes('honor')) {
    return 'phone';
  }

  return 'unknown';
};

const ipToLong = (ipStr) => {
  return ipStr.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
};

const longToIp = (long) => {
  return [
    (long >>> 24) & 255,
    (long >>> 16) & 255,
    (long >>> 8) & 255,
    long & 255
  ].join('.');
};

const getLocalNetworkInfo = () => {
  const interfaces = os.networkInterfaces();
  let result = {
    ip: '192.168.1.100',
    netmask: '255.255.255.0',
    gateway: '192.168.1.1',
    network: '192.168.1.0',
    broadcast: '192.168.1.255',
    cidr: '192.168.1.0/24',
    mac: null,
    interface: null
  };

  try {
    for (const [ifaceName, addrs] of Object.entries(interfaces)) {
      if (ifaceName.startsWith('lo')) continue;
      for (const addr of addrs) {
        if (addr.family === 'IPv4' && !addr.internal) {
          result = {
            ip: addr.address,
            netmask: addr.netmask,
            gateway: longToIp(ipToLong(addr.address) & ipToLong(addr.netmask))
              .replace(/\.\d+$/, '.1'),
            network: longToIp(ipToLong(addr.address) & ipToLong(addr.netmask)),
            broadcast: ip.subnet(addr.address, addr.netmask).broadcastAddress,
            cidr: ip.cidrSubnet(addr.address + '/' + addr.netmask).networkAddress +
              '/' + ip.cidrPrefixFromNetmask(addr.netmask),
            mac: addr.mac,
            interface: ifaceName
          };
          const gatewayIp = result.network.replace(/\.\d+$/, '.1');
          if (gatewayIp !== result.network) {
            result.gateway = gatewayIp;
          }
          return result;
        }
      }
    }
  } catch (err) {
    console.warn('[deviceScanner] 获取网络信息失败,使用默认值:', err.message);
  }

  return result;
};

const reverseDnsLookup = (ipAddr) => {
  return new Promise((resolve) => {
    try {
      dns.reverse(ipAddr, (err, hostnames) => {
        if (err || !hostnames || hostnames.length === 0) {
          resolve(null);
        } else {
          resolve(hostnames[0]);
        }
      });
    } catch (err) {
      resolve(null);
    }
  });
};

const detectDeviceInfo = async (ipAddr, macAddr) => {
  const result = {
    ip: ipAddr,
    mac: macAddr || null,
    name: null,
    hostname: null,
    vendor: 'Unknown Vendor',
    os: 'Unknown',
    device_type: 'unknown',
    ttl: null,
    isOnline: true,
    lastSeen: Date.now()
  };

  if (macAddr) {
    result.vendor = getVendorFromMac(macAddr);
  }

  try {
    const pingRes = await ping.promise.probe(ipAddr, { timeout: 1 });
    result.isOnline = pingRes.alive;
    if (pingRes.alive) {
      result.ttl = pingRes.time ? parseInt(pingRes.time) : null;
      if (pingRes.time !== undefined) {
        result.ttl = Math.round(255 - pingRes.time * 0.1);
      }
      result.lastSeen = Date.now();
    }
  } catch (err) {
    result.isOnline = false;
  }

  try {
    const hostname = await reverseDnsLookup(ipAddr);
    if (hostname) {
      result.hostname = hostname;
      result.name = hostname;
    }
  } catch (err) {
  }

  result.os = detectOSByTTL(result.ttl, result.vendor, result.hostname);

  result.device_type = inferDeviceType(result.vendor, result.os, result.hostname, macAddr, ipAddr);

  if (!result.name && result.vendor !== 'Unknown Vendor') {
    const vendorShorthand = result.vendor.split(' ')[0].toLowerCase();
    const typeLabel = result.device_type !== 'unknown' ? result.device_type : 'device';
    const ipSuffix = ipAddr.split('.').slice(-2).join('-');
    result.name = `${vendorShorthand}-${typeLabel}-${ipSuffix}`;
  }

  if (!result.name) {
    const typeLabel = result.device_type !== 'unknown' ? result.device_type : 'device';
    result.name = `${typeLabel}-${ipAddr.split('.').slice(-2).join('-')}`;
  }

  return result;
};

const normalizeMac = (mac) => {
  if (!mac) return null;
  const cleaned = mac.replace(/-/g, ':').replace(/\s/g, '');
  const parts = cleaned.split(':');
  const padded = parts.map((p) => p.padStart(2, '0'));
  return padded.join(':').toUpperCase();
};

const parseArpSystemOutput = (output) => {
  const devices = [];
  if (!output) return devices;

  const lines = output.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    let ipMatch = null;
    let macMatch = null;

    const macOsPattern = /\((\d+\.\d+\.\d+\.\d+)\)\s+at\s+([0-9a-fA-F:]+)/;
    macMatch = trimmed.match(macOsPattern);
    if (macMatch) {
      ipMatch = { ip: macMatch[1], mac: normalizeMac(macMatch[2]) };
    }

    if (!ipMatch) {
      const linuxPattern = /^(\d+\.\d+\.\d+\.\d+)\s+ether\s+([0-9a-fA-F:]+)/;
      macMatch = trimmed.match(linuxPattern);
      if (macMatch) {
        ipMatch = { ip: macMatch[1], mac: normalizeMac(macMatch[2]) };
      }
    }

    if (!ipMatch) {
      const winPattern = /^\s*(\d+\.\d+\.\d+\.\d+)\s+([0-9a-fA-F-]+)/;
      macMatch = trimmed.match(winPattern);
      if (macMatch) {
        ipMatch = { ip: macMatch[1], mac: normalizeMac(macMatch[2]) };
      }
    }

    if (ipMatch && ipMatch.ip && ipMatch.mac) {
      const mac = ipMatch.mac;
      if (mac !== 'FF:FF:FF:FF:FF:FF' &&
          mac !== '00:00:00:00:00:00' &&
          !mac.startsWith('01:00:5E') &&
          !mac.startsWith('33:33')) {
        devices.push({
          ip: ipMatch.ip,
          mac,
          vendor: getVendorFromMac(mac)
        });
      }
    }
  }

  const seen = new Set();
  return devices.filter((d) => {
    if (seen.has(d.ip)) return false;
    seen.add(d.ip);
    return true;
  });
};

const parseArpOutput = () => {
  return new Promise((resolve) => {
    const devices = [];

    const cmd = process.platform === 'win32' ? 'arp -a' : 'arp -an';
    exec(cmd, { timeout: 5000 }, (err, stdout) => {
      if (!err && stdout) {
        const parsed = parseArpSystemOutput(stdout);
        if (parsed && parsed.length > 0) {
          resolve(parsed);
          return;
        }
      }

      if (process.platform !== 'win32') {
        exec('cat /proc/net/arp 2>/dev/null', { timeout: 3000 }, (err2, stdout2) => {
          if (!err2 && stdout2) {
            const parsed = parseArpSystemOutput(stdout2);
            resolve(parsed);
          } else {
            resolve([]);
          }
        });
      } else {
        resolve([]);
      }
    });
  });
};

const scanIpRange = async (startIp, endIp, onProgress) => {
  const start = ipToLong(startIp);
  const end = ipToLong(endIp);
  const total = end - start + 1;
  const results = [];
  let completed = 0;

  const pingPromises = [];
  const batchSize = 50;

  for (let i = start; i <= end; i++) {
    const currentIp = longToIp(i);
    const idx = i;
    pingPromises.push({
      ip: currentIp,
      promise: ping.promise.probe(currentIp, { timeout: 0.8 }).then((res) => ({
        ip: currentIp,
        alive: res.alive,
        ttl: res.time ? Math.round(255 - res.time * 0.1) : null
      }))
    });
  }

  for (let batchStart = 0; batchStart < pingPromises.length; batchStart += batchSize) {
    const batch = pingPromises.slice(batchStart, batchStart + batchSize);
    const batchResults = await Promise.all(batch.map((p) => p.promise));

    for (const res of batchResults) {
      if (res.alive) {
        results.push(res);
      }
    }

    completed = Math.min(batchStart + batchSize, pingPromises.length);
    if (typeof onProgress === 'function') {
      try {
        onProgress(Math.round((completed / total) * 100), completed, total, results.length);
      } catch (e) {}
    }
  }

  const arpDevices = await parseArpOutput();
  const mergedMap = new Map();

  arpDevices.forEach((d) => {
    mergedMap.set(d.ip, { ...d });
  });

  results.forEach((r) => {
    const existing = mergedMap.get(r.ip) || {};
    mergedMap.set(r.ip, {
      ip: r.ip,
      mac: existing.mac || null,
      vendor: existing.vendor || 'Unknown Vendor',
      ttl: r.ttl || null,
      isOnline: true
    });
  });

  const finalResults = [];
  for (const device of mergedMap.values()) {
    const detailed = await detectDeviceInfo(device.ip, device.mac);
    finalResults.push({
      id: uuidv4(),
      ...detailed,
      vendor: device.vendor || detailed.vendor,
      mac: device.mac || detailed.mac,
      scannedAt: Date.now()
    });
  }

  if (typeof onProgress === 'function') {
    try {
      onProgress(100, total, total, finalResults.length);
    } catch (e) {}
  }

  return finalResults;
};

const scanLocalNetwork = async () => {
  const networkInfo = getLocalNetworkInfo();
  const startIp = networkInfo.network.replace(/\.\d+$/, '.1');
  const endIp = networkInfo.network.replace(/\.\d+$/, '.254');

  console.log(`[deviceScanner] 开始扫描: ${networkInfo.cidr}`);

  try {
    let devices = [];

    try {
      if (process.platform === 'darwin' || process.platform === 'linux') {
        await new Promise((resolve) => {
          const cmd = process.platform === 'darwin'
            ? `arp-scan --localnet 2>/dev/null || true`
            : `sudo -n arp-scan --localnet 2>/dev/null || true`;
          exec(cmd, { timeout: 15000 }, () => resolve());
        });
      }
    } catch (err) {
    }

    const arpDevices = await parseArpOutput();
    const detectedIps = new Set(arpDevices.map((d) => d.ip));

    const rangeResult = await scanIpRange(startIp, endIp, (progress, done, total, found) => {
      process.stdout.write(`\r[deviceScanner] 扫描进度: ${progress}% (${done}/${total}, 发现${found}台)`);
    });
    console.log('');

    const combinedMap = new Map();

    arpDevices.forEach((d) => {
      combinedMap.set(d.ip, { ...d });
    });

    rangeResult.forEach((r) => {
      const existing = combinedMap.get(r.ip) || {};
      combinedMap.set(r.ip, { ...existing, ...r, isOnline: true });
    });

    for (const ipAddr of detectedIps) {
      if (!combinedMap.has(ipAddr)) {
        const arpEntry = arpDevices.find((d) => d.ip === ipAddr);
        if (arpEntry) {
          combinedMap.set(ipAddr, { ...arpEntry, isOnline: true, ttl: null });
        }
      }
    }

    const finalDevices = [];
    for (const [ipAddr, deviceData] of combinedMap.entries()) {
      const info = await detectDeviceInfo(ipAddr, deviceData.mac);
      finalDevices.push({
        id: uuidv4(),
        ...info,
        vendor: deviceData.vendor || info.vendor,
        mac: deviceData.mac || info.mac,
        ttl: deviceData.ttl || info.ttl,
        isOnline: deviceData.isOnline !== false,
        scannedAt: Date.now()
      });
    }

    const gatewayInfo = await detectDeviceInfo(networkInfo.gateway, null);
    if (!finalDevices.find((d) => d.ip === networkInfo.gateway)) {
      finalDevices.push({
        id: uuidv4(),
        ...gatewayInfo,
        name: 'Router-' + networkInfo.gateway.split('.').slice(-1)[0],
        vendor: gatewayInfo.vendor,
        isRouter: true,
        isGateway: true,
        isOnline: true,
        scannedAt: Date.now()
      });
    } else {
      const existingGw = finalDevices.find((d) => d.ip === networkInfo.gateway);
      existingGw.isRouter = true;
      existingGw.isGateway = true;
      existingGw.name = existingGw.name || 'Gateway-Router';
    }

    finalDevices.sort((a, b) => {
      if (a.isGateway && !b.isGateway) return -1;
      if (!a.isGateway && b.isGateway) return 1;
      return ipToLong(a.ip) - ipToLong(b.ip);
    });

    console.log(`[deviceScanner] 扫描完成,共发现 ${finalDevices.length} 台设备`);
    return {
      networkInfo,
      devices: finalDevices,
      scannedAt: Date.now(),
      duration: 0
    };
  } catch (err) {
    console.error('[deviceScanner] 扫描失败:', err.message);
    return {
      networkInfo: getLocalNetworkInfo(),
      devices: [],
      scannedAt: Date.now(),
      duration: 0,
      error: err.message
    };
  }
};

const mockScan = () => {
  const networkInfo = getLocalNetworkInfo();
  const baseIp = networkInfo.network.replace(/\.\d+$/, '');
  const startTime = Date.now();

  const mockDevicesData = [
    { lastOctet: 1, name: 'TP-Link-AC1200', mac: '90:72:40:12:34:56', vendor: 'TP-Link Technologies', isRouter: true, isGateway: true, type: 'router', category: 'networking', os: 'Router OS', trafficProfile: 'high' },
    { lastOctet: 2, name: 'MacBook-Pro', mac: 'F4:5C:89:AA:BB:01', vendor: 'Apple Inc.', type: 'laptop', category: 'computer', os: 'macOS', trafficProfile: 'heavy' },
    { lastOctet: 3, name: 'iPhone-15-Pro', mac: '00:1A:2B:CC:DD:02', vendor: 'Apple Inc.', type: 'smartphone', category: 'mobile', os: 'iOS', trafficProfile: 'medium' },
    { lastOctet: 4, name: 'iPad-Air', mac: '04:15:52:EE:FF:03', vendor: 'Apple Inc.', type: 'tablet', category: 'mobile', os: 'iOS', trafficProfile: 'medium' },
    { lastOctet: 5, name: 'Xiaomi-Mi-14', mac: '68:DB:CA:11:22:04', vendor: 'Xiaomi Communications', type: 'smartphone', category: 'mobile', os: 'Android', trafficProfile: 'medium' },
    { lastOctet: 6, name: 'Samsung-Galaxy', mac: '50:32:37:33:44:05', vendor: 'Samsung Electronics', type: 'smartphone', category: 'mobile', os: 'Android', trafficProfile: 'medium' },
    { lastOctet: 7, name: 'Windows-PC', mac: '80:91:33:55:66:06', vendor: 'Intel Corporation', type: 'desktop', category: 'computer', os: 'Windows', trafficProfile: 'heavy' },
    { lastOctet: 8, name: 'Smart-TV-Sony', mac: 'F0:99:BF:77:88:07', vendor: 'Sony Corporation', type: 'smarttv', category: 'entertainment', os: 'Android TV', trafficProfile: 'streaming' },
    { lastOctet: 10, name: 'Apple-TV-4K', mac: 'C8:69:CD:99:AA:08', vendor: 'Apple Inc.', type: 'tvbox', category: 'entertainment', os: 'tvOS', trafficProfile: 'streaming' },
    { lastOctet: 11, name: 'Chromecast', mac: '64:20:0C:BB:CC:09', vendor: 'Google Inc.', type: 'tvbox', category: 'entertainment', os: 'Chromecast', trafficProfile: 'streaming' },
    { lastOctet: 20, name: 'PS5', mac: '40:33:1A:DD:EE:10', vendor: 'Sony Interactive', type: 'console', category: 'entertainment', os: 'PS5 OS', trafficProfile: 'gaming' },
    { lastOctet: 21, name: 'Switch', mac: '8C:85:90:FF:00:11', vendor: 'Nintendo Co.', type: 'console', category: 'entertainment', os: 'Switch OS', trafficProfile: 'gaming' },
    { lastOctet: 30, name: 'Echo-Dot', mac: '44:00:10:11:22:12', vendor: 'Amazon Technologies', type: 'smartspeaker', category: 'iot', os: 'Alexa', trafficProfile: 'low' },
    { lastOctet: 31, name: 'HomePod-Mini', mac: '98:01:A7:33:44:13', vendor: 'Apple Inc.', type: 'smartspeaker', category: 'iot', os: 'HomePod OS', trafficProfile: 'low' },
    { lastOctet: 40, name: 'Xiaomi-AC', mac: '78:31:C1:55:66:14', vendor: 'Xiaomi Communications', type: 'climate', category: 'iot', os: 'Mi Home', trafficProfile: 'low' },
    { lastOctet: 41, name: 'Smart-Bulb', mac: '84:38:35:77:88:15', vendor: 'Philips', type: 'light', category: 'iot', os: 'Hue', trafficProfile: 'tiny' },
    { lastOctet: 42, name: 'Smart-Plug', mac: '88:66:5A:99:AA:16', vendor: 'TP-Link Technologies', type: 'plug', category: 'iot', os: 'Kasa', trafficProfile: 'tiny' },
    { lastOctet: 50, name: 'Smart-Lock', mac: '9C:20:7B:BB:CC:17', vendor: 'August', type: 'security', category: 'iot', os: 'Embedded', trafficProfile: 'tiny' },
    { lastOctet: 60, name: 'Security-Camera', mac: 'A8:5C:2C:DD:EE:18', vendor: 'TP-Link Technologies', type: 'camera', category: 'iot', os: 'Tapo', trafficProfile: 'cctv' },
    { lastOctet: 61, name: 'Doorbell-Cam', mac: 'B4:4B:D6:FF:00:19', vendor: 'Ring', type: 'camera', category: 'iot', os: 'Embedded', trafficProfile: 'cctv' },
    { lastOctet: 70, name: 'Raspberry-Pi', mac: 'DC:A6:32:11:22:20', vendor: 'Raspberry Pi Foundation', type: 'sbc', category: 'computer', os: 'Raspberry Pi OS', trafficProfile: 'low' },
    { lastOctet: 80, name: 'NAS-Server', mac: '00:25:00:33:44:21', vendor: 'Synology', type: 'nas', category: 'storage', os: 'DSM', trafficProfile: 'heavy' },
    { lastOctet: 90, name: 'HP-Printer', mac: 'AC:3C:0A:55:66:22', vendor: 'HP Inc.', type: 'printer', category: 'peripheral', os: 'Embedded', trafficProfile: 'tiny' },
    { lastOctet: 100, name: 'Unknown-Device', mac: '00:11:22:AA:BB:CC', vendor: 'Unknown Vendor', type: 'unknown', category: 'other', os: 'Unknown', trafficProfile: 'low' }
  ];

  const devices = mockDevicesData.map((d) => {
    const ipAddr = baseIp + '.' + d.lastOctet;
    const onlineChance = {
      router: 1.0,
      nas: 0.98,
      camera: 0.98,
      cctv: 0.98,
      tvbox: 0.7,
      smarttv: 0.6,
      smartspeaker: 0.95,
      laptop: 0.8,
      desktop: 0.75,
      smartphone: 0.85,
      tablet: 0.7,
      console: 0.4,
      climate: 0.9,
      light: 0.95,
      plug: 0.92,
      security: 0.95,
      sbc: 0.9,
      printer: 0.8,
      unknown: 0.5
    };
    const chance = onlineChance[d.type] || 0.7;
    const isOnline = Math.random() < chance;

    return {
      id: uuidv4(),
      ip: ipAddr,
      mac: d.mac,
      name: d.name,
      vendor: d.vendor,
      os: d.os,
      ttl: isOnline ? (d.type === 'router' ? 252 : d.os.includes('Windows') ? 68 : d.os.includes('macOS') || d.os.includes('iOS') || d.os.includes('tvOS') ? 128 : 64) : null,
      type: d.type,
      category: d.category,
      trafficProfile: d.trafficProfile,
      isRouter: d.isRouter || false,
      isGateway: d.isGateway || false,
      isOnline,
      lastSeen: isOnline ? Date.now() : Date.now() - Math.floor(Math.random() * 86400000),
      scannedAt: Date.now()
    };
  });

  devices.sort((a, b) => {
    if (a.isGateway && !b.isGateway) return -1;
    if (!a.isGateway && b.isGateway) return 1;
    return ipToLong(a.ip) - ipToLong(b.ip);
  });

  return {
    networkInfo,
    devices,
    scannedAt: Date.now(),
    duration: Date.now() - startTime,
    isMock: true
  };
};

module.exports = {
  scanLocalNetwork,
  scanIpRange,
  getLocalNetworkInfo,
  parseArpOutput,
  detectDeviceInfo,
  getVendorFromMac,
  detectOSByTTL,
  inferDeviceType,
  ipToLong,
  longToIp
};
