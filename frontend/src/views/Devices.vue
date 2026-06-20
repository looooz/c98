<template>
  <div class="page-container">
    <el-alert
      title="数据来源：真实局域网扫描"
      type="success"
      :closable="false"
      show-icon
      class="mb-4"
      description="设备列表通过 ARP + ICMP Ping 扫描发现，数据来自真实网络"
    />

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
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Refresh" @click="loadData">刷新</el-button>
          <el-button type="success" :icon="VideoPlay" @click="scanDevice">扫描</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-row :gutter="16" class="mb-4">
      <el-col :span="6">
        <el-statistic title="设备总数" :value="total" />
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
        <el-card shadow="hover" class="stat-card">
          <div class="stat-label">最近扫描</div>
          <div class="stat-value">
            <el-tag v-if="lastScanTime" type="info" size="large">{{ lastScanTimeText }}</el-tag>
            <span v-else style="color: #909399; font-size: 14px;">暂无数据</span>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-card>
      <el-table
        :data="deviceList"
        v-loading="loading"
        stripe
      >
        <el-table-column label="#" width="60" type="index" />
        <el-table-column label="设备" min-width="200">
          <template #default="{ row }">
            <div class="device-row">
              <el-avatar :size="40" :style="{ background: getDeviceTypeColor(row.device_type || row.type) + '20' }">
                <span style="font-size: 20px">{{ getDeviceIcon(row.device_type || row.type) }}</span>
              </el-avatar>
              <div class="device-info">
                <div class="device-name">
                  {{ row.custom_name || row.hostname || row.name || row.ip }}
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
            <el-tag :color="getDeviceTypeColor(row.device_type || row.type)" effect="light" size="small">
              {{ getDeviceTypeLabel(row.device_type || row.type) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作系统" width="110">
          <template #default="{ row }">{{ row.os_info || '-' }}</template>
        </el-table-column>
        <el-table-column prop="first_seen" label="首次发现" width="170">
          <template #default="{ row }">{{ formatDateTime(row.first_seen) }}</template>
        </el-table-column>
        <el-table-column prop="last_seen" label="最近在线" width="170">
          <template #default="{ row }">{{ relativeTime(row.last_seen) }}</template>
        </el-table-column>
        <el-table-column label="状态" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="row.is_online ? 'success' : 'info'" size="small" effect="light">
              {{ row.is_online ? '在线' : '离线' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button size="small" type="primary" link @click="viewDetail(row)">详情</el-button>
            <el-button size="small" type="warning" link @click="editDevice(row)">编辑</el-button>
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
          @size-change="loadData"
          @current-change="loadData"
        />
      </div>
    </el-card>

    <el-dialog v-model="showDialog" :title="dialogTitle" width="500px">
      <el-form :model="form" label-width="100px">
        <el-form-item label="设备名称">
          <el-input v-model="form.name" placeholder="请输入设备名称" />
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
          <el-input v-model="form.notes" type="textarea" :rows="3" />
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
import { Search, Refresh, VideoPlay, CircleCheck, CircleClose } from '@element-plus/icons-vue'
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
import { devices as deviceApi } from '@/api'

const loading = ref(false)
const searchText = ref('')
const filterType = ref('')
const filterStatus = ref('')
const page = ref(1)
const pageSize = ref(10)
const showDialog = ref(false)
const dialogTitle = ref('编辑设备')
const editingDevice = ref(null)
const deviceList = ref([])
const total = ref(0)
const lastScanTime = ref(null)

const deviceTypeList = getDeviceTypeList()

const form = reactive({
  name: '',
  type: 'unknown',
  notes: ''
})

const onlineCount = computed(() => deviceList.value.filter(d => d.is_online).length)
const offlineCount = computed(() => deviceList.value.filter(d => !d.is_online).length)
const lastScanTimeText = computed(() => lastScanTime.value ? relativeTime(lastScanTime.value) : '-')

async function loadData() {
  loading.value = true
  try {
    const res = await deviceApi.getList({
      page: page.value,
      pageSize: pageSize.value,
      search: searchText.value || undefined,
      type: filterType.value || undefined,
      status: filterStatus.value || undefined
    })
    if (res.success && res.data) {
      deviceList.value = res.data.list || []
      total.value = res.data.total || 0
      if (deviceList.value.length > 0) {
        const latest = deviceList.value.reduce((a, b) => 
          new Date(a.last_seen) > new Date(b.last_seen) ? a : b
        )
        lastScanTime.value = latest.last_seen
      }
    } else {
      ElMessage.error(res.message || '加载设备列表失败')
    }
  } catch (e) {
    console.error('加载设备列表失败:', e)
    ElMessage.error('加载设备列表失败')
  } finally {
    loading.value = false
  }
}

async function scanDevice() {
  try {
    ElMessage.info('正在启动扫描，请稍候...')
    const res = await deviceApi.scan()
    if (res.success) {
      ElMessage.success('扫描已启动，请稍候刷新查看结果')
      setTimeout(() => loadData(), 3000)
    } else {
      ElMessage.error(res.message || '扫描启动失败')
    }
  } catch (e) {
    ElMessage.error('扫描启动失败')
  }
}

function editDevice(row) {
  editingDevice.value = row
  Object.assign(form, {
    name: row.custom_name || row.hostname || row.name || '',
    type: row.device_type || row.type || 'unknown',
    notes: row.notes || ''
  })
  showDialog.value = true
}

async function saveDevice() {
  if (!form.name) {
    ElMessage.warning('请输入设备名称')
    return
  }
  try {
    if (editingDevice.value) {
      const res = await deviceApi.setName(editingDevice.value.id, form.name)
      if (res.success) {
        editingDevice.value.custom_name = form.name
        ElMessage.success('修改成功')
        loadData()
      } else {
        ElMessage.error(res.message || '修改失败')
      }
    }
    showDialog.value = false
  } catch (e) {
    ElMessage.error('保存失败')
  }
}

function viewDetail(row) {
  const name = row.custom_name || row.hostname || row.name || row.ip
  ElMessageBox.alert(
    `设备名称: ${name}\nIP: ${row.ip}\nMAC: ${formatMac(row.mac)}\n厂商: ${row.vendor || '未知'}\n类型: ${getDeviceTypeLabel(row.device_type || row.type)}\n系统: ${row.os_info || '未知'}\n首次发现: ${formatDateTime(row.first_seen)}\n最近在线: ${formatDateTime(row.last_seen)}\n状态: ${row.is_online ? '在线' : '离线'}`,
    '设备详情',
    { confirmButtonText: '关闭' }
  )
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.mb-4 {
  margin-bottom: 16px;
}

.stat-card {
  padding: 10px 0;
}

.stat-label {
  font-size: 14px;
  color: #909399;
  margin-bottom: 8px;
}

.stat-value {
  font-size: 24px;
  font-weight: 600;
  color: #303133;
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
