<template>
  <div class="page-container">
    <el-row :gutter="16" class="mb-4">
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-content">
            <div class="stat-icon online">📱</div>
            <div class="stat-info">
              <div class="stat-label">在线设备</div>
              <div class="stat-value">{{ stats.online }}</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-content">
            <div class="stat-icon total">🔢</div>
            <div class="stat-info">
              <div class="stat-label">设备总数</div>
              <div class="stat-value">{{ stats.total }}</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-content">
            <div class="stat-icon traffic">📊</div>
            <div class="stat-info">
              <div class="stat-label">今日流量</div>
              <div class="stat-value">{{ stats.todayTraffic }}</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-content">
            <div class="stat-icon alert">🔔</div>
            <div class="stat-info">
              <div class="stat-label">待处理告警</div>
              <div class="stat-value">{{ stats.alerts }}</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="16">
      <el-col :span="16">
        <el-card class="chart-card">
          <template #header>
            <div class="card-header">
              <span>实时流量趋势</span>
              <el-tag type="info">最近24小时</el-tag>
            </div>
          </template>
          <v-chart class="chart-container" :option="trafficChartOption" autoresize />
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card class="chart-card">
          <template #header>
            <div class="card-header">
              <span>设备类型分布</span>
            </div>
          </template>
          <v-chart class="chart-container" :option="devicePieOption" autoresize />
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="16" class="mt-4">
      <el-col :span="12">
        <el-card class="mb-4">
          <template #header>
            <div class="card-header">
              <span>最近在线设备</span>
              <el-button link type="primary" @click="$router.push('/devices')">查看全部</el-button>
            </div>
          </template>
          <el-table :data="recentDevices" size="small">
            <el-table-column label="设备" width="180">
              <template #default="{ row }">
                <div class="device-cell">
                  <span class="device-icon">{{ getDeviceIcon(row.type) }}</span>
                  <span class="device-name">{{ row.name }}</span>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="IP" prop="ip" width="130" />
            <el-table-column label="类型">
              <template #default="{ row }">
                <el-tag :color="getDeviceTypeColor(row.type)" effect="light" size="small">
                  {{ getDeviceTypeLabel(row.type) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="状态" width="80">
              <template #default="{ row }">
                <el-badge :is-dot="true" :type="row.online ? 'success' : 'info'" />
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>最新告警</span>
              <el-button link type="primary" @click="$router.push('/alerts')">查看全部</el-button>
            </div>
          </template>
          <el-table :data="recentAlerts" size="small">
            <el-table-column label="级别" width="80">
              <template #default="{ row }">
                <el-tag :type="alertLevelTag(row.level)" size="small">{{ row.level }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="消息" prop="message" show-overflow-tooltip />
            <el-table-column label="时间" width="160">
              <template #default="{ row }">
                <span class="text-muted">{{ relativeTime(row.time) }}</span>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import {
  formatBytes,
  getDeviceIcon,
  getDeviceTypeLabel,
  getDeviceTypeColor,
  relativeTime
} from '@/utils/format'
import { devices as deviceApi, traffic as trafficApi, alerts as alertApi } from '@/api'

const stats = ref({
  online: 0,
  total: 0,
  todayTraffic: formatBytes(0),
  alerts: 0
})

const allDevices = ref([])
const trafficTrend = ref({ labels: [], upload: [], download: [] })
const recentAlerts = ref([])
const loading = ref(false)
let refreshTimer = null

async function loadDeviceStats() {
  try {
    const res = await deviceApi.getList({ pageSize: 100 })
    if (res.success && res.data) {
      allDevices.value = res.data.list || []
      stats.value.total = res.data.total || 0
      stats.value.online = allDevices.value.filter(d => d.is_online).length
    }
  } catch (e) {
    console.error('加载设备统计失败:', e)
  }
}

async function loadTrafficStats() {
  try {
    const res = await trafficApi.getStats({ period: 'today' })
    if (res.success && res.data) {
      stats.value.todayTraffic = formatBytes(res.data.total || 0)
    }
  } catch (e) {
    console.error('加载流量统计失败:', e)
  }
}

async function loadTrafficTrend() {
  try {
    const res = await trafficApi.getTrend({ period: 'today' })
    if (res.success && res.data) {
      trafficTrend.value = res.data
    }
  } catch (e) {
    console.error('加载流量趋势失败:', e)
  }
}

async function loadAlerts() {
  try {
    const [listRes, countRes] = await Promise.all([
      alertApi.getList({ pageSize: 5 }),
      alertApi.getUnreadCount()
    ])
    if (listRes.success && listRes.data) {
      recentAlerts.value = (listRes.data.list || []).map(a => ({
        level: a.level,
        message: a.message,
        time: new Date(a.timestamp).getTime()
      }))
    }
    if (countRes.success && countRes.data !== undefined) {
      stats.value.alerts = countRes.data.unread_count || countRes.data || 0
    }
  } catch (e) {
    console.error('加载告警失败:', e)
  }
}

const trafficChartOption = computed(() => ({
  tooltip: {
    trigger: 'axis',
    formatter: (params) => {
      const result = [params[0].axisValue]
      params.forEach(p => {
        result.push(`${p.marker}${p.seriesName}: ${formatBytes(p.value)}`)
      })
      return result.join('<br/>')
    }
  },
  legend: { data: ['上传', '下载'] },
  grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
  xAxis: { type: 'category', boundaryGap: false, data: trafficTrend.value.labels || [] },
  yAxis: {
    type: 'value',
    axisLabel: {
      formatter: (v) => formatBytes(v)
    }
  },
  series: [
    {
      name: '上传',
      type: 'line',
      smooth: true,
      areaStyle: { opacity: 0.3 },
      data: trafficTrend.value.upload.length ? trafficTrend.value.upload : []
    },
    {
      name: '下载',
      type: 'line',
      smooth: true,
      areaStyle: { opacity: 0.3 },
      data: trafficTrend.value.download.length ? trafficTrend.value.download : []
    }
  ]
}))

const devicePieOption = computed(() => {
  const typeCount = {}
  allDevices.value.forEach(d => {
    const t = d.device_type || d.type || 'unknown'
    typeCount[t] = (typeCount[t] || 0) + 1
  })
  const data = Object.entries(typeCount).map(([type, count]) => ({
    value: count,
    name: getDeviceTypeLabel(type),
    itemStyle: { color: getDeviceTypeColor(type) }
  }))
  if (data.length === 0) {
    data.push({ value: 1, name: '暂无数据', itemStyle: { color: '#BDC3C7' } })
  }
  return {
    tooltip: { trigger: 'item' },
    legend: { bottom: '5%', left: 'center' },
    series: [{
      type: 'pie',
      radius: ['40%', '70%'],
      avoidLabelOverlap: false,
      label: { show: false },
      emphasis: { label: { show: true, fontSize: 14, fontWeight: 'bold' } },
      data
    }]
  }
})

const recentDevices = computed(() => {
  return [...allDevices.value]
    .sort((a, b) => new Date(b.last_seen) - new Date(a.last_seen))
    .slice(0, 5)
    .map(d => ({
      id: d.id,
      name: d.custom_name || d.hostname || d.name || d.ip,
      ip: d.ip,
      type: d.device_type || d.type || 'unknown',
      online: !!d.is_online
    }))
})

const alertLevelTag = (level) => {
  const map = { critical: 'danger', high: 'warning', medium: '', low: 'info' }
  return map[level] || 'info'
}

async function loadAllData() {
  loading.value = true
  try {
    await Promise.all([
      loadDeviceStats(),
      loadTrafficStats(),
      loadTrafficTrend(),
      loadAlerts()
    ])
  } finally {
    loading.value = false
  }
}

function startAutoRefresh() {
  stopAutoRefresh()
  refreshTimer = setInterval(() => {
    loadTrafficStats()
    loadTrafficTrend()
    loadAlerts()
  }, 30000)
}

function stopAutoRefresh() {
  if (refreshTimer) {
    clearInterval(refreshTimer)
    refreshTimer = null
  }
}

onMounted(() => {
  loadAllData()
  startAutoRefresh()
})

onUnmounted(() => {
  stopAutoRefresh()
})
</script>

<style scoped>
.stat-card {
  border-radius: 8px;
}

.stat-content {
  display: flex;
  align-items: center;
  gap: 16px;
}

.stat-icon {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
}

.stat-icon.online {
  background: #ecf5ff;
}

.stat-icon.total {
  background: #f0f9eb;
}

.stat-icon.traffic {
  background: #fdf6ec;
}

.stat-icon.alert {
  background: #fef0f0;
}

.stat-label {
  font-size: 14px;
  color: #909399;
  margin-bottom: 4px;
}

.stat-value {
  font-size: 26px;
  font-weight: 600;
  color: #303133;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
}

.chart-card {
  border-radius: 8px;
}

.chart-container {
  width: 100%;
  height: 320px;
}

.device-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.device-icon {
  font-size: 18px;
}

.device-name {
  font-weight: 500;
}

.text-muted {
  color: #909399;
  font-size: 12px;
}

.mt-4 {
  margin-top: 16px;
}
</style>
