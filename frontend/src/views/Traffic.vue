<template>
  <div class="page-container">
    <el-alert
      title="数据来源说明"
      type="info"
      :closable="false"
      show-icon
      class="mb-4"
    >
      <template #default>
        <div class="data-source-info">
          <span>🔌 <strong>系统总流量</strong>：从本机网络接口读取，数据真实</span>
          <span style="margin-left: 20px;">📊 <strong>设备级流量</strong>：基于设备类型权重和在线状态的活跃度估算，非精确值</span>
        </div>
      </template>
    </el-alert>

    <el-card class="mb-4">
      <el-form :inline="true">
        <el-form-item label="时间范围">
          <el-radio-group v-model="timeRange">
            <el-radio-button label="1h">近1小时</el-radio-button>
            <el-radio-button label="6h">近6小时</el-radio-button>
            <el-radio-button label="24h">近24小时</el-radio-button>
            <el-radio-button label="7d">近7天</el-radio-button>
            <el-radio-button label="30d">近30天</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="设备">
          <el-select v-model="deviceFilter" placeholder="全部设备" clearable style="width: 200px">
            <el-option
              v-for="d in deviceList"
              :key="d.id"
              :label="d.custom_name || d.ip"
              :value="d.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Refresh" @click="refresh">刷新</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-row :gutter="16" class="mb-4">
      <el-col :span="8">
        <el-card shadow="hover">
          <div class="stat-item">
            <div class="stat-icon up">⬆️</div>
            <div>
              <div class="stat-title">总上传流量</div>
              <div class="stat-big">{{ formatBytes(summary.uploadTotal) }}</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card shadow="hover">
          <div class="stat-item">
            <div class="stat-icon down">⬇️</div>
            <div>
              <div class="stat-title">总下载流量</div>
              <div class="stat-big">{{ formatBytes(summary.downloadTotal) }}</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card shadow="hover">
          <div class="stat-item">
            <div class="stat-icon total">📊</div>
            <div>
              <div class="stat-title">总流量</div>
              <div class="stat-big">{{ formatBytes(summary.total) }}</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="16" class="mb-4">
      <el-col :span="16">
        <el-card>
          <template #header><div class="card-title">实时流量速率</div></template>
          <v-chart class="chart-big" :option="realtimeChartOption" autoresize />
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card>
          <template #header><div class="card-title">当前速率</div></template>
          <div class="gauge-wrap">
            <v-chart class="chart-gauge" :option="uploadGaugeOption" autoresize />
            <v-chart class="chart-gauge" :option="downloadGaugeOption" autoresize />
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="16">
      <el-col :span="12">
        <el-card>
          <template #header><div class="card-title">流量使用排行（下载）</div></template>
          <el-table :data="topDevices">
            <el-table-column label="#" width="60" type="index" />
            <el-table-column label="设备">
              <template #default="{ row }">
                <div class="dev-row">
                  <span class="dev-emoji">{{ getDeviceIcon(row.type) }}</span>
                  <span>{{ row.name }}</span>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="下载" width="120" align="right">
              <template #default="{ row }">{{ formatBytes(row.download) }}</template>
            </el-table-column>
            <el-table-column label="上传" width="120" align="right">
              <template #default="{ row }">{{ formatBytes(row.upload) }}</template>
            </el-table-column>
            <el-table-column label="占比" width="120">
              <template #default="{ row }">
                <el-progress :percentage="row.percent" :stroke-width="10" />
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card>
          <template #header><div class="card-title">设备类型流量分布</div></template>
          <v-chart class="chart-medium" :option="deviceTypePieOption" autoresize />
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { Refresh } from '@element-plus/icons-vue'
import { formatBytes, formatSpeed, getDeviceIcon } from '@/utils/format'
import { ElMessage } from 'element-plus'
import { traffic as trafficApi, devices as deviceApi } from '@/api'

const timeRange = ref('today')
const deviceFilter = ref('')
const deviceList = ref([])
const loading = ref(false)

const summary = ref({
  uploadTotal: 0,
  downloadTotal: 0,
  total: 0,
  uploadSpeed: 0,
  downloadSpeed: 0
})

const trendData = ref({ labels: [], upload: [], download: [] })
const topDevices = ref([])

let refreshTimer = null

async function loadDeviceList() {
  try {
    const res = await deviceApi.getList({ pageSize: 100 })
    if (res.success && res.data) {
      deviceList.value = res.data.list || []
    }
  } catch (e) {
    console.error('加载设备列表失败:', e)
  }
}

async function loadSummary() {
  try {
    const res = await trafficApi.getStats({ period: timeRange.value, deviceId: deviceFilter.value || undefined })
    if (res.success && res.data) {
      const d = res.data
      summary.value = {
        uploadTotal: d.total_upload || 0,
        downloadTotal: d.total_download || 0,
        total: d.total || 0,
        uploadSpeed: d.avg_upload_speed || 0,
        downloadSpeed: d.avg_download_speed || 0
      }
    }
  } catch (e) {
    console.error('加载流量统计失败:', e)
  }
}

async function loadTrend() {
  try {
    const res = await trafficApi.getTrend({ period: timeRange.value, deviceId: deviceFilter.value || undefined })
    if (res.success && res.data) {
      trendData.value = res.data
    }
  } catch (e) {
    console.error('加载流量趋势失败:', e)
  }
}

async function loadRankings() {
  try {
    const res = await trafficApi.getRankings({ period: timeRange.value, sortBy: 'download' })
    if (res.success && res.data) {
      const list = res.data.list || res.data || []
      const totalDownload = list.reduce((sum, item) => sum + (item.total_download || item.download || 0), 0) || 1
      topDevices.value = list.map(item => ({
        name: item.custom_name || item.device_name || item.ip || '未知设备',
        type: item.device_type || 'unknown',
        download: item.total_download || item.download || 0,
        upload: item.total_upload || item.upload || 0,
        percent: Math.round(((item.total_download || item.download || 0) / totalDownload) * 100)
      }))
    }
  } catch (e) {
    console.error('加载流量排行失败:', e)
  }
}

const realtimeChartOption = computed(() => ({
  tooltip: {
    trigger: 'axis',
    formatter: (params) => {
      const r = [params[0].axisValue]
      params.forEach(p => {
        r.push(`${p.marker}${p.seriesName}: ${formatSpeed(p.value)}`)
      })
      return r.join('<br/>')
    }
  },
  legend: { data: ['上传速率', '下载速率'] },
  grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
  xAxis: { type: 'category', boundaryGap: false, data: trendData.value.labels.length ? trendData.value.labels : [] },
  yAxis: {
    type: 'value',
    axisLabel: { formatter: v => formatSpeed(v) }
  },
  series: [
    { name: '上传速率', type: 'line', smooth: true, showSymbol: false,
      areaStyle: { opacity: 0.3 }, itemStyle: { color: '#E6A23C' },
      data: trendData.value.upload.length ? trendData.value.upload.map(v => v * 8) : [] },
    { name: '下载速率', type: 'line', smooth: true, showSymbol: false,
      areaStyle: { opacity: 0.3 }, itemStyle: { color: '#409EFF' },
      data: trendData.value.download.length ? trendData.value.download.map(v => v * 8) : [] }
  ]
}))

function gaugeOption(title, value, max, color) {
  return {
    series: [{
      type: 'gauge',
      center: ['50%', '55%'],
      radius: '85%',
      startAngle: 200,
      endAngle: -20,
      min: 0,
      max: max,
      progress: { show: true, width: 12, itemStyle: { color } },
      pointer: { show: true, width: 5, length: '60%' },
      axisLine: { lineStyle: { width: 12, color: [[1, '#eee']] } },
      axisTick: { show: false },
      splitLine: { show: false },
      axisLabel: { show: false },
      title: { show: true, offsetCenter: [0, '75%'], fontSize: 13, color: '#606266' },
      detail: {
        valueAnimation: true,
        offsetCenter: [0, '20%'],
        fontSize: 16,
        fontWeight: 600,
        formatter: (v) => formatSpeed(v)
      },
      data: [{ value, name: title }]
    }]
  }
}

const uploadGaugeOption = computed(() =>
  gaugeOption('上传', summary.value.uploadSpeed * 1024, 100 * 1024 * 1024, '#E6A23C')
)
const downloadGaugeOption = computed(() =>
  gaugeOption('下载', summary.value.downloadSpeed * 1024, 500 * 1024 * 1024, '#409EFF')
)

const deviceTypePieOption = computed(() => {
  const typeCount = {}
  topDevices.value.forEach(d => {
    const t = d.type || 'unknown'
    typeCount[t] = (typeCount[t] || 0) + (d.download || 0)
  })
  const data = Object.entries(typeCount).map(([type, value]) => ({
    value,
    name: getDeviceTypeLabel(type),
    itemStyle: { color: getDeviceTypeColor(type) }
  }))
  if (data.length === 0) {
    data.push({ value: 1, name: '暂无数据', itemStyle: { color: '#BDC3C7' } })
  }
  return {
    tooltip: { trigger: 'item', formatter: '{b}: {d}%' },
    legend: { bottom: 0, left: 'center' },
    series: [{
      type: 'pie',
      radius: ['35%', '60%'],
      label: { formatter: '{b}: {d}%' },
      data
    }]
  }
})

async function loadAllData() {
  loading.value = true
  try {
    await Promise.all([
      loadSummary(),
      loadTrend(),
      loadRankings()
    ])
  } finally {
    loading.value = false
  }
}

function refresh() {
  loadAllData()
  ElMessage.success('流量数据已刷新')
}

function startAutoRefresh() {
  stopAutoRefresh()
  refreshTimer = setInterval(() => {
    loadSummary()
    loadTrend()
    loadRankings()
  }, 30000)
}

function stopAutoRefresh() {
  if (refreshTimer) {
    clearInterval(refreshTimer)
    refreshTimer = null
  }
}

watch([timeRange, deviceFilter], () => {
  loadAllData()
})

onMounted(() => {
  loadDeviceList()
  loadAllData()
  startAutoRefresh()
})

onUnmounted(() => {
  stopAutoRefresh()
})
</script>

<style scoped>
.mb-4 { margin-bottom: 16px; }
.card-title { font-weight: 600; }
.stat-item {
  display: flex;
  align-items: center;
  gap: 14px;
}
.stat-icon {
  width: 52px;
  height: 52px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  background: #ecf5ff;
}
.stat-icon.up { background: #fdf6ec; }
.stat-icon.down { background: #ecf5ff; }
.stat-icon.total { background: #f0f9eb; }
.stat-title { font-size: 13px; color: #909399; margin-bottom: 4px; }
.stat-big { font-size: 22px; font-weight: 600; color: #303133; }
.chart-big { width: 100%; height: 340px; }
.chart-medium { width: 100%; height: 340px; }
.chart-gauge { width: 100%; height: 200px; }
.gauge-wrap { display: flex; flex-direction: column; }
.dev-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.dev-emoji { font-size: 18px; }
</style>
