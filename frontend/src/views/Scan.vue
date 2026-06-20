<template>
  <div class="page-container">
    <el-card class="mb-4">
      <template #header>
        <div class="card-header">
          <span>设备扫描</span>
          <div class="flex gap-2">
            <el-tag :type="deviceStore.scanning ? 'warning' : 'success'" effect="light">
              {{ deviceStore.scanning ? '扫描中...' : '空闲' }}
            </el-tag>
            <el-button
              type="primary"
              :icon="VideoPlay"
              :loading="deviceStore.scanning"
              @click="startScan"
            >
              {{ deviceStore.scanning ? '扫描中' : '开始扫描' }}
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
          <div class="scan-progress" v-if="deviceStore.scanning">
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
import { ref, computed, reactive, onMounted } from 'vue'
import { VideoPlay, Search } from '@element-plus/icons-vue'
import { useDeviceStore } from '@/stores/device'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  formatMac,
  getDeviceIcon,
  getVendorLogo,
  getDeviceTypeList
} from '@/utils/format'

const deviceStore = useDeviceStore()
const loading = ref(false)
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

const mockDevices = ref([
  { id: 1, ip: '192.168.1.1', mac: '00:1A:2B:3C:4D:01', name: 'Router-Main', vendor: 'TP-Link', type: 'router', online: true },
  { id: 2, ip: '192.168.1.101', mac: 'AA:BB:CC:DD:EE:01', name: 'iPhone-13', vendor: 'Apple', type: 'phone', online: true },
  { id: 3, ip: '192.168.1.102', mac: '11:22:33:44:55:01', name: 'MacBook-Pro', vendor: 'Apple', type: 'computer', online: true },
  { id: 4, ip: '192.168.1.103', mac: '22:33:44:55:66:01', name: 'Mi-TV-Box', vendor: 'Xiaomi', type: 'tv', online: true },
  { id: 5, ip: '192.168.1.104', mac: '33:44:55:66:77:01', name: 'iPad-Air', vendor: 'Apple', type: 'tablet', online: false },
  { id: 6, ip: '192.168.1.105', mac: '44:55:66:77:88:01', name: 'PS5', vendor: 'Sony', type: 'console', online: true },
  { id: 7, ip: '192.168.1.110', mac: '55:66:77:88:99:01', name: 'Smart-Door-Lock', vendor: 'Xiaomi', type: 'smart_home', online: true },
  { id: 8, ip: '192.168.1.115', mac: '66:77:88:99:AA:01', name: 'Unknown-Device', vendor: 'Unknown', type: 'unknown', online: true }
])

const filteredDevices = computed(() => {
  if (!searchText.value) return mockDevices.value
  const q = searchText.value.toLowerCase()
  return mockDevices.value.filter(d =>
    d.ip.includes(q) ||
    d.name.toLowerCase().includes(q) ||
    (d.vendor && d.vendor.toLowerCase().includes(q)) ||
    (d.mac && d.mac.toLowerCase().includes(q))
  )
})

const radarDots = ref([])

function generateDots() {
  radarDots.value = Array.from({ length: 8 }, (_, i) => {
    const angle = (i / 8) * Math.PI * 2
    const dist = 20 + Math.random() * 60
    const x = 50 + Math.cos(angle) * dist
    const y = 50 + Math.sin(angle) * dist
    return {
      id: i,
      style: { left: `${x}%`, top: `${y}%` },
      emoji: ['📱', '💻', '📡', '📺', '🎮', '🏠', '📷', '❓'][i]
    }
  })
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
    generateDots()
    deviceStore.startScan()

    const total = 50
    let foundCount = 0
    for (let i = 1; i <= total; i++) {
      await new Promise(r => setTimeout(r, 60))
      scanProgress.scanned = i
      if (Math.random() > 0.7) foundCount++
      scanProgress.found = foundCount
      scanProgress.percent = Math.floor((i / total) * 100)
    }
    ElMessage.success(`扫描完成，共发现 ${mockDevices.value.length} 台设备`)
  } catch (e) {
    ElMessage.error('扫描失败')
  } finally {
    setTimeout(() => {
      deviceStore.scanning = false
    }, 500)
  }
}

function onTypeChange(row) {
  ElMessage.success(`设备类型已更新`)
}

function editDevice(row) {
  ElMessageBox.prompt('请输入设备名称', '编辑设备', {
    inputValue: row.name,
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    inputPattern: /.+/,
    inputErrorMessage: '名称不能为空'
  }).then(({ value }) => {
    row.name = value
    ElMessage.success('修改成功')
  }).catch(() => {})
}

function addToDevices(row) {
  deviceStore.addDevice(row)
  ElMessage.success(`已添加设备：${row.name || row.ip}`)
}

onMounted(() => {
  generateDots()
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
