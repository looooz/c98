export const DEVICE_TYPES = {
  phone: { label: '手机', color: '#409EFF', icon: '📱' },
  computer: { label: '电脑', color: '#67C23A', icon: '💻' },
  tablet: { label: '平板', color: '#E6A23C', icon: '📲' },
  tv: { label: '电视', color: '#F56C6C', icon: '📺' },
  smart_home: { label: '智能家居', color: '#909399', icon: '🏠' },
  console: { label: '游戏机', color: '#8E44AD', icon: '🎮' },
  camera: { label: '摄像头', color: '#16A085', icon: '📷' },
  router: { label: '路由器', color: '#2C3E50', icon: '📡' },
  unknown: { label: '未知', color: '#BDC3C7', icon: '❓' }
}

export const VENDOR_LOGOS = {
  apple: '🍎',
  iphone: '📱',
  macbook: '💻',
  imac: '🖥️',
  samsung: '📱',
  huawei: '📱',
  honor: '📱',
  xiaomi: '📱',
  mi: '📱',
  oppo: '📱',
  vivo: '📱',
  oneplus: '📱',
  motorola: '📱',
  lenovo: '💻',
  dell: '💻',
  hp: '💻',
  hewlett: '💻',
  asus: '💻',
  acer: '💻',
  msi: '💻',
  gigabyte: '💻',
  microsoft: '💻',
  surface: '💻',
  google: '📱',
  pixel: '📱',
  sony: '📺',
  playstation: '🎮',
  lg: '📺',
  tcl: '📺',
  hisense: '📺',
  skyworth: '📺',
  changhong: '📺',
  konka: '📺',
  philips: '💡',
  signify: '💡',
  'philips hue': '💡',
  tplink: '📡',
  'tp-link': '📡',
  netgear: '📡',
  dlink: '📡',
  'd-link': '📡',
  cisco: '📡',
  meraki: '📡',
  juniper: '📡',
  fortinet: '📡',
  ubiquiti: '📡',
  belkin: '📡',
  buffalo: '📡',
  nintendo: '🎮',
  switch: '🎮',
  xbox: '🎮',
  hikvision: '📷',
  dahua: '📷',
  axis: '📷',
  canon: '🖨️',
  epson: '🖨️',
  brother: '🖨️',
  'raspberry pi': '🍓',
  raspberry: '🍓',
  realtek: '🔌',
  intel: '💻',
  nvidia: '🎮',
  qualcomm: '📡',
  mediatek: '📱',
  amazon: '🔊',
  echo: '🔊',
  alexa: '🔊',
  meta: '📱',
  facebook: '📱',
  tesla: '🚗',
  bose: '🎧',
  sennheiser: '🎧',
  garmin: '⌚',
  fitbit: '⌚',
  gopro: '📷',
  roku: '📺',
  chromecast: '📺',
  'amazon technologies': '🔊',
  'sony interactive': '🎮',
  'ubiquiti networks': '📡',
  'sichuan changhong': '📺',
  'tcl multimedia': '📺',
  'dahua technology': '📷',
  'hikvision digital': '📷',
  'xiaomi communications': '📱',
  'huawei technologies': '📱',
  'honor device': '📱',
  'oppo electronics': '📱',
  'vivo mobile': '📱',
  'samsung electronics': '📱',
  'oneplus technology': '📱',
  'motorola mobility': '📱',
  'realtek semiconductor': '🔌',
  'hewlett-packard': '💻',
  'asustek computer': '💻',
  'micro-star international': '💻',
  'control4': '🏠',
  'crestron electronics': '🏠',
  'default': '📶'
}

export function formatBytes(bytes, decimals = 2) {
  if (bytes === 0 || bytes === null || bytes === undefined) return '0 B'
  if (isNaN(bytes)) return '0 B'

  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']

  const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k))
  const sizeIndex = Math.min(i, sizes.length - 1)

  return parseFloat((bytes / Math.pow(k, sizeIndex)).toFixed(dm)) + ' ' + sizes[sizeIndex]
}

export function formatSpeed(bytesPerSec, decimals = 2) {
  if (!bytesPerSec || bytesPerSec <= 0) return '0 B/s'
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s', 'TB/s']

  const i = Math.floor(Math.log(bytesPerSec) / Math.log(k))
  const sizeIndex = Math.min(i, sizes.length - 1)

  return parseFloat((bytesPerSec / Math.pow(k, sizeIndex)).toFixed(dm)) + ' ' + sizes[sizeIndex]
}

export function formatDuration(seconds) {
  if (!seconds || seconds <= 0) return '0秒'
  if (isNaN(seconds)) return '0秒'

  const sec = Math.floor(seconds)
  const days = Math.floor(sec / 86400)
  const hours = Math.floor((sec % 86400) / 3600)
  const minutes = Math.floor((sec % 3600) / 60)
  const secs = sec % 60

  const parts = []
  if (days > 0) parts.push(`${days}天`)
  if (hours > 0) parts.push(`${hours}小时`)
  if (minutes > 0) parts.push(`${minutes}分`)
  if (secs > 0 || parts.length === 0) parts.push(`${secs}秒`)

  return parts.join('')
}

export function formatDateTime(timestamp) {
  if (!timestamp) return '-'

  let date
  if (typeof timestamp === 'number') {
    date = new Date(timestamp.toString().length === 10 ? timestamp * 1000 : timestamp)
  } else if (timestamp instanceof Date) {
    date = timestamp
  } else {
    date = new Date(timestamp)
  }

  if (isNaN(date.getTime())) return '-'

  const pad = (n) => n.toString().padStart(2, '0')

  const y = date.getFullYear()
  const m = pad(date.getMonth() + 1)
  const d = pad(date.getDate())
  const hh = pad(date.getHours())
  const mm = pad(date.getMinutes())
  const ss = pad(date.getSeconds())

  return `${y}-${m}-${d} ${hh}:${mm}:${ss}`
}

export function formatDate(timestamp) {
  if (!timestamp) return '-'
  const dateTime = formatDateTime(timestamp)
  return dateTime !== '-' ? dateTime.split(' ')[0] : '-'
}

export function formatTime(timestamp) {
  if (!timestamp) return '-'
  const dateTime = formatDateTime(timestamp)
  return dateTime !== '-' ? dateTime.split(' ')[1] : '-'
}

export function formatMac(mac) {
  if (!mac) return '-'
  const clean = mac.replace(/[^0-9A-Fa-f]/g, '').toUpperCase()
  if (clean.length !== 12) return mac
  return clean.match(/.{1,2}/g).join(':')
}

export function formatIp(ip) {
  return ip || '-'
}

export function getDeviceTypeLabel(type) {
  if (!type) return DEVICE_TYPES.unknown.label
  return DEVICE_TYPES[type]?.label || DEVICE_TYPES.unknown.label
}

export function getDeviceTypeColor(type) {
  if (!type) return DEVICE_TYPES.unknown.color
  return DEVICE_TYPES[type]?.color || DEVICE_TYPES.unknown.color
}

export function getDeviceIcon(type) {
  if (!type) return DEVICE_TYPES.unknown.icon
  return DEVICE_TYPES[type]?.icon || DEVICE_TYPES.unknown.icon
}

export function getDeviceTypeTagType(type) {
  const typeMap = {
    phone: 'primary',
    computer: 'success',
    tablet: 'warning',
    tv: 'danger',
    smart_home: 'info',
    console: 'warning',
    camera: 'success',
    router: '',
    unknown: 'info'
  }
  return typeMap[type] || 'info'
}

export function getVendorLogo(vendor) {
  if (!vendor) return VENDOR_LOGOS.default

  const vendorLower = vendor.toLowerCase()
  for (const [key, logo] of Object.entries(VENDOR_LOGOS)) {
    if (vendorLower.includes(key)) {
      return logo
    }
  }
  return VENDOR_LOGOS.default
}

export function getDeviceTypeList() {
  return Object.entries(DEVICE_TYPES).map(([key, value]) => ({
    value: key,
    label: value.label,
    color: value.color,
    icon: value.icon
  }))
}

export function formatPercent(value, decimals = 1) {
  if (value === null || value === undefined || isNaN(value)) return '-'
  return `${(value * 100).toFixed(decimals)}%`
}

export function formatNumber(value, decimals = 2) {
  if (value === null || value === undefined || isNaN(value)) return '-'
  const num = Number(value)
  if (Math.abs(num) >= 1e9) return (num / 1e9).toFixed(decimals) + 'B'
  if (Math.abs(num) >= 1e6) return (num / 1e6).toFixed(decimals) + 'M'
  if (Math.abs(num) >= 1e3) return (num / 1e3).toFixed(decimals) + 'K'
  return num.toFixed(decimals)
}

export function truncate(str, maxLength = 20, suffix = '...') {
  if (!str) return ''
  if (str.length <= maxLength) return str
  return str.slice(0, maxLength) + suffix
}

export function relativeTime(timestamp) {
  if (!timestamp) return '-'
  const time = typeof timestamp === 'number'
    ? (timestamp.toString().length === 10 ? timestamp * 1000 : timestamp)
    : new Date(timestamp).getTime()

  const diff = Date.now() - time
  const abs = Math.abs(diff)

  const sec = Math.floor(abs / 1000)
  if (sec < 60) return diff >= 0 ? `${sec}秒前` : `${sec}秒后`

  const min = Math.floor(sec / 60)
  if (min < 60) return diff >= 0 ? `${min}分钟前` : `${min}分钟后`

  const hour = Math.floor(min / 60)
  if (hour < 24) return diff >= 0 ? `${hour}小时前` : `${hour}小时后`

  const day = Math.floor(hour / 24)
  if (day < 30) return diff >= 0 ? `${day}天前` : `${day}天后`

  const month = Math.floor(day / 30)
  if (month < 12) return diff >= 0 ? `${month}个月前` : `${month}个月后`

  const year = Math.floor(month / 12)
  return diff >= 0 ? `${year}年前` : `${year}年后`
}

export default {
  DEVICE_TYPES,
  VENDOR_LOGOS,
  formatBytes,
  formatSpeed,
  formatDuration,
  formatDateTime,
  formatDate,
  formatTime,
  formatMac,
  formatIp,
  getDeviceTypeLabel,
  getDeviceTypeColor,
  getDeviceIcon,
  getDeviceTypeTagType,
  getVendorLogo,
  getDeviceTypeList,
  formatPercent,
  formatNumber,
  truncate,
  relativeTime
}
