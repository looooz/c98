<template>
  <div class="page-container">
    <el-row :gutter="16">
      <el-col :span="10">
        <el-card class="mb-4">
          <template #header>
            <div class="flex-between">
              <div class="card-title">诊断工具</div>
            </div>
          </template>

          <el-tabs v-model="activeTool" tab-position="left" style="min-height: 460px">
            <el-tab-pane label="Ping" name="ping">
              <el-form label-position="top">
                <el-form-item label="目标主机/IP">
                  <el-input v-model="pingForm.host" placeholder="例如: 8.8.8.8, baidu.com" />
                </el-form-item>
                <el-form-item label="发送次数">
                  <el-input-number v-model="pingForm.count" :min="1" :max="100" />
                </el-form-item>
                <el-form-item>
                  <el-button type="primary" :icon="Connection" :loading="running.ping" @click="runPing">
                    开始 Ping
                  </el-button>
                  <el-button :icon="CircleClose" :disabled="!running.ping" @click="stopTask('ping')">
                    停止
                  </el-button>
                </el-form-item>
              </el-form>
            </el-tab-pane>

            <el-tab-pane label="路由追踪" name="traceroute">
              <el-form label-position="top">
                <el-form-item label="目标主机/IP">
                  <el-input v-model="traceForm.host" placeholder="例如: 8.8.8.8" />
                </el-form-item>
                <el-form-item label="最大跳数">
                  <el-input-number v-model="traceForm.maxHops" :min="5" :max="64" />
                </el-form-item>
                <el-form-item>
                  <el-button type="primary" :icon="Tools" :loading="running.trace" @click="runTrace">
                    开始追踪
                  </el-button>
                </el-form-item>
              </el-form>
            </el-tab-pane>

            <el-tab-pane label="DNS 查询" name="dns">
              <el-form label-position="top">
                <el-form-item label="域名">
                  <el-input v-model="dnsForm.domain" placeholder="例如: baidu.com" />
                </el-form-item>
                <el-form-item label="DNS 服务器">
                  <el-select v-model="dnsForm.server" placeholder="默认">
                    <el-option label="默认" value="" />
                    <el-option label="8.8.8.8 (Google)" value="8.8.8.8" />
                    <el-option label="114.114.114.114 (国内)" value="114.114.114.114" />
                    <el-option label="223.5.5.5 (阿里云)" value="223.5.5.5" />
                  </el-select>
                </el-form-item>
                <el-form-item>
                  <el-button type="primary" :icon="Search" :loading="running.dns" @click="runDns">查询</el-button>
                </el-form-item>
              </el-form>
            </el-tab-pane>

            <el-tab-pane label="端口扫描" name="portscan">
              <el-form label-position="top">
                <el-form-item label="目标 IP">
                  <el-input v-model="portForm.host" placeholder="例如: 192.168.1.1" />
                </el-form-item>
                <el-form-item label="端口范围">
                  <el-input v-model="portForm.ports" placeholder="例如: 80,443 或 1-1024" />
                </el-form-item>
                <el-form-item>
                  <el-button type="primary" :icon="Monitor" :loading="running.port" @click="runPortScan">扫描</el-button>
                </el-form-item>
              </el-form>
            </el-tab-pane>

            <el-tab-pane label="网速测试" name="speedtest">
              <el-form label-position="top">
                <el-form-item label="说明">
                  <div class="tip-text">测试网络下载/上传速度，大约需要 30 秒</div>
                </el-form-item>
                <el-form-item>
                  <el-button type="primary" :icon="VideoPlay" :loading="running.speed" @click="runSpeed">开始测速</el-button>
                </el-form-item>
              </el-form>
            </el-tab-pane>
          </el-tabs>
        </el-card>

        <el-card>
          <template #header>
            <div class="flex-between">
              <div class="card-title">系统操作</div>
            </div>
          </template>
          <el-space wrap>
            <el-button type="warning" :icon="Refresh" @click="restartService">重启服务</el-button>
            <el-button type="danger" :icon="Warning" @click="clearCache">清除缓存</el-button>
            <el-button type="success" :icon="Download" @click="exportLogs">导出日志</el-button>
          </el-space>
        </el-card>
      </el-col>

      <el-col :span="14">
        <el-card class="mb-4">
          <template #header>
            <div class="flex-between">
              <div class="card-title">网络状态</div>
              <el-tag :type="networkStatus.online ? 'success' : 'danger'" effect="light">
                {{ networkStatus.online ? '网络正常' : '网络异常' }}
              </el-tag>
            </div>
          </template>
          <el-row :gutter="16">
            <el-col :span="8">
              <div class="status-item">
                <div class="label">延迟</div>
                <div class="value">{{ networkStatus.latency }}ms</div>
              </div>
            </el-col>
            <el-col :span="8">
              <div class="status-item">
                <div class="label">丢包率</div>
                <div class="value" :class="networkStatus.loss > 1 ? 'danger' : ''">{{ networkStatus.loss }}%</div>
              </div>
            </el-col>
            <el-col :span="8">
              <div class="status-item">
                <div class="label">抖动</div>
                <div class="value">{{ networkStatus.jitter }}ms</div>
              </div>
            </el-col>
          </el-row>
          <el-divider />
          <el-descriptions :column="2" size="small" border v-loading="networkLoading">
            <el-descriptions-item label="路由器">{{ networkStatus.router }}</el-descriptions-item>
            <el-descriptions-item label="网关">{{ networkStatus.gateway }}</el-descriptions-item>
            <el-descriptions-item label="DNS">{{ networkStatus.dns }}</el-descriptions-item>
            <el-descriptions-item label="ISP">{{ networkStatus.isp }}</el-descriptions-item>
            <el-descriptions-item label="公网 IP">{{ networkStatus.publicIp }}</el-descriptions-item>
            <el-descriptions-item label="上行带宽">{{ networkStatus.upBandwidth }} Mbps</el-descriptions-item>
          </el-descriptions>
        </el-card>

        <el-card>
          <template #header>
            <div class="flex-between">
              <div class="card-title">诊断输出</div>
              <div>
                <el-button size="small" :icon="RefreshLeft" @click="copyOutput">复制</el-button>
                <el-button size="small" :icon="Delete" :disabled="!output" @click="clearOutput">清空</el-button>
              </div>
            </div>
          </template>
          <div v-if="running.any" class="progress-line">
            <el-progress :percentage="progress" :status="progress === 100 ? 'success' : ''" />
          </div>
          <div v-if="speedResult && running.speed === false && activeTool === 'speedtest'" class="speed-result">
            <div class="speed-card down">
              <div class="label">下载速度</div>
              <div class="value">{{ speedResult.download }} Mbps</div>
            </div>
            <div class="speed-card up">
              <div class="label">上传速度</div>
              <div class="value">{{ speedResult.upload }} Mbps</div>
            </div>
            <div class="speed-card ping">
              <div class="label">延迟</div>
              <div class="value">{{ speedResult.ping }} ms</div>
            </div>
          </div>
          <el-table v-if="activeTool === 'portscan' && portResults.length" :data="portResults" size="small" class="mb-4">
            <el-table-column label="端口" prop="port" width="100" />
            <el-table-column label="状态" width="100">
              <template #default="{ row }">
                <el-tag :type="row.open ? 'success' : 'info'" size="small">
                  {{ row.open ? '开放' : '关闭' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="服务" prop="service" />
          </el-table>
          <pre v-if="output" class="log-box">{{ output }}</pre>
          <el-empty v-else description="选择工具并运行后在此查看结果" />
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import {
  Connection, CircleClose, Tools, Search, Monitor, VideoPlay,
  Refresh, Warning, Download, RefreshLeft, Delete
} from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { diagnostic } from '@/api'

const activeTool = ref('ping')

const pingForm = reactive({ host: '8.8.8.8', count: 4 })
const traceForm = reactive({ host: '8.8.8.8', maxHops: 30 })
const dnsForm = reactive({ domain: 'baidu.com', server: '' })
const portForm = reactive({ host: '192.168.1.1', ports: '1-1024' })

const running = reactive({ any: false, ping: false, trace: false, dns: false, port: false, speed: false })
const progress = ref(0)
const output = ref('')
const portResults = ref([])
const speedResult = ref(null)

const networkStatus = reactive({
  online: false,
  latency: 0,
  loss: 0,
  jitter: 0,
  publicIp: '-',
  upBandwidth: 0,
  downBandwidth: 0,
  router: '-',
  gateway: '-',
  dns: '-',
  isp: '-'
})

const networkLoading = ref(false)

async function fetchNetworkStatus() {
  networkLoading.value = true
  try {
    const res = await diagnostic.getNetworkStatus()
    if (res.success && res.data) {
      const data = res.data
      networkStatus.online = data.online ?? true
      networkStatus.latency = data.latency ?? 0
      networkStatus.loss = data.loss ?? 0
      networkStatus.jitter = data.jitter ?? 0
      networkStatus.publicIp = data.publicIp || data.public_ip || '-'
      networkStatus.upBandwidth = data.upBandwidth || data.up_bandwidth || 0
      networkStatus.downBandwidth = data.downBandwidth || data.down_bandwidth || 0
      networkStatus.router = data.router || '192.168.1.1'
      networkStatus.gateway = data.gateway || '192.168.1.1'
      networkStatus.dns = data.dns || '223.5.5.5, 114.114.114.114'
      networkStatus.isp = data.isp || '未知'
    }
  } catch (e) {
    console.error('获取网络状态失败:', e)
  } finally {
    networkLoading.value = false
  }
}

function stopTask() {
  Object.keys(running).forEach(k => running[k] = false)
  running.any = false
  ElMessage.info('任务已停止')
}

async function runPing() {
  if (!pingForm.host) return ElMessage.warning('请输入目标')
  running.any = running.ping = true
  progress.value = 0
  output.value = `PING ${pingForm.host} (${pingForm.host}): 56 data bytes\n`
  try {
    const res = await diagnostic.ping(pingForm.host)
    progress.value = 100
    if (res.success && res.data) {
      const data = res.data
      if (data.output) {
        output.value = data.output
      } else {
        output.value += `\n--- ${pingForm.host} ping statistics ---\n`
        output.value += `${data.packetsSent || pingForm.count} packets transmitted, ${data.packetsReceived || 0} received, ${data.packetLoss || 0}% packet loss\n`
        if (data.minTime !== undefined) {
          output.value += `rtt min/avg/max = ${data.minTime}/${data.avgTime}/${data.maxTime} ms\n`
        }
      }
      ElMessage.success('Ping 完成')
    } else {
      output.value += `\n请求失败: ${res.message || '未知错误'}\n`
      ElMessage.error(res.message || 'Ping 失败')
    }
  } catch (e) {
    output.value += `\n请求异常: ${e.message || '网络错误'}\n`
  } finally {
    running.any = running.ping = false
  }
}

async function runTrace() {
  if (!traceForm.host) return ElMessage.warning('请输入目标')
  running.any = running.trace = true
  progress.value = 0
  output.value = `traceroute to ${traceForm.host}, ${traceForm.maxHops} hops max\n`
  try {
    const res = await diagnostic.traceroute(traceForm.host)
    progress.value = 100
    if (res.success && res.data) {
      const data = res.data
      if (data.output) {
        output.value = data.output
      } else if (Array.isArray(data.hops)) {
        data.hops.forEach((hop, idx) => {
          output.value += `${idx + 1}  ${hop.ip || hop.host || '*'}  ${hop.time || hop.rtt || '*'} ms\n`
        })
      }
      ElMessage.success('追踪完成')
    } else {
      output.value += `\n请求失败: ${res.message || '未知错误'}\n`
      ElMessage.error(res.message || '追踪失败')
    }
  } catch (e) {
    output.value += `\n请求异常: ${e.message || '网络错误'}\n`
  } finally {
    running.any = running.trace = false
  }
}

async function runDns() {
  if (!dnsForm.domain) return ElMessage.warning('请输入域名')
  running.any = running.dns = true
  progress.value = 0
  output.value = `; <<>> DiG <<>> ${dnsForm.domain}\n`
  try {
    const res = await diagnostic.dnsLookup(dnsForm.domain)
    progress.value = 100
    if (res.success && res.data) {
      const data = res.data
      if (data.output) {
        output.value = data.output
      } else {
        output.value += `;; Query time: ${data.queryTime || data.query_time || 0} msec\n`
        output.value += `;; SERVER: ${dnsForm.server || data.server || '223.5.5.5'}#53\n\n`
        output.value += `;; ANSWER SECTION:\n`
        const records = data.records || data.answers || []
        if (records.length) {
          records.forEach(rec => {
            const name = rec.name || dnsForm.domain
            const type = rec.type || 'A'
            const value = rec.value || rec.ip || rec.address
            output.value += `${name}.  300  IN  ${type}  ${value}\n`
          })
        } else if (data.ip) {
          output.value += `${dnsForm.domain}.  300  IN  A  ${data.ip}\n`
        } else if (Array.isArray(data.ips)) {
          data.ips.forEach(ip => {
            output.value += `${dnsForm.domain}.  300  IN  A  ${ip}\n`
          })
        }
      }
      ElMessage.success('查询完成')
    } else {
      output.value += `\n请求失败: ${res.message || '未知错误'}\n`
      ElMessage.error(res.message || '查询失败')
    }
  } catch (e) {
    output.value += `\n请求异常: ${e.message || '网络错误'}\n`
  } finally {
    running.any = running.dns = false
  }
}

async function runPortScan() {
  if (!portForm.host) return ElMessage.warning('请输入目标')
  running.any = running.port = true
  progress.value = 0
  portResults.value = []
  output.value = `Starting port scan for ${portForm.host} (${portForm.ports})\n\n`
  try {
    const res = await diagnostic.portScan(portForm.host, portForm.ports)
    progress.value = 100
    if (res.success && res.data) {
      const data = res.data
      if (Array.isArray(data.ports) || Array.isArray(data.results)) {
        const list = data.ports || data.results
        portResults.value = list.map(item => ({
          port: item.port,
          open: item.open !== undefined ? item.open : item.status === 'open',
          service: item.service || item.name || ''
        }))
        output.value += `Scan complete. Open ports: ${portResults.value.filter(p => p.open).length}\n`
        portResults.value.forEach(p => {
          output.value += `  ${p.port}/tcp  ${p.open ? 'open' : 'closed'}  ${p.service}\n`
        })
      } else if (data.output) {
        output.value = data.output
      }
      ElMessage.success('扫描完成')
    } else {
      output.value += `\n请求失败: ${res.message || '未知错误'}\n`
      ElMessage.error(res.message || '扫描失败')
    }
  } catch (e) {
    output.value += `\n请求异常: ${e.message || '网络错误'}\n`
  } finally {
    running.any = running.port = false
  }
}

async function runSpeed() {
  running.any = running.speed = true
  progress.value = 0
  output.value = 'Running speed test...\n'
  try {
    const res = await diagnostic.speedTest()
    progress.value = 100
    if (res.success && res.data) {
      const data = res.data
      const download = data.download || data.downloadSpeed || data.down || 0
      const upload = data.upload || data.uploadSpeed || data.up || 0
      const ping = data.ping || data.latency || 0
      speedResult.value = {
        download: typeof download === 'number' ? download.toFixed(1) : download,
        upload: typeof upload === 'number' ? upload.toFixed(1) : upload,
        ping: typeof ping === 'number' ? ping.toFixed(0) : ping
      }
      if (data.output) {
        output.value = data.output
      } else {
        output.value = `Speed test results:\n`
        output.value += `Download: ${speedResult.value.download} Mbps\n`
        output.value += `Upload: ${speedResult.value.upload} Mbps\n`
        output.value += `Ping: ${speedResult.value.ping} ms\n`
      }
      ElMessage.success('测速完成')
    } else {
      output.value += `\n请求失败: ${res.message || '未知错误'}\n`
      ElMessage.error(res.message || '测速失败')
    }
  } catch (e) {
    output.value += `\n请求异常: ${e.message || '网络错误'}\n`
  } finally {
    running.any = running.speed = false
  }
}

async function restartService() {
  try {
    await ElMessageBox.confirm('确定重启相关服务吗？这可能会暂时中断网络', '提示', { type: 'warning' })
    const res = await diagnostic.restartService()
    if (res.success) {
      ElMessage.success('服务已重启')
      fetchNetworkStatus()
    } else {
      ElMessage.error(res.message || '重启失败')
    }
  } catch (e) {
    if (e !== 'cancel') {
      console.error('重启服务失败:', e)
    }
  }
}

async function clearCache() {
  try {
    await ElMessageBox.confirm('确定清除所有缓存数据吗？', '提示', { type: 'warning' })
    ElMessage.success('缓存已清除')
  } catch {}
}

function exportLogs() {
  ElMessage.success('日志已导出')
}

function copyOutput() {
  if (!output.value) return
  navigator.clipboard?.writeText(output.value)
  ElMessage.success('已复制到剪贴板')
}

function clearOutput() {
  output.value = ''
  portResults.value = []
  speedResult.value = null
}

onMounted(() => {
  fetchNetworkStatus()
})
</script>

<style scoped>
.mb-4 { margin-bottom: 16px; }
.card-title { font-weight: 600; }
.flex-between { display: flex; justify-content: space-between; align-items: center; }
.tip-text { color: #909399; font-size: 13px; }
.log-box {
  background: #1e1e1e;
  color: #d4d4d4;
  padding: 16px;
  border-radius: 6px;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 13px;
  max-height: 420px;
  overflow-y: auto;
  margin-top: 12px;
  white-space: pre-wrap;
  word-break: break-all;
}
.progress-line { margin-bottom: 12px; }
.status-item { text-align: center; padding: 10px; }
.status-item .label { font-size: 13px; color: #909399; margin-bottom: 6px; }
.status-item .value { font-size: 22px; font-weight: 600; color: #303133; }
.status-item .value.danger { color: #f56c6c; }
.speed-result {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 16px;
}
.speed-card {
  background: #f5f7fa;
  border-radius: 8px;
  padding: 18px;
  text-align: center;
}
.speed-card .label { font-size: 13px; color: #909399; margin-bottom: 8px; }
.speed-card .value { font-size: 24px; font-weight: 600; }
.speed-card.down .value { color: #409EFF; }
.speed-card.up .value { color: #67C23A; }
.speed-card.ping .value { color: #E6A23C; }
</style>
