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
            <el-option label="主路由器" value="1" />
            <el-option label="小明的 iPhone 13" value="2" />
            <el-option label="MacBook Pro" value="4" />
            <el-option label="小米电视" value="6" />
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
          <template #header><div class="card-title">流量类型分布</div></template>
          <v-chart class="chart-medium" :option="protocolPieOption" autoresize />
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Refresh } from '@element-plus/icons-vue'
import { formatBytes, formatSpeed, getDeviceIcon } from '@/utils/format'
import { ElMessage } from 'element-plus'

const timeRange = ref('1h')
const deviceFilter = ref('')

const summary = ref({
  uploadTotal: 3.8 * 1024 * 1024 * 1024,
  downloadTotal: 15.2 * 1024 * 1024 * 1024,
  total: 19 * 1024 * 1024 * 1024,
  uploadSpeed: 12.5 * 1024 * 1024,
  downloadSpeed: 86.3 * 1024 * 1024
})

function genTrafficData(points, max) {
  return Array.from({ length: points }, () => Math.random() * max * 1024 * 1024)
}

const timeLabels = computed(() => {
  const now = new Date()
  const points = 60
  return Array.from({ length: points }, (_, i) => {
    const d = new Date(now.getTime() - (points - 1 - i) * 60000)
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
  })
})

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
  xAxis: { type: 'category', boundaryGap: false, data: timeLabels.value },
  yAxis: {
    type: 'value',
    axisLabel: { formatter: v => formatSpeed(v) }
  },
  series: [
    { name: '上传速率', type: 'line', smooth: true, showSymbol: false,
      areaStyle: { opacity: 0.3 }, itemStyle: { color: '#E6A23C' },
      data: genTrafficData(60, 30) },
    { name: '下载速率', type: 'line', smooth: true, showSymbol: false,
      areaStyle: { opacity: 0.3 }, itemStyle: { color: '#409EFF' },
      data: genTrafficData(60, 120) }
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
  gaugeOption('上传', summary.value.uploadSpeed, 100 * 1024 * 1024, '#E6A23C')
)
const downloadGaugeOption = computed(() =>
  gaugeOption('下载', summary.value.downloadSpeed, 500 * 1024 * 1024, '#409EFF')
)

const topDevices = ref([
  { name: '小米电视', type: 'tv', download: 8.2 * 1024 * 1024 * 1024, upload: 120 * 1024 * 1024, percent: 52 },
  { name: 'MacBook Pro', type: 'computer', download: 4.1 * 1024 * 1024 * 1024, upload: 2.1 * 1024 * 1024 * 1024, percent: 33 },
  { name: '小明的 iPhone 13', type: 'phone', download: 1.5 * 1024 * 1024 * 1024, upload: 480 * 1024 * 1024, percent: 10 },
  { name: 'iPad Air', type: 'tablet', download: 800 * 1024 * 1024, upload: 80 * 1024 * 1024, percent: 4 },
  { name: 'PS5', type: 'console', download: 450 * 1024 * 1024, upload: 50 * 1024 * 1024, percent: 1 }
])

const protocolPieOption = computed(() => ({
  tooltip: { trigger: 'item' },
  legend: { bottom: 0, left: 'center' },
  series: [{
    type: 'pie',
    radius: ['35%', '60%'],
    label: { formatter: '{b}: {d}%' },
    data: [
      { value: 45, name: 'HTTPS', itemStyle: { color: '#409EFF' } },
      { value: 25, name: 'HTTP', itemStyle: { color: '#67C23A' } },
      { value: 15, name: '视频流媒体', itemStyle: { color: '#E6A23C' } },
      { value: 8, name: '游戏', itemStyle: { color: '#F56C6C' } },
      { value: 7, name: '其他', itemStyle: { color: '#909399' } }
    ]
  }]
}))

function refresh() {
  ElMessage.success('流量数据已更新')
}

onMounted(() => {})
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
