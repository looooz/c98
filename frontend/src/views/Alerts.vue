<template>
  <div class="page-container">
    <el-row :gutter="16" class="mb-4">
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-icon all">📋</div>
          <div>
            <div class="stat-label">全部告警</div>
            <div class="stat-value">{{ stats.total }}</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-icon critical">🚨</div>
          <div>
            <div class="stat-label">未读告警</div>
            <div class="stat-value danger">{{ stats.unread }}</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-icon resolved">✅</div>
          <div>
            <div class="stat-label">已处理</div>
            <div class="stat-value success">{{ stats.resolved }}</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-icon rate">📈</div>
          <div>
            <div class="stat-label">本周较上周</div>
            <div class="stat-value">{{ stats.trend }}</div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="16" class="mb-4">
      <el-col :span="8">
        <el-card>
          <template #header><div class="card-title">告警级别分布</div></template>
          <v-chart class="chart" :option="levelPieOption" autoresize />
        </el-card>
      </el-col>
      <el-col :span="16">
        <el-card>
          <template #header><div class="card-title">告警趋势（近7天）</div></template>
          <v-chart class="chart" :option="trendChartOption" autoresize />
        </el-card>
      </el-col>
    </el-row>

    <el-card>
      <template #header>
        <div class="flex-between">
          <div class="card-title">告警列表</div>
          <div class="flex gap-2">
            <el-select v-model="filterLevel" placeholder="级别" clearable style="width: 130px" size="default" @change="handleFilterChange">
              <el-option label="严重" value="critical" />
              <el-option label="高" value="high" />
              <el-option label="中" value="medium" />
              <el-option label="低" value="low" />
            </el-select>
            <el-select v-model="filterRead" placeholder="状态" clearable style="width: 130px" @change="handleFilterChange">
              <el-option label="未读" value="unread" />
              <el-option label="已读" value="read" />
              <el-option label="已处理" value="resolved" />
            </el-select>
            <el-input v-model="searchText" placeholder="搜索..." style="width: 200px" clearable @clear="handleSearch" @keyup.enter="handleSearch">
              <template #prefix><el-icon><Search /></el-icon></template>
            </el-input>
            <el-button :icon="Check" @click="markAllRead">全部已读</el-button>
            <el-button type="danger" :icon="Delete" @click="clearAll">清空所有</el-button>
          </div>
        </div>
      </template>

      <el-table
        :data="alerts"
        v-loading="loading"
        @selection-change="onSelectionChange"
        stripe
        row-class-name="alert-row"
        :row-key="row => row.id"
      >
        <el-table-column type="selection" width="50" />
        <el-table-column label="级别" width="90" align="center">
          <template #default="{ row }">
            <el-tooltip :content="levelLabel(row.level)" placement="top">
              <div :class="['level-badge', row.level]">
                {{ levelLabel(row.level).charAt(0) }}
              </div>
            </el-tooltip>
          </template>
        </el-table-column>
        <el-table-column label="类型" width="120">
          <template #default="{ row }">
            <el-tag :type="typeTag(row.type)" effect="light" size="small">
              {{ typeLabel(row.type) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="message" label="告警信息" min-width="300" show-overflow-tooltip />
        <el-table-column label="来源" width="160">
          <template #default="{ row }">
            <div class="src-row">
              <span class="src-icon">{{ getDeviceIcon(row.deviceType) }}</span>
              <span>{{ row.deviceName || row.sourceIp || '-' }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="时间" width="180">
          <template #default="{ row }">
            <el-tooltip :content="formatDateTime(row.time)">
              <span class="muted">{{ relativeTime(row.time) }}</span>
            </el-tooltip>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag
              v-if="row.resolved"
              type="success"
              size="small"
              effect="plain"
            >已处理</el-tag>
            <el-tag
              v-else-if="row.read"
              type="info"
              size="small"
              effect="plain"
            >已读</el-tag>
            <el-badge
              v-else
              value="新"
              type="danger"
              class="new-badge"
            >
              <el-tag size="small" type="warning" effect="plain">未读</el-tag>
            </el-badge>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <el-button size="small" type="primary" link @click="viewDetail(row)">详情</el-button>
            <el-button
              v-if="!row.read"
              size="small" type="success" link
              @click="markRead(row)"
            >标为已读</el-button>
            <el-button
              v-if="!row.resolved"
              size="small" type="warning" link
              @click="resolve(row)"
            >处理</el-button>
            <el-button size="small" type="danger" link @click="removeOne(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrap">
        <el-pagination
          v-model:current-page="page"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="total"
          layout="total, sizes, prev, pager, next, jumper"
          background
          @current-change="handlePageChange"
          @size-change="handleSizeChange"
        />
      </div>
    </el-card>

    <el-drawer v-model="showDetail" title="告警详情" size="480px">
      <template v-if="current">
        <el-descriptions :column="1" border size="default">
          <el-descriptions-item label="级别">
            <el-tag :type="levelTag(current.level)" effect="light">{{ levelLabel(current.level) }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="类型">
            <el-tag :type="typeTag(current.type)" effect="light">{{ typeLabel(current.type) }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="告警信息">{{ current.message }}</el-descriptions-item>
          <el-descriptions-item label="来源设备">
            <div class="src-row">
              <span style="font-size:18px">{{ getDeviceIcon(current.deviceType) }}</span>
              <span>{{ current.deviceName }}</span>
            </div>
          </el-descriptions-item>
          <el-descriptions-item label="源 IP">{{ current.sourceIp }}</el-descriptions-item>
          <el-descriptions-item label="目标 IP">{{ current.targetIp || '-' }}</el-descriptions-item>
          <el-descriptions-item label="发生时间">{{ formatDateTime(current.time) }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag v-if="current.resolved" type="success">已处理</el-tag>
            <el-tag v-else-if="current.read" type="info">已读未处理</el-tag>
            <el-tag v-else type="warning">未读</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="详细描述" v-if="current.detail">
            {{ current.detail }}
          </el-descriptions-item>
        </el-descriptions>

        <el-divider />
        <div class="drawer-actions">
          <el-button
            v-if="!current.read"
            type="primary"
            @click="markRead(current); showDetail = false"
          >标为已读</el-button>
          <el-button
            v-if="!current.resolved"
            type="success"
            @click="resolve(current); showDetail = false"
          >标记已处理</el-button>
          <el-button type="danger" @click="removeOne(current); showDetail = false">删除告警</el-button>
        </div>
      </template>
    </el-drawer>
  </div>
</template>

<script setup>
import { ref, computed, reactive, onMounted } from 'vue'
import { Search, Check, Delete } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { formatDateTime, relativeTime, getDeviceIcon } from '@/utils/format'
import { alerts as alertsApi } from '@/api'

const loading = ref(false)
const searchText = ref('')
const filterLevel = ref('')
const filterRead = ref('')
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)
const showDetail = ref(false)
const current = ref(null)
const selection = ref([])
const alerts = ref([])

const stats = reactive({
  total: 0,
  unread: 0,
  resolved: 0,
  trend: '-'
})

const levelPieOption = computed(() => ({
  tooltip: { trigger: 'item', formatter: '{b}: {c}条 ({d}%)' },
  legend: { bottom: 0 },
  series: [{
    type: 'pie',
    radius: ['45%', '70%'],
    center: ['50%', '45%'],
    itemStyle: { borderRadius: 6, borderWidth: 2, borderColor: '#fff' },
    label: { formatter: '{b}\n{d}%' },
    data: [
      { value: 0, name: '严重', itemStyle: { color: '#8B0000' } },
      { value: 0, name: '高', itemStyle: { color: '#f56c6c' } },
      { value: 0, name: '中', itemStyle: { color: '#e6a23c' } },
      { value: 0, name: '低', itemStyle: { color: '#909399' } }
    ]
  }]
}))

const trendChartOption = computed(() => ({
  tooltip: { trigger: 'axis' },
  legend: { data: ['严重', '高', '中', '低'] },
  grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
  xAxis: {
    type: 'category',
    data: ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
  },
  yAxis: { type: 'value' },
  series: [
    { name: '严重', type: 'line', stack: 'total', areaStyle: { opacity: 0.4 }, itemStyle: { color: '#8B0000' }, smooth: true, data: [0, 0, 0, 0, 0, 0, 0] },
    { name: '高', type: 'line', stack: 'total', areaStyle: { opacity: 0.4 }, itemStyle: { color: '#f56c6c' }, smooth: true, data: [0, 0, 0, 0, 0, 0, 0] },
    { name: '中', type: 'line', stack: 'total', areaStyle: { opacity: 0.4 }, itemStyle: { color: '#e6a23c' }, smooth: true, data: [0, 0, 0, 0, 0, 0, 0] },
    { name: '低', type: 'line', stack: 'total', areaStyle: { opacity: 0.4 }, itemStyle: { color: '#909399' }, smooth: true, data: [0, 0, 0, 0, 0, 0, 0] }
  ]
}))

function levelLabel(l) { return { critical: '严重', high: '高', medium: '中', low: '低' }[l] || l }
function levelTag(l) { return { critical: 'danger', high: 'warning', medium: '', low: 'info' }[l] || 'info' }
function typeLabel(t) {
  return { traffic: '流量', device: '设备', intrusion: '入侵检测', rule: '规则触发', system: '系统', vulnerability: '漏洞风险' }[t] || t
}
function typeTag(t) {
  return { traffic: '', device: 'success', intrusion: 'danger', rule: 'warning', system: 'info', vulnerability: 'danger' }[t] || 'info'
}

async function loadAlerts() {
  loading.value = true
  try {
    const params = {
      page: page.value,
      pageSize: pageSize.value
    }
    if (filterLevel.value) {
      params.level = filterLevel.value
    }
    if (filterRead.value) {
      params.read = filterRead.value === 'read' || filterRead.value === 'resolved' 
        ? true 
        : (filterRead.value === 'unread' ? false : undefined)
    }
    if (searchText.value) {
      params.keyword = searchText.value
    }
    const res = await alertsApi.getList(params)
    if (res.success) {
      alerts.value = res.data.list || []
      total.value = res.data.total || 0
      stats.total = res.data.total || 0
      stats.unread = res.data.unread_count || 0
    }
  } catch (err) {
    console.error('加载告警列表失败:', err)
  } finally {
    loading.value = false
  }
}

function handleFilterChange() {
  page.value = 1
  loadAlerts()
}

function handleSearch() {
  page.value = 1
  loadAlerts()
}

function handlePageChange() {
  loadAlerts()
}

function handleSizeChange() {
  page.value = 1
  loadAlerts()
}

function viewDetail(row) {
  current.value = row
  showDetail.value = true
  if (!row.read) {
    markRead(row)
  }
}

async function markRead(row) {
  try {
    const res = await alertsApi.markRead(row.id)
    if (res.success) {
      row.read = true
      stats.unread = Math.max(0, stats.unread - 1)
      ElMessage.success('已标为已读')
    }
  } catch (err) {
    console.error('标记已读失败:', err)
  }
}

async function markAllRead() {
  try {
    const res = await alertsApi.markAllRead()
    if (res.success) {
      alerts.value.forEach(a => a.read = true)
      stats.unread = 0
      ElMessage.success('全部已标为已读')
    }
  } catch (err) {
    console.error('全部标记已读失败:', err)
  }
}

function resolve(row) {
  row.read = true
  row.resolved = true
  stats.resolved += 1
  if (stats.unread > 0) {
    stats.unread -= 1
  }
  ElMessage.success('已标记为已处理')
}

async function removeOne(row) {
  try {
    await ElMessageBox.confirm('确定删除此告警吗？', '提示', { type: 'warning' })
    const res = await alertsApi.delete(row.id)
    if (res.success) {
      alerts.value = alerts.value.filter(a => a.id !== row.id)
      total.value = Math.max(0, total.value - 1)
      stats.total = Math.max(0, stats.total - 1)
      if (!row.read) {
        stats.unread = Math.max(0, stats.unread - 1)
      }
      if (row.resolved) {
        stats.resolved = Math.max(0, stats.resolved - 1)
      }
      ElMessage.success('已删除')
    }
  } catch {}
}

async function clearAll() {
  try {
    await ElMessageBox.confirm('确定清空所有告警吗？此操作不可恢复！', '警告', { type: 'error' })
    const res = await alertsApi.deleteAll()
    if (res.success) {
      alerts.value = []
      total.value = 0
      stats.total = 0
      stats.unread = 0
      stats.resolved = 0
      ElMessage.success('已清空')
    }
  } catch {}
}

function onSelectionChange(sel) { selection.value = sel }

onMounted(() => {
  loadAlerts()
})
</script>

<style scoped>
.mb-4 { margin-bottom: 16px; }
.card-title { font-weight: 600; }
.flex-between { display: flex; justify-content: space-between; align-items: center; }
.flex { display: flex; }
.gap-2 { gap: 8px; }
.muted { color: #909399; font-size: 13px; }
.stat-card { border-radius: 8px; }
.stat-card { display: flex !important; align-items: center; gap: 16px; }
.stat-card :deep(.el-card__body) { display: flex; align-items: center; gap: 16px; padding: 16px; }
.stat-icon {
  width: 54px; height: 54px; border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  font-size: 26px;
}
.stat-icon.all { background: #ecf5ff; }
.stat-icon.critical { background: #fef0f0; }
.stat-icon.resolved { background: #f0f9eb; }
.stat-icon.rate { background: #fdf6ec; }
.stat-label { font-size: 13px; color: #909399; margin-bottom: 4px; }
.stat-value { font-size: 24px; font-weight: 600; color: #303133; }
.stat-value.danger { color: #f56c6c; }
.stat-value.success { color: #67c23a; }
.chart { width: 100%; height: 280px; }
.src-row { display: flex; align-items: center; gap: 6px; }
.src-icon { font-size: 16px; }
.level-badge {
  width: 28px; height: 28px; border-radius: 50%;
  display: inline-flex; align-items: center; justify-content: center;
  color: #fff; font-weight: 600; font-size: 13px;
}
.level-badge.critical { background: #8B0000; }
.level-badge.high { background: #f56c6c; }
.level-badge.medium { background: #e6a23c; }
.level-badge.low { background: #909399; }
.new-badge .el-badge__content { top: 4px; right: 4px; }
.pagination-wrap { margin-top: 16px; display: flex; justify-content: flex-end; }
.drawer-actions { display: flex; gap: 10px; justify-content: flex-end; }
:deep(.alert-row.row-unread) { background: #fef9f3; }
</style>
