<template>
  <div class="page-container">
    <el-card class="mb-4">
      <el-form :inline="true">
        <el-form-item label="日期范围">
          <el-date-picker
            v-model="dateRange"
            type="datetimerange"
            range-separator="至"
            start-placeholder="开始时间"
            end-placeholder="结束时间"
            style="width: 400px"
          />
        </el-form-item>
        <el-form-item label="设备">
          <el-select v-model="deviceFilter" placeholder="全部设备" clearable style="width: 200px" filterable>
            <el-option
              v-for="dev in deviceOptions"
              :key="dev.id"
              :label="dev.name || dev.mac"
              :value="dev.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="事件类型">
          <el-select v-model="eventType" placeholder="全部" clearable style="width: 150px">
            <el-option label="接入" value="online" />
            <el-option label="断开" value="offline" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="search" :loading="loading">查询</el-button>
          <el-button :icon="RefreshLeft" @click="reset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-row :gutter="16" class="mb-4">
      <el-col :span="6">
        <el-card shadow="hover">
          <el-statistic title="总记录数" :value="stats.total" />
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover">
          <el-statistic title="接入次数" :value="stats.connect" value-style="color: #67c23a" />
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover">
          <el-statistic title="断开次数" :value="stats.disconnect" value-style="color: #f56c6c" />
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover">
          <el-statistic title="平均连接时长" :value="stats.avgDuration" suffix="小时" />
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="16" class="mb-4">
      <el-col :span="16">
        <el-card>
          <template #header><div class="card-title">连接趋势</div></template>
          <v-chart class="chart" :option="trendChartOption" autoresize />
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card>
          <template #header><div class="card-title">设备连接次数 TOP</div></template>
          <v-chart class="chart" :option="topBarOption" autoresize />
        </el-card>
      </el-col>
    </el-row>

    <el-card>
      <template #header>
        <div class="flex-between">
          <div class="card-title">连接记录</div>
          <div>
            <el-button :icon="Download" size="small">导出 CSV</el-button>
          </div>
        </div>
      </template>
      <el-timeline v-loading="loading">
        <el-timeline-item
          v-for="item in historyList"
          :key="item.id"
          :timestamp="formatDateTime(item.timestamp)"
          :type="eventColor(item.event_type)"
          :hollow="item.event_type === 'offline'"
          placement="top"
        >
          <el-card shadow="never" class="tl-card">
            <div class="tl-header">
              <div class="flex items-center gap-2">
                <el-tag :type="eventTag(item.event_type)" size="small" effect="light">
                  {{ eventLabel(item.event_type) }}
                </el-tag>
                <span class="device-emoji">{{ getDeviceIcon(item.device_type) }}</span>
                <span class="dev-name">{{ item.device_name || formatMac(item.mac) }}</span>
              </div>
              <el-tag type="info" size="small">{{ item.ip }}</el-tag>
            </div>
            <div class="tl-body">
              <el-descriptions :column="3" size="small" border>
                <el-descriptions-item label="MAC">{{ formatMac(item.mac) }}</el-descriptions-item>
                <el-descriptions-item label="厂商">{{ item.vendor || '未知' }}</el-descriptions-item>
                <el-descriptions-item label="连接时长">
                  {{ item.duration ? formatDuration(item.duration) : '-' }}
                </el-descriptions-item>
                <el-descriptions-item label="信号强度" v-if="item.signal">
                  <el-rate :model-value="Math.ceil(item.signal / 20)" disabled size="small" />
                </el-descriptions-item>
                <el-descriptions-item label="频段" v-if="item.band">
                  {{ item.band }}
                </el-descriptions-item>
                <el-descriptions-item label="SSID" v-if="item.ssid">
                  {{ item.ssid }}
                </el-descriptions-item>
              </el-descriptions>
            </div>
          </el-card>
        </el-timeline-item>
      </el-timeline>

      <div class="pagination-wrap">
        <el-pagination
          v-model:current-page="page"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50]"
          :total="total"
          layout="total, sizes, prev, pager, next, jumper"
          background
          @size-change="handleSizeChange"
          @current-change="handlePageChange"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { Search, RefreshLeft, Download } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { history } from '@/api'
import {
  formatMac,
  formatDateTime,
  formatDuration,
  getDeviceIcon
} from '@/utils/format'

const dateRange = ref([])
const deviceFilter = ref('')
const eventType = ref('')
const page = ref(1)
const pageSize = ref(10)
const total = ref(0)
const loading = ref(false)

const historyList = ref([])
const deviceOptions = ref([])
const dailyData = ref([])

const stats = ref({
  total: 0,
  connect: 0,
  disconnect: 0,
  avgDuration: 0
})

function eventLabel(t) {
  return { online: '设备接入', offline: '设备断开' }[t] || t
}
function eventTag(t) {
  return { online: 'success', offline: 'info' }[t] || 'info'
}
function eventColor(t) {
  return { online: 'success', offline: 'primary' }[t] || 'primary'
}

const trendChartOption = computed(() => {
  const days = 7
  const dayLabels = []
  const now = new Date()
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400000)
    dayLabels.push(`${d.getMonth() + 1}/${d.getDate()}`)
  }

  const connectData = Array(days).fill(0)
  const disconnectData = Array(days).fill(0)

  if (dailyData.value && dailyData.value.length > 0) {
    dailyData.value.forEach(item => {
      const date = new Date(item.date)
      const dayStr = `${date.getMonth() + 1}/${date.getDate()}`
      const idx = dayLabels.indexOf(dayStr)
      if (idx !== -1) {
        connectData[idx] = item.online_count || 0
        disconnectData[idx] = item.offline_count || 0
      }
    })
  }

  return {
    tooltip: { trigger: 'axis' },
    legend: { data: ['接入', '断开'] },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { type: 'category', data: dayLabels },
    yAxis: { type: 'value' },
    series: [
      { name: '接入', type: 'bar', stack: 'total', data: connectData, itemStyle: { color: '#67c23a' } },
      { name: '断开', type: 'bar', stack: 'total', data: disconnectData, itemStyle: { color: '#f56c6c' } }
    ]
  }
})

const topBarOption = computed(() => {
  const topDevices = deviceOptions.value
    .filter(d => d.connection_count !== undefined)
    .sort((a, b) => b.connection_count - a.connection_count)
    .slice(0, 5)

  return {
    tooltip: { trigger: 'axis' },
    grid: { left: '3%', right: '10%', bottom: '3%', containLabel: true },
    xAxis: { type: 'value' },
    yAxis: {
      type: 'category',
      data: topDevices.map(d => d.name || formatMac(d.mac)),
      inverse: true
    },
    series: [{
      type: 'bar',
      data: topDevices.map(d => d.connection_count || 0),
      itemStyle: { color: '#409EFF', borderRadius: [0, 4, 4, 0] },
      label: { show: true, position: 'right', formatter: '{c}次' }
    }]
  }
})

function buildParams() {
  const params = {
    page: page.value,
    pageSize: pageSize.value
  }

  if (deviceFilter.value) {
    params.deviceId = deviceFilter.value
  }

  if (eventType.value) {
    params.eventType = eventType.value
  }

  if (dateRange.value && dateRange.value.length === 2) {
    params.startTime = dateRange.value[0].getTime()
    params.endTime = dateRange.value[1].getTime()
  }

  return params
}

async function loadList() {
  loading.value = true
  try {
    const params = buildParams()
    const res = await history.getList(params)
    if (res.success) {
      historyList.value = res.data.list || []
      total.value = res.data.total || 0
      updateStats(res.data)
    }
  } catch (error) {
    console.error('加载历史记录失败:', error)
  } finally {
    loading.value = false
  }
}

function updateStats(data) {
  stats.value.total = data.total || 0
  
  if (data.stats) {
    stats.value.connect = data.stats.online_count || data.stats.connect || 0
    stats.value.disconnect = data.stats.offline_count || data.stats.disconnect || 0
    stats.value.avgDuration = data.stats.avg_duration ? parseFloat((data.stats.avg_duration / 3600).toFixed(1)) : 0
  } else {
    let onlineCount = 0
    let offlineCount = 0
    let totalDuration = 0
    let durationCount = 0

    historyList.value.forEach(item => {
      if (item.event_type === 'online') onlineCount++
      if (item.event_type === 'offline') offlineCount++
      if (item.duration) {
        totalDuration += item.duration
        durationCount++
      }
    })

    stats.value.connect = onlineCount
    stats.value.disconnect = offlineCount
    stats.value.avgDuration = durationCount > 0 ? parseFloat((totalDuration / durationCount / 3600).toFixed(1)) : 0
  }
}

async function loadDevices() {
  try {
    const params = {}
    if (dateRange.value && dateRange.value.length === 2) {
      params.startTime = dateRange.value[0].getTime()
      params.endTime = dateRange.value[1].getTime()
    }
    const res = await history.getDevices(params)
    if (res.success) {
      deviceOptions.value = res.data.list || res.data || []
    }
  } catch (error) {
    console.error('加载设备列表失败:', error)
  }
}

async function loadDailyData() {
  try {
    const params = {}
    if (deviceFilter.value) {
      const res = await history.getDaily(deviceFilter.value, params)
      if (res.success) {
        dailyData.value = res.data.list || res.data || []
      }
    } else {
      dailyData.value = []
    }
  } catch (error) {
    console.error('加载每日数据失败:', error)
  }
}

function search() {
  page.value = 1
  loadList()
  loadDevices()
  loadDailyData()
}

function reset() {
  dateRange.value = []
  deviceFilter.value = ''
  eventType.value = ''
  page.value = 1
  loadList()
  loadDevices()
  loadDailyData()
  ElMessage.info('已重置')
}

function handlePageChange(val) {
  page.value = val
  loadList()
}

function handleSizeChange(val) {
  pageSize.value = val
  page.value = 1
  loadList()
}

onMounted(() => {
  loadList()
  loadDevices()
  loadDailyData()
})
</script>

<style scoped>
.mb-4 { margin-bottom: 16px; }
.card-title { font-weight: 600; }
.flex-between { display: flex; justify-content: space-between; align-items: center; }
.flex { display: flex; }
.items-center { align-items: center; }
.gap-2 { gap: 8px; }
.chart { width: 100%; height: 300px; }
.tl-card { margin-bottom: 0; }
.tl-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
.device-emoji { font-size: 18px; }
.dev-name { font-weight: 500; color: #303133; }
.tl-body { margin-top: 10px; }
.pagination-wrap { margin-top: 20px; display: flex; justify-content: flex-end; }
</style>
