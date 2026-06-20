<template>
  <div class="page-container">
    <el-card class="mb-4">
      <el-form :inline="true">
        <el-form-item label="搜索">
          <el-input v-model="searchText" placeholder="IP/名称/MAC" clearable style="width: 240px">
            <template #prefix><el-icon><Search /></el-icon></template>
          </el-input>
        </el-form-item>
        <el-form-item label="类型">
          <el-select v-model="filterType" placeholder="全部类型" clearable style="width: 150px">
            <el-option
              v-for="t in deviceTypeList"
              :key="t.value"
              :label="t.label"
              :value="t.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="filterStatus" placeholder="全部状态" clearable style="width: 130px">
            <el-option label="在线" value="online" />
            <el-option label="离线" value="offline" />
            <el-option label="已封禁" value="blocked" />
          </el-select>
        </el-form-item>
        <el-form-item label="分组">
          <el-select v-model="filterGroup" placeholder="全部分组" clearable style="width: 150px">
            <el-option label="默认组" value="default" />
            <el-option label="家人设备" value="family" />
            <el-option label="IoT 设备" value="iot" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Refresh" @click="loadData">刷新</el-button>
          <el-button type="success" :icon="VideoPlay" @click="scanDevice">扫描</el-button>
          <el-button :icon="Plus" @click="openAddDialog">添加设备</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-row :gutter="16" class="mb-4">
      <el-col :span="6">
        <el-statistic title="设备总数" :value="mockDevices.length" />
      </el-col>
      <el-col :span="6">
        <el-statistic title="在线设备" :value="onlineCount" >
          <template #suffix><el-icon color="#67c23a"><CircleCheck /></el-icon></template>
        </el-statistic>
      </el-col>
      <el-col :span="6">
        <el-statistic title="离线设备" :value="offlineCount">
          <template #suffix><el-icon color="#909399"><CircleClose /></el-icon></template>
        </el-statistic>
      </el-col>
      <el-col :span="6">
        <el-statistic title="已封禁" :value="blockedCount">
          <template #suffix><el-icon color="#f56c6c"><Warning /></el-icon></template>
        </el-statistic>
      </el-col>
    </el-row>

    <el-card>
      <el-table
        :data="filteredDevices"
        v-loading="loading"
        stripe
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="50" />
        <el-table-column label="#" width="60" type="index" />
        <el-table-column label="设备" min-width="200">
          <template #default="{ row }">
            <div class="device-row">
              <el-avatar :size="40" :style="{ background: getDeviceTypeColor(row.type) + '20' }">
                <span style="font-size: 20px">{{ getDeviceIcon(row.type) }}</span>
              </el-avatar>
              <div class="device-info">
                <div class="device-name">
                  {{ row.name }}
                  <el-tag v-if="row.blocked" type="danger" size="small" effect="dark">已封禁</el-tag>
                </div>
                <div class="device-ip">{{ row.ip }} · {{ formatMac(row.mac) }}</div>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="vendor" label="厂商" width="140">
          <template #default="{ row }">
            <div class="vendor-info">
              <span>{{ getVendorLogo(row.vendor) }}</span>
              <span>{{ row.vendor || '未知' }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="类型" width="100">
          <template #default="{ row }">
            <el-tag :color="getDeviceTypeColor(row.type)" effect="light" size="small">
              {{ getDeviceTypeLabel(row.type) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="firstSeen" label="首次接入" width="170">
          <template #default="{ row }">{{ formatDateTime(row.firstSeen) }}</template>
        </el-table-column>
        <el-table-column prop="lastSeen" label="最近活动" width="170">
          <template #default="{ row }">{{ relativeTime(row.lastSeen) }}</template>
        </el-table-column>
        <el-table-column label="状态" width="80" align="center">
          <template #default="{ row }">
            <el-badge :is-dot="true" :type="row.online ? 'success' : 'info'" />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="240" fixed="right">
          <template #default="{ row }">
            <el-button size="small" type="primary" link @click="viewDetail(row)">详情</el-button>
            <el-button size="small" type="warning" link @click="editDevice(row)">编辑</el-button>
            <el-button
              size="small"
              :type="row.blocked ? 'success' : 'danger'"
              link
              @click="toggleBlock(row)"
            >
              {{ row.blocked ? '解封' : '封禁' }}
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrap">
        <el-pagination
          v-model:current-page="page"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50]"
          :total="filteredDevices.length"
          layout="total, sizes, prev, pager, next, jumper"
          background
        />
      </div>
    </el-card>

    <el-dialog v-model="showDialog" :title="dialogTitle" width="500px">
      <el-form :model="form" label-width="100px">
        <el-form-item label="设备名称">
          <el-input v-model="form.name" placeholder="请输入设备名称" />
        </el-form-item>
        <el-form-item label="IP 地址">
          <el-input v-model="form.ip" placeholder="例如: 192.168.1.100" />
        </el-form-item>
        <el-form-item label="MAC 地址">
          <el-input v-model="form.mac" placeholder="例如: AA:BB:CC:DD:EE:FF" />
        </el-form-item>
        <el-form-item label="设备类型">
          <el-select v-model="form.type" placeholder="请选择" style="width: 100%">
            <el-option
              v-for="t in deviceTypeList"
              :key="t.value"
              :label="t.label"
              :value="t.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="form.remark" type="textarea" :rows="3" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showDialog = false">取消</el-button>
        <el-button type="primary" @click="saveDevice">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, reactive, onMounted } from 'vue'
import { Search, Refresh, VideoPlay, Plus, CircleCheck, CircleClose, Warning } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  formatMac,
  formatDateTime,
  relativeTime,
  getDeviceIcon,
  getDeviceTypeLabel,
  getDeviceTypeColor,
  getVendorLogo,
  getDeviceTypeList
} from '@/utils/format'

const loading = ref(false)
const searchText = ref('')
const filterType = ref('')
const filterStatus = ref('')
const filterGroup = ref('')
const page = ref(1)
const pageSize = ref(10)
const showDialog = ref(false)
const dialogTitle = ref('添加设备')
const editingDevice = ref(null)

const deviceTypeList = getDeviceTypeList()

const form = reactive({
  name: '',
  ip: '',
  mac: '',
  type: 'unknown',
  remark: ''
})

const now = Date.now()
const mockDevices = ref([
  { id: 1, name: '主路由器', ip: '192.168.1.1', mac: '00:1A:2B:3C:4D:01', vendor: 'TP-Link', type: 'router', online: true, blocked: false, firstSeen: now - 86400000 * 30, lastSeen: now },
  { id: 2, name: '小明的 iPhone 13', ip: '192.168.1.101', mac: 'AA:BB:CC:DD:EE:01', vendor: 'Apple', type: 'phone', online: true, blocked: false, firstSeen: now - 86400000 * 20, lastSeen: now },
  { id: 3, name: '妈妈的手机', ip: '192.168.1.102', mac: 'AA:BB:CC:DD:EE:02', vendor: 'Huawei', type: 'phone', online: false, blocked: false, firstSeen: now - 86400000 * 18, lastSeen: now - 3600000 * 5 },
  { id: 4, name: 'MacBook Pro', ip: '192.168.1.103', mac: '11:22:33:44:55:01', vendor: 'Apple', type: 'computer', online: true, blocked: false, firstSeen: now - 86400000 * 15, lastSeen: now },
  { id: 5, name: '工作电脑', ip: '192.168.1.104', mac: '11:22:33:44:55:02', vendor: 'Dell', type: 'computer', online: false, blocked: false, firstSeen: now - 86400000 * 10, lastSeen: now - 86400000 },
  { id: 6, name: '小米电视', ip: '192.168.1.105', mac: '22:33:44:55:66:01', vendor: 'Xiaomi', type: 'tv', online: true, blocked: false, firstSeen: now - 86400000 * 25, lastSeen: now - 1800000 },
  { id: 7, name: 'iPad Air', ip: '192.168.1.106', mac: '33:44:55:66:77:01', vendor: 'Apple', type: 'tablet', online: false, blocked: false, firstSeen: now - 86400000 * 12, lastSeen: now - 3600000 * 12 },
  { id: 8, name: 'PS5', ip: '192.168.1.107', mac: '44:55:66:77:88:01', vendor: 'Sony', type: 'console', online: false, blocked: true, firstSeen: now - 86400000 * 8, lastSeen: now - 86400000 * 2 },
  { id: 9, name: '智能门锁', ip: '192.168.1.110', mac: '55:66:77:88:99:01', vendor: 'Xiaomi', type: 'smart_home', online: true, blocked: false, firstSeen: now - 86400000 * 6, lastSeen: now - 60000 },
  { id: 10, name: '摄像头-客厅', ip: '192.168.1.111', mac: '66:77:88:99:AA:01', vendor: 'Hikvision', type: 'camera', online: true, blocked: false, firstSeen: now - 86400000 * 5, lastSeen: now },
  { id: 11, name: '摄像头-门口', ip: '192.168.1.112', mac: '66:77:88:99:AA:02', vendor: 'Dahua', type: 'camera', online: true, blocked: false, firstSeen: now - 86400000 * 5, lastSeen: now },
  { id: 12, name: '小爱音箱', ip: '192.168.1.113', mac: '77:88:99:AA:BB:01', vendor: 'Xiaomi', type: 'smart_home', online: true, blocked: false, firstSeen: now - 86400000 * 4, lastSeen: now - 300000 }
])

const onlineCount = computed(() => mockDevices.value.filter(d => d.online).length)
const offlineCount = computed(() => mockDevices.value.filter(d => !d.online).length)
const blockedCount = computed(() => mockDevices.value.filter(d => d.blocked).length)

const filteredDevices = computed(() => {
  return mockDevices.value.filter(d => {
    if (searchText.value) {
      const q = searchText.value.toLowerCase()
      if (!d.ip.includes(q) && !d.name.toLowerCase().includes(q) && !d.mac.toLowerCase().includes(q)) {
        return false
      }
    }
    if (filterType.value && d.type !== filterType.value) return false
    if (filterStatus.value === 'online' && !d.online) return false
    if (filterStatus.value === 'offline' && d.online) return false
    if (filterStatus.value === 'blocked' && !d.blocked) return false
    return true
  })
})

function handleSelectionChange(sel) {
  console.log('Selected:', sel)
}

async function loadData() {
  loading.value = true
  try {
    await new Promise(r => setTimeout(r, 500))
    ElMessage.success('刷新成功')
  } finally {
    loading.value = false
  }
}

function scanDevice() {
  ElMessage.info('请前往设备扫描页面执行扫描')
}

function openAddDialog() {
  dialogTitle.value = '添加设备'
  editingDevice.value = null
  Object.assign(form, { name: '', ip: '', mac: '', type: 'unknown', remark: '' })
  showDialog.value = true
}

function editDevice(row) {
  dialogTitle.value = '编辑设备'
  editingDevice.value = row
  Object.assign(form, row)
  showDialog.value = true
}

function saveDevice() {
  if (!form.name) {
    ElMessage.warning('请输入设备名称')
    return
  }
  if (editingDevice.value) {
    Object.assign(editingDevice.value, form)
    ElMessage.success('修改成功')
  } else {
    mockDevices.value.push({
      id: Date.now(),
      ...form,
      online: false,
      blocked: false,
      firstSeen: Date.now(),
      lastSeen: Date.now()
    })
    ElMessage.success('添加成功')
  }
  showDialog.value = false
}

function viewDetail(row) {
  ElMessageBox.alert(
    `设备: ${row.name}\nIP: ${row.ip}\nMAC: ${formatMac(row.mac)}\n厂商: ${row.vendor || '未知'}\n首次接入: ${formatDateTime(row.firstSeen)}`,
    '设备详情',
    { confirmButtonText: '关闭' }
  )
}

async function toggleBlock(row) {
  try {
    await ElMessageBox.confirm(
      `确定要${row.blocked ? '解封' : '封禁'}设备「${row.name}」吗？`,
      '提示',
      { type: 'warning' }
    )
    row.blocked = !row.blocked
    ElMessage.success(row.blocked ? '已封禁' : '已解封')
  } catch {}
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.mb-4 {
  margin-bottom: 16px;
}

.device-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.device-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.device-name {
  font-weight: 500;
  color: #303133;
  display: flex;
  align-items: center;
  gap: 6px;
}

.device-ip {
  font-size: 12px;
  color: #909399;
}

.vendor-info {
  display: flex;
  align-items: center;
  gap: 6px;
}

.pagination-wrap {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}
</style>
