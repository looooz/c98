<template>
  <div class="page-container">
    <el-card class="mb-4">
      <el-form :inline="true">
        <el-form-item label="统计周期">
          <el-radio-group v-model="period">
            <el-radio-button label="today">今日</el-radio-button>
            <el-radio-button label="week">本周</el-radio-button>
            <el-radio-button label="month">本月</el-radio-button>
            <el-radio-button label="quarter">本季度</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="自定义日期">
          <el-date-picker
            v-model="dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始"
            end-placeholder="结束"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Refresh" @click="refresh">刷新</el-button>
          <el-dropdown @command="onExport">
            <el-button :icon="Download">导出报表</el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="pdf">PDF 格式</el-dropdown-item>
                <el-dropdown-item command="excel">Excel 格式</el-dropdown-item>
                <el-dropdown-item command="csv">CSV 格式</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </el-form-item>
      </el-form>
    </el-card>

    <el-row :gutter="16" class="mb-4">
      <el-col :span="6">
        <el-card shadow="hover">
          <div class="kpi">
            <div class="kpi-icon devices">📱</div>
            <div>
              <div class="kpi-label">设备总数</div>
              <div class="kpi-value">{{ kpi.devices }}</div>
              <div class="kpi-trend up">较上周期 +12%</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover">
          <div class="kpi">
            <div class="kpi-icon traffic">📊</div>
            <div>
              <div class="kpi-label">总流量</div>
              <div class="kpi-value">{{ kpi.traffic }}</div>
              <div class="kpi-trend up">较上周期 +24%</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover">
          <div class="kpi">
            <div class="kpi-icon connect">🔗</div>
            <div>
              <div class="kpi-label">连接次数</div>
              <div class="kpi-value">{{ kpi.connections }}</div>
              <div class="kpi-trend down">较上周期 -5%</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover">
          <div class="kpi">
            <div class="kpi-icon alert">🔔</div>
            <div>
              <div class="kpi-label">告警总数</div>
              <div class="kpi-value">{{ kpi.alerts }}</div>
              <div class="kpi-trend down">较上周期 -28%</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="16" class="mb-4">
      <el-col :span="16">
        <el-card>
          <template #header><div class="card-title">每日流量趋势</div></template>
          <v-chart class="chart-lg" :option="trafficDailyOption" autoresize />
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card>
          <template #header><div class="card-title">设备类型分布</div></template>
          <v-chart class="chart-lg" :option="deviceTypePieOption" autoresize />
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="16" class="mb-4">
      <el-col :span="12">
        <el-card>
          <template #header><div class="card-title">各时段活跃设备数</div></template>
          <v-chart class="chart-md" :option="activeDevicesOption" autoresize />
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card>
          <template #header><div class="card-title">告警级别统计</div></template>
          <v-chart class="chart-md" :option="alertLevelOption" autoresize />
        </el-card>
      </el-col>
    </el-row>

    <el-card>
      <template #header>
        <div class="flex-between">
          <div class="card-title">设备流量排行 TOP 10</div>
          <el-radio-group v-model="rankType" size="small">
            <el-radio-button label="download">下载</el-radio-button>
            <el-radio-button label="upload">上传</el-radio-button>
            <el-radio-button label="total">合计</el-radio-button>
          </el-radio-group>
        </div>
      </template>
      <el-table :data="topDevices" stripe>
        <el-table-column label="#" width="70" align="center">
          <template #default="{ $index }">
            <el-tag
              :type="$index === 0 ? 'warning' : $index === 1 ? 'info' : $index === 2 ? 'danger' : ''"
              effect="light"
              size="small"
              effect-plain
            >
              {{ $index + 1 }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="设备" min-width="200">
          <template #default="{ row }">
            <div class="dev-row">
              <el-avatar :size="32" :style="{ background: getDeviceTypeColor(row.type) + '30' }">
                <span>{{ getDeviceIcon(row.type) }}</span>
              </el-avatar>
              <div class="dev-info">
                <div class="dev-name">{{ row.name }}</div>
                <div class="dev-sub">{{ row.ip }}</div>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="下载" width="130" align="right">
          <template #default="{ row }">{{ formatBytes(row.download) }}</template>
        </el-table-column>
        <el-table-column label="上传" width="130" align="right">
          <template #default="{ row }">{{ formatBytes(row.upload) }}</template>
        </el-table-column>
        <el-table-column label="总计" width="130" align="right">
          <template #default="{ row }">
            <strong>{{ formatBytes(row.download + row.upload) }}</strong>
          </template>
        </el-table-column>
        <el-table-column label="在线时长" width="130" align="right">
          <template #default="{ row }">{{ formatDuration(row.duration) }}</template>
        </el-table-column>
        <el-table-column label="占比" min-width="200">
          <template #default="{ row }">
            <el-progress
              :percentage="Math.round((row.download + row.upload) / maxTotal * 100)"
              :stroke-width="14"
            />
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Refresh, Download } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { formatBytes, formatDuration, getDeviceIcon, getDeviceTypeColor } from '@/utils/format'

const period = ref('week')
const dateRange = ref([])
const rankType = ref('total')

const kpi = reactive({
  devices: 28,
  traffic: formatBytes(186.5 * 1024 * 1024 * 1024),
  connections: 1248,
  alerts: 56
})

const days = period.value === 'today' ? 24 : period.value === 'week' ? 7 : period.value === 'month' ? 30 : 12
const dayLabels = computed(() => {
  if (period.value === 'today') {
    return Array.from({ length: 24 }, (_, i) => `${i}:00`)
  }
  if (period.value === 'week') {
    return ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
  }
  if (period.value === 'month') {
    return Array.from({ length: 30 }, (_, i) => `${i + 1}日`)
  }
  return ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']
})

const trafficDailyOption = computed(() => ({
  tooltip: {
    trigger: 'axis',
    formatter: params => {
      const r = [params[0].axisValue]
      params.forEach(p => r.push(`${p.marker}${p.seriesName}: ${formatBytes(p.value)}`))
      return r.join('<br/>')
    }
  },
  legend: { data: ['下载', '上传'] },
  grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
  xAxis: { type: 'category', data: dayLabels.value },
  yAxis: { type: 'value', axisLabel: { formatter: v => formatBytes(v) } },
  series: [
    {
      name: '下载', type: 'bar', stack: 'total', barWidth: days > 12 ? '60%' : '40%',
      itemStyle: { color: '#409EFF' },
      emphasis: { focus: 'series' },
      data: Array.from({ length: days }, () => 2 + Math.random() * 18)
        .map(v => v * 1024 * 1024 * 1024)
    },
    {
      name: '上传', type: 'bar', stack: 'total', barWidth: days > 12 ? '60%' : '40%',
      itemStyle: { color: '#67C23A' },
      emphasis: { focus: 'series' },
      data: Array.from({ length: days }, () => 0.3 + Math.random() * 3)
        .map(v => v * 1024 * 1024 * 1024)
    }
  ]
}))

const deviceTypePieOption = computed(() => ({
  tooltip: { trigger: 'item', formatter: '{b}: {c}台 ({d}%)' },
  legend: { orient: 'vertical', right: '5%', top: 'center' },
  series: [{
    type: 'pie',
    radius: ['45%', '70%'],
    center: ['35%', '50%'],
    avoidLabelOverlap: false,
    itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
    label: { show: false },
    emphasis: { label: { show: true, fontSize: 14, fontWeight: 600 } },
    data: [
      { value: 10, name: '手机', itemStyle: { color: '#409EFF' } },
      { value: 4, name: '电脑', itemStyle: { color: '#67C23A' } },
      { value: 2, name: '平板', itemStyle: { color: '#E6A23C' } },
      { value: 3, name: '电视/盒子', itemStyle: { color: '#F56C6C' } },
      { value: 5, name: '智能家居', itemStyle: { color: '#909399' } },
      { value: 2, name: '摄像头', itemStyle: { color: '#16A085' } },
      { value: 2, name: '其他', itemStyle: { color: '#BDC3C7' } }
    ]
  }]
}))

const activeDevicesOption = computed(() => ({
  tooltip: { trigger: 'axis' },
  grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
  xAxis: { type: 'category', data: Array.from({ length: 24 }, (_, i) => `${i}:00`) },
  yAxis: { type: 'value' },
  series: [{
    type: 'line',
    smooth: true,
    showSymbol: false,
    areaStyle: {
      color: {
        type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
        colorStops: [
          { offset: 0, color: 'rgba(64, 158, 255, 0.4)' },
          { offset: 1, color: 'rgba(64, 158, 255, 0.05)' }
        ]
      }
    },
    lineStyle: { color: '#409EFF', width: 3 },
    data: [2, 1, 1, 1, 1, 2, 4, 8, 12, 15, 14, 13, 14, 12, 10, 11, 13, 16, 18, 20, 18, 14, 9, 5]
  }]
}))

const alertLevelOption = computed(() => ({
  tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
  legend: { bottom: 0 },
  grid: { left: '3%', right: '4%', bottom: '15%', containLabel: true },
  xAxis: {
    type: 'category',
    data: period.value === 'week' ? ['周一', '周二', '周三', '周四', '周五', '周六', '周日'] : Array.from({ length: days }, (_, i) => `${i + 1}日`)
  },
  yAxis: { type: 'value' },
  series: [
    {
      name: '严重', type: 'bar', stack: 'total',
      itemStyle: { color: '#f56c6c' },
      data: Array.from({ length: Math.min(days, 7) }, () => Math.floor(Math.random() * 3))
    },
    {
      name: '高', type: 'bar', stack: 'total',
      itemStyle: { color: '#e6a23c' },
      data: Array.from({ length: Math.min(days, 7) }, () => Math.floor(Math.random() * 5))
    },
    {
      name: '中', type: 'bar', stack: 'total',
      itemStyle: { color: '#409eff' },
      data: Array.from({ length: Math.min(days, 7) }, () => Math.floor(Math.random() * 8))
    },
    {
      name: '低', type: 'bar', stack: 'total',
      itemStyle: { color: '#909399' },
      data: Array.from({ length: Math.min(days, 7) }, () => Math.floor(Math.random() * 10))
    }
  ]
}))

const deviceNames = ['小明的 iPhone', 'MacBook Pro', '小米电视', 'iPad Air', 'PS5', '妈妈的手机', '工作电脑', '摄像头-客厅', '智能门锁', '小爱音箱Pro']
const deviceTypes = ['phone', 'computer', 'tv', 'tablet', 'console', 'phone', 'computer', 'camera', 'smart_home', 'smart_home']

const topDevices = ref(
  deviceNames.map((name, i) => ({
    name,
    type: deviceTypes[i],
    ip: `192.168.1.${100 + i}`,
    download: (Math.random() * 30 + 1) * 1024 * 1024 * 1024,
    upload: (Math.random() * 5 + 0.1) * 1024 * 1024 * 1024,
    duration: Math.floor(Math.random() * 86400 * 6)
  })).sort((a, b) => (b.download + b.upload) - (a.download + a.upload))
)

const maxTotal = computed(() => Math.max(...topDevices.value.map(d => d.download + d.upload)))

function refresh() {
  ElMessage.success('数据已刷新')
}

function onExport(cmd) {
  ElMessage.success(`已导出 ${cmd.toUpperCase()} 报表`)
}

onMounted(() => {})
</script>

<style scoped>
.mb-4 { margin-bottom: 16px; }
.card-title { font-weight: 600; }
.flex-between { display: flex; justify-content: space-between; align-items: center; }
.chart-lg { width: 100%; height: 360px; }
.chart-md { width: 100%; height: 300px; }
.kpi { display: flex; align-items: center; gap: 16px; }
.kpi-icon {
  width: 56px; height: 56px; border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  font-size: 28px;
}
.kpi-icon.devices { background: #ecf5ff; }
.kpi-icon.traffic { background: #f0f9eb; }
.kpi-icon.connect { background: #fdf6ec; }
.kpi-icon.alert { background: #fef0f0; }
.kpi-label { font-size: 13px; color: #909399; margin-bottom: 4px; }
.kpi-value { font-size: 26px; font-weight: 600; color: #303133; }
.kpi-trend { font-size: 12px; margin-top: 4px; }
.kpi-trend.up { color: #67c23a; }
.kpi-trend.down { color: #f56c6c; }
.dev-row { display: flex; align-items: center; gap: 10px; }
.dev-info { display: flex; flex-direction: column; gap: 2px; }
.dev-name { font-weight: 500; }
.dev-sub { font-size: 12px; color: #909399; }
</style>
