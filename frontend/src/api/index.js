import axios from 'axios'
import { ElMessage } from 'element-plus'

const service = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
})

service.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`
    }
    return config
  },
  error => {
    console.error('Request error:', error)
    return Promise.reject(error)
  }
)

service.interceptors.response.use(
  response => {
    const res = response.data
    if (res.code !== undefined && res.code !== 0 && res.code !== 200) {
      ElMessage.error(res.message || '请求失败')
      return Promise.reject(new Error(res.message || 'Error'))
    }
    return res
  },
  error => {
    console.error('Response error:', error)
    if (error.response) {
      const { status, data } = error.response
      switch (status) {
        case 401:
          ElMessage.error('未授权，请重新登录')
          localStorage.removeItem('token')
          break
        case 403:
          ElMessage.error('没有权限访问')
          break
        case 404:
          ElMessage.error('请求资源不存在')
          break
        case 500:
          ElMessage.error('服务器内部错误')
          break
        default:
          ElMessage.error(data?.message || `请求错误: ${status}`)
      }
    } else if (error.message.includes('timeout')) {
      ElMessage.error('请求超时，请稍后重试')
    } else {
      ElMessage.error('网络错误，请检查网络连接')
    }
    return Promise.reject(error)
  }
)

export const devices = {
  getList: (params) => service.get('/devices', { params }),
  getById: (id) => service.get(`/devices/${id}`),
  scan: () => service.post('/devices/scan'),
  block: (id) => service.post(`/devices/${id}/block`),
  unblock: (id) => service.post(`/devices/${id}/unblock`),
  setName: (id, name) => service.put(`/devices/${id}/name`, { name }),
  setType: (id, type) => service.put(`/devices/${id}/type`, { type }),
  setGroup: (id, groupId) => service.put(`/devices/${id}/group`, { groupId }),
  getGroups: () => service.get('/device-groups'),
  createGroup: (data) => service.post('/device-groups', data),
  deleteGroup: (id) => service.delete(`/device-groups/${id}`)
}

export const traffic = {
  getRealtime: (params) => service.get('/traffic/realtime', { params }),
  getRealtimeByDevice: (deviceId) => service.get(`/traffic/realtime/${deviceId}`),
  getHistoryByDevice: (deviceId, params) => service.get(`/traffic/history/${deviceId}`, { params }),
  getStats: (params) => service.get('/traffic/stats', { params }),
  getRankings: (params) => service.get('/traffic/rankings', { params }),
  getTrend: (params) => service.get('/traffic/trend', { params })
}

export const history = {
  getList: (params) => service.get('/history', { params }),
  getTimeline: (deviceId, params) => service.get(`/history/timeline/${deviceId}`, { params }),
  getDaily: (deviceId, params) => service.get(`/history/daily/${deviceId}`, { params }),
  getDevices: (params) => service.get('/history/devices', { params })
}

export const parental = {
  getRules: () => service.get('/parental/rules'),
  createRule: (data) => service.post('/parental/rules', data),
  updateRule: (id, data) => service.put(`/parental/rules/${id}`, data),
  deleteRule: (id) => service.delete(`/parental/rules/${id}`),
  toggleRule: (id, enabled) => service.put(`/parental/rules/${id}/toggle`, { enabled }),
  getDevices: () => service.get('/parental/devices'),
  assignDevice: (ruleId, deviceIds) => service.post(`/parental/rules/${ruleId}/devices`, { deviceIds })
}

export const diagnostic = {
  ping: (host) => service.post('/diagnostic/ping', { host }),
  traceroute: (host) => service.post('/diagnostic/traceroute', { host }),
  dnsLookup: (domain) => service.post('/diagnostic/dns', { domain }),
  portScan: (host, ports) => service.post('/diagnostic/portscan', { host, ports }),
  speedTest: () => service.post('/diagnostic/speedtest'),
  getNetworkStatus: () => service.get('/diagnostic/network'),
  restartService: () => service.post('/diagnostic/restart')
}

export const statistics = {
  getOverview: (params) => service.get('/statistics/overview', { params }),
  getDevicesByType: (params) => service.get('/statistics/devices/by-type', { params }),
  getDevicesByGroup: (params) => service.get('/statistics/devices/by-group', { params }),
  getOnlineTrend: (params) => service.get('/statistics/devices/online-trend', { params }),
  getNewTrend: (params) => service.get('/statistics/devices/new-trend', { params }),
  getTrafficTop: (params) => service.get('/statistics/traffic/top', { params }),
  getMonthlyReport: (params) => service.get('/statistics/monthly-report', { params }),
  exportReport: (type, params) => service.get(`/statistics/export/${type}`, { params, responseType: 'blob' })
}

export const alerts = {
  getList: (params) => service.get('/alerts', { params }),
  getById: (id) => service.get(`/alerts/${id}`),
  markRead: (id) => service.put(`/alerts/${id}/read`),
  markAllRead: () => service.put('/alerts/read-all'),
  delete: (id) => service.delete(`/alerts/${id}`),
  deleteAll: () => service.delete('/alerts'),
  getUnreadCount: () => service.get('/alerts/unread-count'),
  getSettings: () => service.get('/alerts/settings'),
  updateSettings: (data) => service.put('/alerts/settings', data)
}

export default {
  devices,
  traffic,
  history,
  parental,
  diagnostic,
  statistics,
  alerts
}
