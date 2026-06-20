<template>
  <div class="page-container">
    <el-row :gutter="16" class="mb-4">
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-content">
            <div class="stat-icon online">📱</div>
            <div class="stat-info">
              <div class="stat-label">在线设备</div>
              <div class="stat-value">{{ mockStats.online }}</div>
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
              <div class="stat-value">{{ mockStats.total }}</div>
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
              <div class="stat-value">{{ mockStats.todayTraffic }}</div>
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
              <div class="stat-value">{{ mockStats.alerts }}</div>
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
import { ref, computed } from 'vue'
import {
  formatBytes,
  getDeviceIcon,
  getDeviceTypeLabel,
  getDeviceTypeColor,
  relativeTime
} from '@/utils/format'

const mockStats = ref({
  online: 12,
  total: 28,
  todayTraffic: formatBytes(15.8 * 1024 * 1024 * 1024),
  alerts: 3
})

const hours = Array.from({ length: 24 }, (_, i) => `${i}:00`)

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
  xAxis: { type: 'category', boundaryGap: false, data: hours },
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
      data: Array.from({ length: 24 }, () => Math.random() * 50 * 1024 * 1024)
    },
    {
      name: '下载',
      type: 'line',
      smooth: true,
      areaStyle: { opacity: 0.3 },
      data: Array.from({ length: 24 }, () => Math.random() * 200 * 1024 * 1024)
    }
  ]
}))

const devicePieOption = computed(() => ({
  tooltip: { trigger: 'item' },
  legend: { bottom: '5%', left: 'center' },
  series: [{
    type: 'pie',
    radius: ['40%', '70%'],
    avoidLabelOverlap: false,
    label: { show: false },
    emphasis: { label: { show: true, fontSize: 14, fontWeight: 'bold' } },
    data: [
      { value: 10, name: '手机', itemStyle: { color: '#409EFF' } },
      { value: 5, name: '电脑', itemStyle: { color: '#67C23A' } },
      { value: 3, name: '平板', itemStyle: { color: '#E6A23C' } },
      { value: 2, name: '电视', itemStyle: { color: '#F56C6C' } },
      { value: 4, name: '智能家居', itemStyle: { color: '#909399' } },
      { value: 4, name: '其他', itemStyle: { color: '#BDC3C7' } }
    ]
  }]
}))

const recentDevices = ref([
  { id: 1, name: '小明的iPhone', ip: '192.168.1.101', type: 'phone', online: true },
  { id: 2, name: 'MacBook Pro', ip: '192.168.1.102', type: 'computer', online: true },
  { id: 3, name: '小米电视', ip: '192.168.1.105', type: 'tv', online: true },
  { id: 4, name: 'iPad Air', ip: '192.168.1.108', type: 'tablet', online: false },
  { id: 5, name: '智能门锁', ip: '192.168.1.115', type: 'smart_home', online: true }
])

const recentAlerts = ref([
  { level: 'high', message: '检测到异常流量：设备 192.168.1.101 流量激增', time: Date.now() - 1000 * 60 * 5 },
  { level: 'medium', message: '新设备接入网络：未知设备', time: Date.now() - 1000 * 60 * 30 },
  { level: 'low', message: '家长控制规则已生效：游戏设备已限制', time: Date.now() - 1000 * 60 * 60 * 2 }
])

const alertLevelTag = (level) => {
  const map = { critical: 'danger', high: 'warning', medium: '', low: 'info' }
  return map[level] || 'info'
}
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
