import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { devices as devicesApi } from '@/api'

export const useDeviceStore = defineStore('device', () => {
  const deviceList = ref([])
  const deviceGroups = ref([])
  const loading = ref(false)
  const scanning = ref(false)

  const onlineDevices = computed(() =>
    deviceList.value.filter(d => d.status === 'online' || d.online)
  )

  const offlineDevices = computed(() =>
    deviceList.value.filter(d => d.status === 'offline' || !d.online)
  )

  const blockedDevices = computed(() =>
    deviceList.value.filter(d => d.blocked || d.is_blocked)
  )

  const onlineCount = computed(() => onlineDevices.value.length)
  const offlineCount = computed(() => offlineDevices.value.length)
  const totalCount = computed(() => deviceList.value.length)
  const blockedCount = computed(() => blockedDevices.value.length)

  const devicesByGroup = computed(() => {
    const map = {}
    deviceList.value.forEach(device => {
      const groupId = device.groupId || device.group_id || 'default'
      if (!map[groupId]) {
        map[groupId] = []
      }
      map[groupId].push(device)
    })
    return map
  })

  const devicesByType = computed(() => {
    const map = {}
    deviceList.value.forEach(device => {
      const type = device.type || 'unknown'
      if (!map[type]) {
        map[type] = []
      }
      map[type].push(device)
    })
    return map
  })

  const setDeviceList = (list) => {
    deviceList.value = list
  }

  const addDevice = (device) => {
    const idx = deviceList.value.findIndex(d =>
      d.id === device.id || d.mac === device.mac
    )
    if (idx >= 0) {
      deviceList.value[idx] = { ...deviceList.value[idx], ...device }
    } else {
      deviceList.value.push(device)
    }
  }

  const updateDevice = (id, updates) => {
    const idx = deviceList.value.findIndex(d => d.id === id || d.mac === id)
    if (idx >= 0) {
      deviceList.value[idx] = { ...deviceList.value[idx], ...updates }
    }
  }

  const removeDevice = (id) => {
    deviceList.value = deviceList.value.filter(d => d.id !== id && d.mac !== id)
  }

  const setDeviceGroups = (groups) => {
    deviceGroups.value = groups
  }

  const fetchDevices = async (params) => {
    loading.value = true
    try {
      const res = await devicesApi.getList(params)
      const list = res?.data?.list || res?.data || res?.list || []
      deviceList.value = Array.isArray(list) ? list : []
      return deviceList.value
    } catch (e) {
      console.error('获取设备列表失败:', e)
      throw e
    } finally {
      loading.value = false
    }
  }

  const fetchGroups = async () => {
    try {
      const res = await devicesApi.getGroups()
      const groups = res?.data?.list || res?.data || res?.groups || []
      deviceGroups.value = Array.isArray(groups) ? groups : []
      return deviceGroups.value
    } catch (e) {
      console.error('获取设备分组失败:', e)
      return []
    }
  }

  const startScan = async () => {
    scanning.value = true
    try {
      const res = await devicesApi.scan()
      return res
    } catch (e) {
      console.error('设备扫描失败:', e)
      throw e
    } finally {
      setTimeout(() => {
        scanning.value = false
      }, 5000)
    }
  }

  const refresh = async () => {
    await Promise.all([
      fetchDevices().catch(() => {}),
      fetchGroups().catch(() => {})
    ])
  }

  return {
    deviceList,
    deviceGroups,
    loading,
    scanning,
    onlineDevices,
    offlineDevices,
    blockedDevices,
    onlineCount,
    offlineCount,
    totalCount,
    blockedCount,
    devicesByGroup,
    devicesByType,
    setDeviceList,
    addDevice,
    updateDevice,
    removeDevice,
    setDeviceGroups,
    fetchDevices,
    fetchGroups,
    startScan,
    refresh
  }
})
