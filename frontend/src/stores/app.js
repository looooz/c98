import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { alerts as alertsApi } from '@/api'

export const useAppStore = defineStore('app', () => {
  const sidebarCollapsed = ref(false)
  const theme = ref('light')
  const wsConnected = ref(false)
  const unreadAlerts = ref(0)

  const isDarkTheme = computed(() => theme.value === 'dark')

  const toggleSidebar = () => {
    sidebarCollapsed.value = !sidebarCollapsed.value
  }

  const setSidebarCollapsed = (collapsed) => {
    sidebarCollapsed.value = collapsed
  }

  const toggleTheme = () => {
    theme.value = theme.value === 'light' ? 'dark' : 'light'
  }

  const setTheme = (newTheme) => {
    theme.value = newTheme
  }

  const setWsConnected = (connected) => {
    wsConnected.value = connected
  }

  const setUnreadAlerts = (count) => {
    unreadAlerts.value = count
  }

  const incrementUnreadAlerts = (count = 1) => {
    unreadAlerts.value += count
  }

  const resetUnreadAlerts = () => {
    unreadAlerts.value = 0
  }

  const fetchUnreadAlerts = async () => {
    try {
      const res = await alertsApi.getUnreadCount()
      if (res?.data?.count !== undefined) {
        unreadAlerts.value = res.data.count
      } else if (typeof res?.count === 'number') {
        unreadAlerts.value = res.count
      }
    } catch (e) {
      console.error('获取未读告警数失败:', e)
    }
  }

  return {
    sidebarCollapsed,
    theme,
    wsConnected,
    unreadAlerts,
    isDarkTheme,
    toggleSidebar,
    setSidebarCollapsed,
    toggleTheme,
    setTheme,
    setWsConnected,
    setUnreadAlerts,
    incrementUnreadAlerts,
    resetUnreadAlerts,
    fetchUnreadAlerts
  }
})
