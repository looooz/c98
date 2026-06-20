<template>
  <div class="page-container">
    <el-row :gutter="16">
      <el-col :span="18">
        <el-card class="mb-4">
          <template #header>
            <div class="flex-between">
              <div class="card-title">管控规则</div>
              <el-button type="primary" :icon="Plus" @click="openRuleDialog">新建规则</el-button>
            </div>
          </template>

          <el-table :data="rules" stripe>
            <el-table-column label="#" width="60" type="index" />
            <el-table-column label="规则名称" prop="name" width="180" />
            <el-table-column label="类型" width="100">
              <template #default="{ row }">
                <el-tag :type="ruleTypeTag(row.type)" effect="light" size="small">
                  {{ ruleTypeLabel(row.type) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="时间限制" width="180">
              <template #default="{ row }">
                <span v-if="row.type === 'time'">{{ row.timeStart }} - {{ row.timeEnd }}</span>
                <span v-else>-</span>
              </template>
            </el-table-column>
            <el-table-column label="限制内容">
              <template #default="{ row }">
                <div class="limit-tags">
                  <el-tag v-for="item in row.items" :key="item" size="small" type="info" effect="plain">
                    {{ item }}
                  </el-tag>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="适用设备" width="120">
              <template #default="{ row }">
                <el-avatar-group>
                  <el-avatar v-for="(d, i) in row.devices.slice(0, 3)" :key="i" :size="26" :style="{ background: getDeviceTypeColor(d.type) + '40' }">
                    <span style="font-size: 14px">{{ getDeviceIcon(d.type) }}</span>
                  </el-avatar>
                  <el-avatar v-if="row.devices.length > 3" :size="26" style="background:#eee">
                    +{{ row.devices.length - 3 }}
                  </el-avatar>
                </el-avatar-group>
              </template>
            </el-table-column>
            <el-table-column label="状态" width="100">
              <template #default="{ row }">
                <el-switch
                  v-model="row.enabled"
                  :active-value="true"
                  :inactive-value="false"
                  @change="onToggleRule(row)"
                />
              </template>
            </el-table-column>
            <el-table-column label="操作" width="180" fixed="right">
              <template #default="{ row }">
                <el-button size="small" type="primary" link @click="editRule(row)">编辑</el-button>
                <el-button size="small" type="success" link @click="assignDevices(row)">分配设备</el-button>
                <el-button size="small" type="danger" link @click="deleteRule(row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>

        <el-card>
          <template #header><div class="card-title">互联网使用时间统计（本周）</div></template>
          <v-chart class="chart" :option="usageChartOption" autoresize />
        </el-card>
      </el-col>

      <el-col :span="6">
        <el-card class="mb-4">
          <template #header><div class="card-title">今日上网概况</div></template>
          <div class="overview-list">
            <div class="overview-item">
              <span class="label">活跃设备</span>
              <span class="value highlight">{{ overview.active }} / {{ overview.total }}</span>
            </div>
            <div class="overview-item">
              <span class="label">累计上网时长</span>
              <span class="value">{{ formatDuration(overview.totalTime) }}</span>
            </div>
            <div class="overview-item">
              <span class="label">被拦截请求</span>
              <span class="value danger">{{ overview.blocked }}</span>
            </div>
            <div class="overview-item">
              <span class="label">运行中规则</span>
              <span class="value success">{{ rules.filter(r => r.enabled).length }}</span>
            </div>
          </div>
        </el-card>

        <el-card class="mb-4">
          <template #header><div class="card-title">家庭成员</div></template>
          <div class="member-list">
            <div class="member-item" v-for="m in members" :key="m.id">
              <el-avatar :size="42" :src="m.avatar" />
              <div class="member-info">
                <div class="member-name">{{ m.name }}</div>
                <div class="member-sub">
                  <span :class="{'text-green': m.online}">{{ m.online ? '在线' : '离线' }}</span>
                  · 今日 {{ formatDuration(m.todayTime) }}
                </div>
              </div>
              <el-button type="primary" link size="small" @click="viewMember(m)">详情</el-button>
            </div>
          </div>
        </el-card>

        <el-card>
          <template #header><div class="card-title">最近拦截</div></template>
          <el-timeline>
            <el-timeline-item
              v-for="(item, i) in recentBlocks"
              :key="i"
              :timestamp="relativeTime(item.time)"
              type="warning"
              size="small"
            >
              <div>
                <strong>{{ item.device }}</strong> 尝试访问
                <el-link type="danger" :underline="false">{{ item.site }}</el-link>
              </div>
            </el-timeline-item>
          </el-timeline>
        </el-card>
      </el-col>
    </el-row>

    <el-dialog v-model="showRuleDialog" :title="editingRule ? '编辑规则' : '新建规则'" width="600px">
      <el-form :model="ruleForm" label-width="100px">
        <el-form-item label="规则名称">
          <el-input v-model="ruleForm.name" placeholder="请输入规则名称" />
        </el-form-item>
        <el-form-item label="规则类型">
          <el-radio-group v-model="ruleForm.type">
            <el-radio label="time">上网时段</el-radio>
            <el-radio label="website">网址过滤</el-radio>
            <el-radio label="app">应用过滤</el-radio>
            <el-radio label="keyword">关键词过滤</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="时间范围" v-if="ruleForm.type === 'time'">
          <el-time-picker
            v-model="ruleForm.timeRange"
            is-range
            range-separator="至"
            start-placeholder="开始时间"
            end-placeholder="结束时间"
            format="HH:mm"
            value-format="HH:mm"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="重复周期" v-if="ruleForm.type === 'time'">
          <el-checkbox-group v-model="ruleForm.weekdays">
            <el-checkbox :label="1">周一</el-checkbox>
            <el-checkbox :label="2">周二</el-checkbox>
            <el-checkbox :label="3">周三</el-checkbox>
            <el-checkbox :label="4">周四</el-checkbox>
            <el-checkbox :label="5">周五</el-checkbox>
            <el-checkbox :label="6">周六</el-checkbox>
            <el-checkbox :label="0">周日</el-checkbox>
          </el-checkbox-group>
        </el-form-item>
        <el-form-item label="过滤内容" v-if="ruleForm.type !== 'time'">
          <el-select
            v-model="ruleForm.items"
            multiple
            filterable
            allow-create
            default-first-option
            placeholder="输入后回车添加"
            style="width: 100%"
          >
            <el-option v-for="opt in exampleList" :key="opt" :label="opt" :value="opt" />
          </el-select>
        </el-form-item>
        <el-form-item label="启用">
          <el-switch v-model="ruleForm.enabled" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showRuleDialog = false">取消</el-button>
        <el-button type="primary" @click="saveRule">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { Plus } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  formatDuration,
  relativeTime,
  getDeviceIcon,
  getDeviceTypeColor
} from '@/utils/format'

const showRuleDialog = ref(false)
const editingRule = ref(null)

const ruleForm = reactive({
  name: '',
  type: 'time',
  timeRange: [],
  timeStart: '',
  timeEnd: '',
  weekdays: [1, 2, 3, 4, 5],
  items: [],
  enabled: true
})

const exampleList = computed(() => {
  if (ruleForm.type === 'website') return ['bilibili.com', 'douyin.com', 'weibo.com', 'qq.com', 'youtube.com']
  if (ruleForm.type === 'app') return ['抖音', '快手', 'B站', '微博', 'QQ音乐']
  if (ruleForm.type === 'keyword') return ['游戏', '赌博', '暴力', '色情', '广告']
  return []
})

const rules = ref([
  {
    id: 1, name: '写作业时段', type: 'time', timeStart: '19:00', timeEnd: '21:00',
    items: [],
    devices: [
      { name: '小明的 iPhone', type: 'phone' },
      { name: 'iPad Air', type: 'tablet' }
    ],
    enabled: true
  },
  {
    id: 2, name: '短视频屏蔽', type: 'website',
    items: ['douyin.com', 'kuaishou.com', 'bilibili.com'],
    devices: [{ name: 'iPad Air', type: 'tablet' }],
    enabled: true
  },
  {
    id: 3, name: '游戏时间限制', type: 'time', timeStart: '22:00', timeEnd: '08:00',
    items: [],
    devices: [{ name: 'PS5', type: 'console' }],
    enabled: false
  },
  {
    id: 4, name: '敏感词过滤', type: 'keyword',
    items: ['赌博', '暴力', '色情'],
    devices: [
      { name: '小明的 iPhone', type: 'phone' },
      { name: '妈妈的手机', type: 'phone' },
      { name: 'iPad Air', type: 'tablet' }
    ],
    enabled: true
  }
])

const overview = ref({
  active: 5,
  total: 8,
  totalTime: 3600 * 6 + 1800,
  blocked: 23
})

const members = ref([
  { id: 1, name: '小明', avatar: 'https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png', online: true, todayTime: 3600 * 3 + 1200 },
  { id: 2, name: '爸爸', avatar: 'https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png', online: true, todayTime: 3600 * 1 + 1800 },
  { id: 3, name: '妈妈', avatar: 'https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png', online: false, todayTime: 3600 * 4 + 2400 },
  { id: 4, name: '访客', avatar: 'https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png', online: true, todayTime: 1800 }
])

const now = Date.now()
const recentBlocks = ref([
  { device: '小明的 iPhone', site: 'bilibili.com', time: now - 60000 * 8 },
  { device: 'iPad Air', site: 'douyin.com', time: now - 60000 * 45 },
  { device: '小明的 iPhone', site: 'game.163.com', time: now - 60000 * 90 },
  { device: '妈妈的手机', site: 'weibo.com', time: now - 60000 * 180 }
])

const weekDays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
const usageChartOption = computed(() => ({
  tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
  legend: { data: members.value.map(m => m.name) },
  grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
  xAxis: { type: 'category', data: weekDays },
  yAxis: {
    type: 'value',
    axisLabel: { formatter: v => `${Math.floor(v/3600)}h${Math.floor((v%3600)/60)}m` }
  },
  series: members.value.map((m, idx) => ({
    name: m.name,
    type: 'bar',
    stack: 'total',
    emphasis: { focus: 'series' },
    data: Array.from({ length: 7 }, () => 3600 + Math.floor(Math.random() * 4 * 3600)),
    itemStyle: {
      color: ['#409EFF', '#67C23A', '#E6A23C', '#F56C6C'][idx]
    }
  }))
}))

function ruleTypeLabel(t) {
  return { time: '时段', website: '网址', app: '应用', keyword: '关键词' }[t] || t
}
function ruleTypeTag(t) {
  return { time: 'primary', website: 'success', app: 'warning', keyword: 'danger' }[t] || 'info'
}

function openRuleDialog() {
  editingRule.value = null
  Object.assign(ruleForm, {
    name: '', type: 'time', timeRange: [], timeStart: '', timeEnd: '',
    weekdays: [1, 2, 3, 4, 5], items: [], enabled: true
  })
  showRuleDialog.value = true
}

function editRule(row) {
  editingRule.value = row
  Object.assign(ruleForm, row)
  ruleForm.timeRange = [row.timeStart, row.timeEnd].filter(Boolean)
  showRuleDialog.value = true
}

function saveRule() {
  if (!ruleForm.name) {
    ElMessage.warning('请输入规则名称')
    return
  }
  const data = {
    ...ruleForm,
    timeStart: ruleForm.timeRange?.[0] || '',
    timeEnd: ruleForm.timeRange?.[1] || ''
  }
  if (editingRule.value) {
    Object.assign(editingRule.value, data)
    ElMessage.success('规则已更新')
  } else {
    rules.value.push({ id: Date.now(), ...data, devices: [] })
    ElMessage.success('规则已创建')
  }
  showRuleDialog.value = false
}

function onToggleRule(row) {
  ElMessage.success(`规则已${row.enabled ? '启用' : '停用'}`)
}

async function deleteRule(row) {
  try {
    await ElMessageBox.confirm(`确定删除规则「${row.name}」吗？`, '提示', { type: 'warning' })
    rules.value = rules.value.filter(r => r.id !== row.id)
    ElMessage.success('已删除')
  } catch {}
}

function assignDevices(row) {
  ElMessage.info('分配设备：' + row.name)
}

function viewMember(m) {
  ElMessage.info('查看成员详情：' + m.name)
}

onMounted(() => {})
</script>

<style scoped>
.mb-4 { margin-bottom: 16px; }
.card-title { font-weight: 600; }
.flex-between { display: flex; justify-content: space-between; align-items: center; }
.chart { width: 100%; height: 320px; }
.limit-tags { display: flex; flex-wrap: wrap; gap: 6px; }
.overview-list { display: flex; flex-direction: column; gap: 14px; }
.overview-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.overview-item .label { color: #909399; font-size: 13px; }
.overview-item .value { font-weight: 600; color: #303133; }
.overview-item .value.highlight { color: #409EFF; }
.overview-item .value.success { color: #67c23a; }
.overview-item .value.danger { color: #f56c6c; }
.member-list { display: flex; flex-direction: column; gap: 14px; }
.member-item {
  display: flex;
  align-items: center;
  gap: 10px;
}
.member-info { flex: 1; }
.member-name { font-weight: 500; color: #303133; }
.member-sub { font-size: 12px; color: #909399; }
.text-green { color: #67c23a; }
</style>
