<template>
  <div class="page-container">
    <el-card class="mb-4">
      <template #header>
        <div class="card-header">
          <span>设备扫描</span>
          <div class="flex gap-2">
            <el-tag :type="scanning ? 'warning' : 'success'" effect="light">
              {{ scanning ? '扫描中...' : '空闲' }}
            </el-tag>
            <el-button
              type="primary"
              :icon="VideoPlay"
              :loading="scanning"
              @click="startScan"
            >
              {{ scanning ? '扫描中' : '开始扫描' }}
            </el-button>
          </div>
        </div>
      </template>

      <el-row :gutter="16">
        <el-col :span="8">
          <el-form label-position="top">
            <el-form-item label="IP 范围">
              <el-input v-model="scanForm.ipRange" placeholder="例如: 192.168.1.0/24 或 192.168.1.1-192.168.1.254" />
            </el-form-item>
            <el-form-item label="扫描类型">
              <el-checkbox-group v-model="scanForm.types">
                <el-checkbox label="arp">ARP 扫描</el-checkbox>
                <el-checkbox label="icmp">ICMP Ping</el-checkbox>
                <el-checkbox label="port">端口扫描</el-checkbox>
              </el-checkbox-group>
            </el-form-item>
            <el-form-item label="超时时间 (ms)">
              <el-slider v-model="scanForm.timeout" :min="100" :max="5000" :step="100" show-input />
            </el-form-item>
          </el-form>
        </el-col>
        <el-col :span="16">
          <div class="scan-progress" v-if="scanning">
            <div class="radar-container">
              <div class="radar">
                <div class="radar-sweep"></div>
                <div class="radar-circle c1"></div>
                <div class="radar-circle c2"></div>
                <div class="radar-circle c3"></div>
                <div class="radar-dot" v-for="d in radarDots" :key="d.id" :style="d.style">
                  <span>{{ d.emoji }}</span>
                </div>
              </div>
            </div>
            <div class="scan-info">
              <div class="scan-stat">
                <span class="label">已扫描 IP:</span>
                <span class="value">{{ scanProgress.scanned }}</span>
              </div>
              <div class="scan-stat">
                <span class="label">发现设备:</span>
                <span class="value found">{{ scanProgress.found }}</span>
              </div>
              <div class="scan-stat">
                <span class="label">进度:</span>
                <el-progress :percentage="scanProgress.percent" :stroke-width="10" />
              </div>
            </div>
          </div>
          <el-empty v-else description="点击开始扫描以发现网络中的设备" />
        </el-col>
      </el-row>
    </el-card>

    <el-card>
      <template #header>
        <div class="card-header">
          <span>扫描结果</span>
          <div class="flex gap-2">
            <el-input
              v-model="searchText"
              placeholder="搜索设备..."
              style="width: 240px"
              clearable
            >
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>
          </div>
        </div>
      </template>

      <el-table :data="filteredDevices" v-loading="loading" stripe>
        <el-table-column label="图标" width="60" align="center">
          <template #default="{ row }">
            <span class="device-emoji">{{ getDeviceIcon(row.type) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="ip" label="IP 地址" width="140" />
        <el-table-column prop="mac" label="MAC 地址" width="170">
          <template #default="{ row }">{{ formatMac(row.mac) }}</template>
        </el-table-column>
        <el-table-column prop="name" label="主机名" min-width="150" />
        <el-table-column prop="vendor" label="厂商" min-width="150">
          <template #default="{ row }">
            <div class="vendor-cell">
              <span>{{ getVendorLogo(row.vendor) }}</span>
              <span>{{ row.vendor || '未知' }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="类型" width="100">
          <template #default="{ row }">
            <el-select
              v-model="row.type"
              size="small"
              @change="onTypeChange(row)"
              placeholder="选择类型"
            >
              <el-option
                v-for="t in deviceTypeList"
                :key="t.value"
                :label="t.label"
                :value="t.value"
              >
                <span>{{ t.icon }} {{ t.label }}</span>
              </el-option>
            </el-select>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="90" align="center">
          <template #default="{ row }">
            <el-tag size="small" :type="row.online ? 'success' : 'info'">
              {{ row.online ? '在线' : '离线' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="160" fixed="right">
          <template #default="{ row }">
            <el-button size="small" type="primary" link @click="editDevice(row)">编辑</el-button>
            <el-button size="small" type="success" link @click="addToDevices(row)">加入管理</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed, reactive, onMounted, onUnmounted } from 'vue'
import { VideoPlay, Search } from '@element-plus/icons-vue'
import { useDeviceStore } from '@/stores/device'
import { devices } from '@/api'
import { ElMessage, ElMessageBox } from 'element-plus'
import ws from '@/utils/websocket'
import {
  formatMac,
  getDeviceIcon,
  getVendorLogo,
  getDeviceTypeList
} from '@/utils/format'

const deviceStore = useDeviceStore()
const loading = ref(false)
const scanning = ref(false)
const searchText = ref('')

const scanForm = reactive({
  ipRange: '192.168.1.0/24',
  types: ['arp', 'icmp'],
  timeout: 1000
})

const scanProgress = reactive({
  scanned: 0,
  found: 0,
  percent: 0
})

const deviceTypeList = getDeviceTypeList()

const deviceList = ref([])

const filteredDevices = computed(() => {
  if (!searchText.value) return deviceList.value
  const q = searchText.value.toLowerCase()
  return deviceList.value.filter(d =>
    d.ip.includes(q) ||
    d.name.toLowerCase().includes(q) ||
    (d.vendor && d.vendor.toLowerCase().includes(q)) ||
    (d.mac && d.mac.toLowerCase().includes(q))
  )
})

const radarDots = ref([])

function generateRadarDots(count) {
  const emojis = ['📱', '💻', '📡', '📺', '🎮', '🏠', '📷', '❓']
  const dots = []
  for (let i = 0; i < Math.min(count, 12); i++) {
    const angle = (i / 12) * Math.PI * 2
    const dist = 20 + (i % 3) * 20
    const x = 50 + Math.cos(angle) * dist
    const y = 50 + Math.sin(angle) * dist
    dots.push({
      id: i,
      style: { left: `${x}%`, top: `${y}%` },
      emoji: emojis[i % emojis.length]
    })
  }
  radarDots.value = dots
}

async function fetchDeviceList() {
  loading.value = true
  try {
    const res = await devices.getList()
    const list = res?.data?.list || res?.data || res?.list || []
    deviceList.value = Array.isArray(list) ? list : []
  } catch (e) {
  console.error('获取设备列表失败:', e)
  } finally {
    loading.value = false
  }
}

function handleScanProgress(data) {
  scanProgress.scanned = data?.scanned ?? scanProgress.scanned
  scanProgress.found = data?.found ?? scanProgress.found
  scanProgress.percent = data?.percent ?? scanProgress.percent
  generateRadarDots(scanProgress.found)
}

function handleScanComplete(data) {
  scanning.value = false
  scanProgress.percent = 100
  ElMessage.success(`扫描完成，共发现 ${data?.found || deviceList.value.length} 台设备`)
  fetchDeviceList()
}

async function startScan() {
  if (!scanForm.ipRange) {
    ElMessage.warning('请输入 IP 范围')
    return
  }
  try {
    scanProgress.scanned = 0
    scanProgress.found = 0
    scanProgress.percent = 0
    generateRadarDots(0)
    scanning.value = true

    await devices.scan()
  } catch (e) {
    console.error('扫描失败:', e)
    ElMessage.error('扫描失败')
    scanning.value = false
  }
}

function onTypeChange(row) {
  devices.setType(row.id, row.type).then(() => {
    ElMessage.success('设备类型已更新')
  }).catch(() => {
    ElMessage.error('更新失败')
  })
}

function editDevice(row) {
  ElMessageBox.prompt('请输入设备名称', '编辑设备', {
    inputValue: row.name,
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    inputPattern: /.+/,
    inputErrorMessage: '名称不能为空'
  }).then(({ value }) => {
    devices.setName(row.id, value).then(() => {
      row.name = value
      ElMessage.success('修改成功')
    }).catch(() => {
      ElMessage.error('修改失败')
    })
  }).catch(() => {})
}

function addToDevices(row) {
  deviceStore.addDevice(row)
  ElMessage.success(`已添加设备：${row.name || row.ip}`)
}

let scanProgressHandler = null
let scanCompleteHandler = null

onMounted(() => {
  fetchDeviceList()
  ws.connect()
  scanProgressHandler = ws.on('scan_progress', handleScanProgress)
  scanCompleteHandler = ws.on('scan_complete', handleScanComplete)
})

onUnmounted(() => {
  if (scanProgressHandler) {
    ws.off('scan_progress', scanProgressHandler)
  }
  if (scanCompleteHandler) {
    ws.off('scan_complete', scanCompleteHandler)
  }
})
</script>

<style scoped>
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
}

.scan-progress {
  display: flex;
  gap: 24px;
  align-items: center;
}

.radar-container {
  flex-shrink: 0;
}

.radar {
  width: 280px;
  height: 280px;
  position: relative;
  border-radius: 50%;
  background: linear-gradient(135deg, #00395a 0%, #001d2b 100%);
  overflow: hidden;
}

.radar-circle {
  position: absolute;
  border-radius: 50%;
  border: 1px dashed rgba(64, 158, 255, 0.3);
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.radar-circle.c1 { width: 33%; height: 33%; }
.radar-circle.c2 { width: 66%; height: 66%; }
.radar-circle.c3 { width: 95%; height: 95%; }

.radar-sweep {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 50%;
  height: 50%;
  transform-origin: 0 0;
  background: linear-gradient(45deg, rgba(64, 158, 255, 0) 0%, rgba(64, 158, 255, 0.6) 100%);
  border-radius: 100% 0 0 0;
  animation: sweep 3s linear infinite;
}

@keyframes sweep {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.radar-dot {
  position: absolute;
  transform: translate(-50%, -50%);
  font-size: 16px;
  animation: pop 0.5s ease-out;
}

@keyframes pop {
  from { transform: translate(-50%, -50%) scale(0); opacity: 0; }
  to { transform: translate(-50%, -50%) scale(1); opacity: 1; }
}

.scan-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.scan-stat {
  display: flex;
  align-items: center;
  gap: 12px;
}

.scan-stat .label {
  width: 100px;
  color: #909399;
}

.scan-stat .value {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}

.scan-stat .value.found {
  color: #67c23a;
}

.device-emoji {
  font-size: 22px;
}

.vendor-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.flex {
  display: flex;
}
.gap-2 {
  gap: 8px;
}
.mb-4 {
  margin-bottom: 16px;
}
</style>
