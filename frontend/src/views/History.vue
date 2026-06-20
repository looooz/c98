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
          <el-select v-model="deviceFilter" placeholder="全部设备" clearable style="width: 200px">
            <el-option label="主路由器" value="1" />
            <el-option label="小明的 iPhone 13" value="2" />
            <el-option label="妈妈的手机" value="3" />
            <el-option label="MacBook Pro" value="4" />
          </el-select>
        </el-form-item>
        <el-form-item label="事件类型">
          <el-select v-model="eventType" placeholder="全部" clearable style="width: 150px">
            <el-option label="接入" value="connect" />
            <el-option label="断开" value="disconnect" />
            <el-option label="IP变更" value="ip_change" />
            <el-option label="封禁" value="block" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="search">查询</el-button>
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
      <el-timeline>
        <el-timeline-item
          v-for="item in historyList"
          :key="item.id"
          :timestamp="formatDateTime(item.time)"
          :type="eventColor(item.type)"
          :hollow="item.type === 'disconnect'"
          placement="top"
        >
          <el-card shadow="never" class="tl-card">
            <div class="tl-header">
              <div class="flex items-center gap-2">
                <el-tag :type="eventTag(item.type)" size="small" effect="light">
                  {{ eventLabel(item.type) }}
                </el-tag>
                <span class="device-emoji">{{ getDeviceIcon(item.deviceType) }}</span>
                <span class="dev-name">{{ item.deviceName }}</span>
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
        />
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Search, RefreshLeft, Download } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
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
const total = ref(86)

const stats = ref({
  total: 86,
  connect: 48,
  disconnect: 38,
  avgDuration: 4.2
})

const now = Date.now()
const historyList = ref([
  { id: 1, type: 'connect', deviceName: '小明的 iPhone 13', deviceType: 'phone', ip: '192.168.1.101', mac: 'AA:BB:CC:DD:EE:01', vendor: 'Apple', duration: null, signal: 85, band: '5GHz', ssid: 'MyWiFi-5G', time: now - 60000 * 5 },
  { id: 2, type: 'disconnect', deviceName: '妈妈的手机', deviceType: 'phone', ip: '192.168.1.102', mac: 'AA:BB:CC:DD:EE:02', vendor: 'Huawei', duration: 7200, signal: 70, band: '2.4GHz', ssid: 'MyWiFi', time: now - 60000 * 30 },
  { id: 3, type: 'connect', deviceName: '工作电脑', deviceType: 'computer', ip: '192.168.1.104', mac: '11:22:33:44:55:02', vendor: 'Dell', duration: null, signal: 90, band: '5GHz', ssid: 'MyWiFi-5G', time: now - 60000 * 120 },
  { id: 4, type: 'ip_change', deviceName: '小米电视', deviceType: 'tv', ip: '192.168.1.105', mac: '22:33:44:55:66:01', vendor: 'Xiaomi', duration: null, signal: 65, band: '5GHz', ssid: 'MyWiFi-5G', time: now - 60000 * 180 },
  { id: 5, type: 'block', deviceName: '未知设备', deviceType: 'unknown', ip: '192.168.1.200', mac: 'FF:EE:DD:CC:BB:AA', vendor: 'Unknown', duration: null, time: now - 60000 * 240 },
  { id: 6, type: 'disconnect', deviceName: 'iPad Air', deviceType: 'tablet', ip: '192.168.1.106', mac: '33:44:55:66:77:01', vendor: 'Apple', duration: 14400, signal: 80, band: '5GHz', ssid: 'MyWiFi-5G', time: now - 60000 * 360 },
  { id: 7, type: 'connect', deviceName: 'PS5', deviceType: 'console', ip: '192.168.1.107', mac: '44:55:66:77:88:01', vendor: 'Sony', duration: null, signal: 75, band: '5GHz', ssid: 'MyWiFi-5G', time: now - 60000 * 480 }
])

function eventLabel(t) {
  return { connect: '设备接入', disconnect: '设备断开', ip_change: 'IP 变更', block: '设备封禁' }[t] || t
}
function eventTag(t) {
  return { connect: 'success', disconnect: 'info', ip_change: 'warning', block: 'danger' }[t] || 'info'
}
function eventColor(t) {
  return { connect: 'success', disconnect: 'primary', ip_change: 'warning', block: 'danger' }[t] || 'primary'
}

const days = 7
const dayLabels = computed(() => {
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(now - (days - 1 - i) * 86400000)
    return `${d.getMonth() + 1}/${d.getDate()}`
  })
})

const trendChartOption = computed(() => ({
  tooltip: { trigger: 'axis' },
  legend: { data: ['接入', '断开'] },
  grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
  xAxis: { type: 'category', data: dayLabels.value },
  yAxis: { type: 'value' },
  series: [
    { name: '接入', type: 'bar', stack: 'total', data: Array.from({ length: days }, () => 5 + Math.floor(Math.random() * 10)), itemStyle: { color: '#67c23a' } },
    { name: '断开', type: 'bar', stack: 'total', data: Array.from({ length: days }, () => 4 + Math.floor(Math.random() * 8)), itemStyle: { color: '#f56c6c' } }
  ]
}))

const topBarOption = computed(() => ({
  tooltip: { trigger: 'axis' },
  grid: { left: '3%', right: '10%', bottom: '3%', containLabel: true },
  xAxis: { type: 'value' },
  yAxis: {
    type: 'category',
    data: ['PS5', 'iPad Air', '工作电脑', '妈妈的手机', '小明的 iPhone 13'],
    inverse: true
  },
  series: [{
    type: 'bar',
    data: [5, 8, 12, 18, 24],
    itemStyle: { color: '#409EFF', borderRadius: [0, 4, 4, 0] },
    label: { show: true, position: 'right', formatter: '{c}次' }
  }]
}))

function search() {
  ElMessage.success('查询完成')
}
function reset() {
  dateRange.value = []
  deviceFilter.value = ''
  eventType.value = ''
  ElMessage.info('已重置')
}

onMounted(() => {})
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
