import { useAppStore } from '@/stores/app'
import { ElMessage } from 'element-plus'

class WebSocketManager {
  constructor() {
    this.ws = null
    this.url = ''
    this.eventListeners = {}
    this.heartbeatInterval = null
    this.reconnectAttempts = 0
    this.maxReconnectAttempts = 10
    this.reconnectDelay = 2000
    this.autoReconnect = true
    this.connected = false
    this.manuallyClosed = false
  }

  _getDefaultUrl() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.hostname
    const port = window.location.port === '5098' ? '3099' : (window.location.port || '3099')
    return `${protocol}//${host}:${port}`
  }

  connect(url) {
    if (url) {
      this.url = url
    } else {
      this.url = this._getDefaultUrl()
    }

    if (this.ws && this.connected) {
      console.log('[WS] 已经连接')
      return this
    }

    this.manuallyClosed = false

    try {
      this.ws = new WebSocket(this.url)
    } catch (e) {
      console.error('[WS] 创建连接失败:', e)
      this._scheduleReconnect()
      return this
    }

    this.ws.onopen = () => {
      this.connected = true
      this.reconnectAttempts = 0
      this._updateStore(true)
      this._startHeartbeat()
      this._emit('ws:connected', {})
      console.log('[WS] 连接成功:', this.url)
    }

    this.ws.onclose = (event) => {
      this.connected = false
      this._updateStore(false)
      this._stopHeartbeat()
      this._emit('ws:disconnected', { reason: event.reason, code: event.code })
      console.log('[WS] 连接关闭:', event.code, event.reason)

      if (this.autoReconnect && !this.manuallyClosed) {
        this._scheduleReconnect()
      }
    }

    this.ws.onerror = (error) => {
      this._emit('ws:error', { error })
      console.error('[WS] 连接错误:', error)
    }

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data)
        const { type, data, timestamp } = msg

        if (type === 'pong') {
          this._emit('ws:pong', { timestamp })
          return
        }

        if (type === 'connected') {
          this._emit('ws:hello', data)
          return
        }

        if (type === 'alert' || type === 'alert:new') {
          this._handleNewAlert(data)
        }

        this._emit(type, data)
        this._emit('*', { type, data, timestamp })
      } catch (e) {
        console.error('[WS] 解析消息失败:', e, event.data)
      }
    }

    return this
  }

  disconnect() {
    this.autoReconnect = false
    this.manuallyClosed = true
    this._stopHeartbeat()
    if (this.ws) {
      try {
        this.ws.close(1000, 'manual close')
      } catch (e) {}
      this.ws = null
    }
    this.connected = false
    this._updateStore(false)
    console.log('[WS] 手动断开连接')
    return this
  }

  reconnect() {
    if (this.ws) {
      try {
        this.ws.close()
      } catch (e) {}
      this.ws = null
    }
    this.autoReconnect = true
    this.manuallyClosed = false
    this.reconnectAttempts = 0
    setTimeout(() => {
      this.connect()
    }, 500)
    return this
  }

  on(event, callback) {
    if (!this.eventListeners[event]) {
      this.eventListeners[event] = []
    }
    this.eventListeners[event].push(callback)
    return () => this.off(event, callback)
  }

  off(event, callback) {
    if (!this.eventListeners[event]) return this
    if (callback) {
      this.eventListeners[event] = this.eventListeners[event].filter(
        cb => cb !== callback
      )
    } else {
      delete this.eventListeners[event]
    }
    return this
  }

  emit(type, data) {
    if (!this.ws || !this.connected) {
      console.warn('[WS] 未连接，无法发送:', type)
      return false
    }
    try {
      this.ws.send(JSON.stringify({ type, data }))
      return true
    } catch (e) {
      console.error('[WS] 发送失败:', e)
      return false
    }
  }

  _emit(event, ...args) {
    const listeners = this.eventListeners[event]
    if (listeners) {
      [...listeners].forEach(callback => {
        try {
          callback(...args)
        } catch (e) {
          console.error(`[WS] 事件处理错误 ${event}:`, e)
        }
      })
    }
  }

  _handleNewAlert(alert) {
    try {
      const appStore = useAppStore()
      appStore.incrementUnreadAlerts()
      if (alert?.level === 'critical' || alert?.level === 'error') {
        ElMessage.error({
          message: alert.message || '紧急告警通知',
          duration: 8000,
          showClose: true
        })
      } else if (alert?.level === 'warning' || alert?.level === 'high') {
        ElMessage.warning({
          message: alert.message || '新的告警通知',
          duration: 6000,
          showClose: true
        })
      } else if (alert?.level === 'info' || alert?.level === 'success') {
        ElMessage.success({
          message: alert.message || '通知',
          duration: 4000,
          showClose: true
        })
      }
    } catch (e) {}
  }

  _updateStore(connected) {
    try {
      const appStore = useAppStore()
      appStore.setWsConnected(connected)
    } catch (e) {}
  }

  _startHeartbeat() {
    this._stopHeartbeat()
    this.heartbeatInterval = setInterval(() => {
      if (this.connected && this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.emit('ping', { timestamp: Date.now() })
      }
    }, 30000)
  }

  _stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }
  }

  _scheduleReconnect() {
    if (this.manuallyClosed) return
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[WS] 重连次数达到上限')
      try {
        ElMessage.error('WebSocket 重连次数过多，请刷新页面重试')
      } catch (e) {}
      return
    }

    this.reconnectAttempts++
    const delay = this.reconnectDelay * Math.min(this.reconnectAttempts, 5)

    console.log(`[WS] ${delay}ms 后重连... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`)

    setTimeout(() => {
      if (this.autoReconnect && !this.connected && !this.manuallyClosed) {
        this.connect()
      }
    }, delay)
  }

  isConnected() {
    return this.connected
  }

  getReadyState() {
    return this.ws?.readyState ?? WebSocket.CLOSED
  }
}

const ws = new WebSocketManager()

export default ws
export { WebSocketManager }
