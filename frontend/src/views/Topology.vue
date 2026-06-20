<template>
  <div class="page-container topology-page">
    <el-card class="mb-4">
      <el-form :inline="true">
        <el-form-item label="布局">
          <el-radio-group v-model="layout" size="default">
            <el-radio-button label="tree">树形</el-radio-button>
            <el-radio-button label="radial">环形</el-radio-button>
            <el-radio-button label="force">力导向</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="显示">
          <el-checkbox v-model="showLabels">显示标签</el-checkbox>
          <el-checkbox v-model="showTraffic">显示流量线</el-checkbox>
          <el-checkbox v-model="showStats">显示状态</el-checkbox>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Refresh" @click="refresh">刷新</el-button>
          <el-button :icon="ZoomIn" @click="zoomIn">放大</el-button>
          <el-button :icon="ZoomOut" @click="zoomOut">缩小</el-button>
          <el-button :icon="FullScreen" @click="toggleFullscreen">全屏</el-button>
          <el-dropdown @command="exportImage">
            <el-button :icon="Picture">导出</el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="png">PNG 图片</el-dropdown-item>
                <el-dropdown-item command="svg">SVG 矢量图</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </el-form-item>
      </el-form>
    </el-card>

    <el-row :gutter="16">
      <el-col :span="20">
        <el-card class="topology-card">
          <template #header>
            <div class="flex-between">
              <div class="card-title">网络拓扑图</div>
              <div class="legend">
                <span class="legend-item"><span class="dot online"></span>在线</span>
                <span class="legend-item"><span class="dot offline"></span>离线</span>
                <span class="legend-item"><span class="dot blocked"></span>封禁</span>
                <span class="legend-item"><span class="line high"></span>高流量</span>
                <span class="legend-item"><span class="line normal"></span>正常</span>
              </div>
            </div>
          </template>
          <div ref="topoWrapRef" class="topo-wrap" :class="layout">
            <v-chart ref="chartRef" class="topo-chart" :option="chartOption" autoresize @click="onChartClick" />
          </div>
        </el-card>
      </el-col>

      <el-col :span="4">
        <el-card class="mb-4">
          <template #header><div class="card-title">网络概览</div></template>
          <div class="stat-list">
            <div class="stat-item">
              <div class="stat-icon blue">🛰️</div>
              <div class="stat-info">
                <div class="stat-label">节点数</div>
                <div class="stat-value">{{ overview.nodes }}</div>
              </div>
            </div>
            <div class="stat-item">
              <div class="stat-icon green">🔗</div>
              <div class="stat-info">
                <div class="stat-label">连接数</div>
                <div class="stat-value">{{ overview.edges }}</div>
              </div>
            </div>
            <div class="stat-item">
              <div class="stat-icon orange">📊</div>
              <div class="stat-info">
                <div class="stat-label">总流量</div>
                <div class="stat-value">{{ formatBytes(overview.totalTraffic) }}</div>
              </div>
            </div>
            <div class="stat-item">
              <div class="stat-icon purple">📈</div>
              <div class="stat-info">
                <div class="stat-label">在线率</div>
                <div class="stat-value">{{ overview.onlineRate }}%</div>
              </div>
            </div>
          </div>
        </el-card>

        <el-card class="mb-4">
          <template #header><div class="card-title">设备类型分布</div></template>
          <div class="type-list">
            <div v-for="item in typeStats" :key="item.type" class="type-item">
              <div class="type-icon" :style="{ color: item.color }">{{ item.icon }}</div>
              <div class="type-name">{{ item.label }}</div>
              <div class="type-count">{{ item.count }}</div>
              <el-progress
                :percentage="item.percent"
                :stroke-width="6"
                :show-text="false"
                :color="item.color"
                class="type-progress"
              />
            </div>
          </div>
        </el-card>

        <el-card>
          <template #header><div class="card-title">节点详情</div></template>
          <div v-if="selectedNode" class="node-detail">
            <div class="node-avatar" :class="selectedNode.status">
              <span class="node-icon">{{ selectedNode.icon }}</span>
              <span class="status-dot"></span>
            </div>
            <div class="node-name">{{ selectedNode.name }}</div>
            <div class="node-tag">
              <el-tag :type="tagTypeMap[selectedNode.status]" size="small">
                {{ statusMap[selectedNode.status] }}
              </el-tag>
              <el-tag type="info" size="small">{{ selectedNode.category }}</el-tag>
            </div>
            <el-descriptions :column="1" size="small" border class="node-desc">
              <el-descriptions-item label="IP 地址">{{ selectedNode.ip }}</el-descriptions-item>
              <el-descriptions-item label="MAC 地址">{{ formatMac(selectedNode.mac) }}</el-descriptions-item>
              <el-descriptions-item label="厂商">{{ selectedNode.vendor }}</el-descriptions-item>
              <el-descriptions-item label="上行流量">{{ formatBytes(selectedNode.up) }}</el-descriptions-item>
              <el-descriptions-item label="下行流量">{{ formatBytes(selectedNode.down) }}</el-descriptions-item>
              <el-descriptions-item label="连接数">{{ selectedNode.connections }}</el-descriptions-item>
              <el-descriptions-item label="在线时长">{{ formatDuration(selectedNode.duration) }}</el-descriptions-item>
            </el-descriptions>
          </div>
          <div v-else class="no-select">
            <el-empty description="点击节点查看详情" :image-size="80" />
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { GraphChart, TreeChart } from 'echarts/charts'
import {
  TooltipComponent,
  LegendComponent,
  TitleComponent,
  ToolboxComponent
} from 'echarts/components'
import VChart from 'vue-echarts'
import { ElMessage } from 'element-plus'
import {
  Refresh,
  ZoomIn,
  ZoomOut,
  FullScreen,
  Picture
} from '@element-plus/icons-vue'
import { formatBytes, formatDuration, formatMac, getDeviceTypeLabel, getDeviceTypeColor, getDeviceIcon, getVendorLogo } from '@/utils/format.js'

use([
  CanvasRenderer,
  GraphChart,
  TreeChart,
  TooltipComponent,
  LegendComponent,
  TitleComponent,
  ToolboxComponent
])

const layout = ref('tree')
const showLabels = ref(true)
const showTraffic = ref(true)
const showStats = ref(true)
const chartRef = ref(null)
const topoWrapRef = ref(null)
const selectedNode = ref(null)

const statusMap = { online: '在线', offline: '离线', blocked: '封禁' }
const tagTypeMap = { online: 'success', offline: 'info', blocked: 'danger' }

const overview = ref({
  nodes: 24,
  edges: 31,
  totalTraffic: 18745328742,
  onlineRate: 92
})

const typeStats = ref([
  { type: 'router', label: '路由器', icon: '🛰️', color: '#409eff', count: 3, percent: 13 },
  { type: 'computer', label: '电脑', icon: '💻', color: '#67c23a', count: 6, percent: 25 },
  { type: 'phone', label: '手机', icon: '📱', color: '#e6a23c', count: 8, percent: 33 },
  { type: 'tv', label: '电视', icon: '📺', color: '#909399', count: 2, percent: 8 },
  { type: 'smart_home', label: '智能家居', icon: '🏠', color: '#9b59b6', count: 3, percent: 13 },
  { type: 'unknown', label: '未知', icon: '❓', color: '#95a5a6', count: 2, percent: 8 }
])

const rawNodes = [
  { id: 'gw', name: '主网关路由器', category: '核心', type: 'router', status: 'online', ip: '192.168.1.1', mac: '00:11:22:33:44:55', vendor: 'TP-Link', up: 28374652, down: 827364521, connections: 28, duration: 86400 * 7 },
  { id: 'sw1', name: '主交换机', category: '核心', type: 'router', status: 'online', ip: '192.168.1.2', mac: '00:11:22:33:44:66', vendor: '华为', up: 18273645, down: 716253421, connections: 22, duration: 86400 * 5 },
  { id: 'ap1', name: '无线AP-1F', category: '接入', type: 'router', status: 'online', ip: '192.168.1.10', mac: 'aa:bb:cc:dd:ee:01', vendor: 'TP-Link', up: 8273645, down: 382736452, connections: 12, duration: 86400 * 3 },
  { id: 'ap2', name: '无线AP-2F', category: '接入', type: 'router', status: 'online', ip: '192.168.1.11', mac: 'aa:bb:cc:dd:ee:02', vendor: 'TP-Link', up: 6172634, down: 283746512, connections: 9, duration: 86400 * 3 },
  { id: 'ap3', name: '无线AP-3F', category: '接入', type: 'router', status: 'offline', ip: '192.168.1.12', mac: 'aa:bb:cc:dd:ee:03', vendor: 'Cisco', up: 0, down: 0, connections: 0, duration: 0 },

  { id: 'pc1', name: '办公电脑-01', category: '终端', type: 'computer', status: 'online', ip: '192.168.1.100', mac: 'aa:11:bb:22:cc:01', vendor: 'Dell', up: 4728374, down: 127364521, connections: 18, duration: 86400 * 2 },
  { id: 'pc2', name: '办公电脑-02', category: '终端', type: 'computer', status: 'online', ip: '192.168.1.101', mac: 'aa:11:bb:22:cc:02', vendor: 'Lenovo', up: 3827364, down: 98273645, connections: 15, duration: 86400 },
  { id: 'pc3', name: '服务器-Web', category: '终端', type: 'computer', status: 'online', ip: '192.168.1.200', mac: 'aa:11:bb:22:cc:03', vendor: 'HP', up: 82736451, down: 28374651, connections: 124, duration: 86400 * 15 },
  { id: 'pc4', name: '服务器-DB', category: '终端', type: 'computer', status: 'online', ip: '192.168.1.201', mac: 'aa:11:bb:22:cc:04', vendor: 'Dell', up: 47283746, down: 182736452, connections: 56, duration: 86400 * 12 },
  { id: 'pc5', name: '办公电脑-03', category: '终端', type: 'computer', status: 'offline', ip: '192.168.1.102', mac: 'aa:11:bb:22:cc:05', vendor: 'Apple', up: 0, down: 0, connections: 0, duration: 0 },
  { id: 'pc6', name: '办公电脑-04', category: '终端', type: 'computer', status: 'online', ip: '192.168.1.103', mac: 'aa:11:bb:22:cc:06', vendor: 'Asus', up: 2837465, down: 72635142, connections: 11, duration: 3600 * 8 },

  { id: 'ph1', name: '张三的手机', category: '终端', type: 'phone', status: 'online', ip: '192.168.1.110', mac: 'bb:22:cc:33:dd:01', vendor: 'Apple', up: 1827364, down: 47283746, connections: 22, duration: 3600 * 6 },
  { id: 'ph2', name: '李四的手机', category: '终端', type: 'phone', status: 'online', ip: '192.168.1.111', mac: 'bb:22:cc:33:dd:02', vendor: 'Huawei', up: 1273645, down: 38273645, connections: 18, duration: 3600 * 4 },
  { id: 'ph3', name: '王五的手机', category: '终端', type: 'phone', status: 'online', ip: '192.168.1.112', mac: 'bb:22:cc:33:dd:03', vendor: 'Xiaomi', up: 927364, down: 28374652, connections: 14, duration: 3600 * 5 },
  { id: 'ph4', name: '赵六的手机', category: '终端', type: 'phone', status: 'blocked', ip: '192.168.1.113', mac: 'bb:22:cc:33:dd:04', vendor: 'OPPO', up: 0, down: 0, connections: 0, duration: 0 },
  { id: 'ph5', name: '孙七的手机', category: '终端', type: 'phone', status: 'online', ip: '192.168.1.114', mac: 'bb:22:cc:33:dd:05', vendor: 'Vivo', up: 726351, down: 22837465, connections: 12, duration: 3600 * 3 },
  { id: 'ph6', name: '周八的手机', category: '终端', type: 'phone', status: 'online', ip: '192.168.1.115', mac: 'bb:22:cc:33:dd:06', vendor: 'Samsung', up: 618273, down: 19283746, connections: 16, duration: 3600 * 2 },
  { id: 'ph7', name: '吴九的手机', category: '终端', type: 'phone', status: 'online', ip: '192.168.1.116', mac: 'bb:22:cc:33:dd:07', vendor: 'OnePlus', up: 482736, down: 15273645, connections: 9, duration: 3600 },
  { id: 'ph8', name: '郑十的手机', category: '终端', type: 'phone', status: 'offline', ip: '192.168.1.117', mac: 'bb:22:cc:33:dd:08', vendor: 'Apple', up: 0, down: 0, connections: 0, duration: 0 },

  { id: 'tv1', name: '客厅智能电视', category: '终端', type: 'tv', status: 'online', ip: '192.168.1.150', mac: 'cc:33:dd:44:ee:01', vendor: 'Xiaomi', up: 1827364, down: 827364521, connections: 7, duration: 3600 * 4 },
  { id: 'tv2', name: '会议室投影', category: '终端', type: 'tv', status: 'offline', ip: '192.168.1.151', mac: 'cc:33:dd:44:ee:02', vendor: 'Sony', up: 0, down: 0, connections: 0, duration: 0 },

  { id: 'sh1', name: '客厅空调', category: '终端', type: 'smart_home', status: 'online', ip: '192.168.1.160', mac: 'dd:44:ee:55:ff:01', vendor: 'Midea', up: 28374, down: 172635, connections: 3, duration: 86400 * 4 },
  { id: 'sh2', name: '智能灯-走廊', category: '终端', type: 'smart_home', status: 'online', ip: '192.168.1.161', mac: 'dd:44:ee:55:ff:02', vendor: 'Yeelight', up: 12736, down: 82736, connections: 2, duration: 86400 * 3 },
  { id: 'sh3', name: '智能门锁', category: '终端', type: 'smart_home', status: 'online', ip: '192.168.1.162', mac: 'dd:44:ee:55:ff:03', vendor: 'Dormakaba', up: 7364, down: 38273, connections: 1, duration: 86400 * 6 }
]

const rawEdges = [
  { source: 'gw', target: 'sw1', traffic: 927364521, high: true },
  { source: 'sw1', target: 'ap1', traffic: 382736452, high: false },
  { source: 'sw1', target: 'ap2', traffic: 283746512, high: false },
  { source: 'sw1', target: 'ap3', traffic: 0, high: false },
  { source: 'sw1', target: 'pc1', traffic: 127364521, high: false },
  { source: 'sw1', target: 'pc2', traffic: 98273645, high: false },
  { source: 'sw1', target: 'pc3', traffic: 82736451, high: false },
  { source: 'sw1', target: 'pc4', traffic: 182736452, high: true },
  { source: 'sw1', target: 'pc5', traffic: 0, high: false },
  { source: 'sw1', target: 'pc6', traffic: 72635142, high: false },
  { source: 'ap1', target: 'ph1', traffic: 47283746, high: false },
  { source: 'ap1', target: 'ph2', traffic: 38273645, high: false },
  { source: 'ap1', target: 'ph3', traffic: 28374652, high: false },
  { source: 'ap1', target: 'ph4', traffic: 0, high: false },
  { source: 'ap1', target: 'ph5', traffic: 22837465, high: false },
  { source: 'ap1', target: 'ph8', traffic: 0, high: false },
  { source: 'ap1', target: 'sh1', traffic: 172635, high: false },
  { source: 'ap1', target: 'sh3', traffic: 38273, high: false },
  { source: 'ap2', target: 'ph6', traffic: 19283746, high: false },
  { source: 'ap2', target: 'ph7', traffic: 15273645, high: false },
  { source: 'ap2', target: 'tv1', traffic: 827364521, high: true },
  { source: 'ap2', target: 'tv2', traffic: 0, high: false },
  { source: 'ap2', target: 'sh2', traffic: 82736, high: false },
  { source: 'ap3', target: 'pc5', traffic: 0, high: false },
  { source: 'gw', target: 'pc3', traffic: 82736451, high: false },
  { source: 'gw', target: 'pc4', traffic: 182736452, high: true }
]

const nodeInfoMap = computed(() => {
  const map = {}
  rawNodes.forEach(n => {
    const icon = getDeviceIcon(n.type) || '❓'
    map[n.id] = { ...n, icon, label: getDeviceTypeLabel(n.type), color: getDeviceTypeColor(n.type) }
  })
  return map
})

const treeHierarchy = [
  { id: 'gw', children: [
    { id: 'sw1', children: [
      { id: 'ap1', children: ['ph1','ph2','ph3','ph4','ph5','ph8','sh1','sh3'].map(id => ({ id })) },
      { id: 'ap2', children: ['ph6','ph7','tv1','tv2','sh2'].map(id => ({ id })) },
      { id: 'ap3', children: [] },
      { id: 'pc1', children: [] }, { id: 'pc2', children: [] }, { id: 'pc3', children: [] },
      { id: 'pc4', children: [] }, { id: 'pc5', children: [] }, { id: 'pc6', children: [] }
    ]}
  ]}
]

function buildTreeOption() {
  const colorMap = { online: '#67c23a', offline: '#909399', blocked: '#f56c6c' }
  const categories = [{ name: '核心' }, { name: '接入' }, { name: '终端' }]

  function walk(arr, depth) {
    return arr.map(node => {
      const info = nodeInfoMap.value[node.id]
      const size = depth === 0 ? 70 : depth === 1 ? 55 : depth === 2 ? 45 : 36
      return {
        name: info.name,
        id: info.id,
        value: info.ip,
        symbolSize: size,
        category: info.category === '核心' ? 0 : info.category === '接入' ? 1 : 2,
        status: info.status,
        icon: info.icon,
        itemStyle: {
          color: colorMap[info.status],
          borderColor: '#fff',
          borderWidth: 3,
          shadowBlur: 12,
          shadowColor: colorMap[info.status] + '66'
        },
        label: {
          show: showLabels.value,
          position: 'bottom',
          distance: 8,
          formatter: showStats.value
            ? `{icon|${info.icon}} {name|${info.name}}\n{ip|${info.ip}}`
            : `{icon|${info.icon}} {name|${info.name}}`,
          rich: {
            icon: { fontSize: 16, padding: [0, 4, 0, 0] },
            name: { fontSize: 13, fontWeight: 600, color: '#303133' },
            ip: { fontSize: 11, color: '#909399', padding: [2, 0, 0, 0] }
          }
        },
        children: node.children ? walk(node.children, depth + 1) : []
      }
    })
  }

  return {
    tooltip: {
      trigger: 'item',
      formatter: (p) => {
        if (p.dataType === 'edge') {
          const t = rawEdges.find(e =>
            (e.source === p.data.source && e.target === p.data.target) ||
            (e.target === p.data.source && e.source === p.data.target)
          )
          return `<div style="font-weight:600;margin-bottom:4px">连接</div>
            <div>源: ${nodeInfoMap.value[p.data.source]?.name || p.data.source}</div>
            <div>目标: ${nodeInfoMap.value[p.data.target]?.name || p.data.target}</div>
            ${t ? `<div>流量: ${formatBytes(t.traffic)}</div>` : ''}`
        }
        const info = nodeInfoMap.value[p.data.id]
        return info ? `<div style="font-weight:600;margin-bottom:4px">${info.icon} ${info.name}</div>
          <div>IP: ${info.ip}</div>
          <div>状态: ${statusMap[info.status]}</div>
          <div>下行: ${formatBytes(info.down)}</div>
          <div>上行: ${formatBytes(info.up)}</div>` : p.name
      }
    },
    series: [{
      type: 'tree',
      data: walk(treeHierarchy, 0),
      top: '6%', left: '12%', right: '8%', bottom: '6%',
      orient: 'LR',
      symbol: 'circle',
      roam: true,
      expandAndCollapse: false,
      initialTreeDepth: 10,
      lineStyle: {
        color: '#d0d3d9',
        width: showTraffic.value ? 2 : 1.5,
        curveness: 0.4
      },
      emphasis: {
        focus: 'descendant',
        lineStyle: { width: 3, color: '#409eff' }
      },
      leaves: { label: { position: 'right', verticalAlign: 'middle', align: 'left' } },
      animationDuration: 550,
      animationDurationUpdate: 750
    }]
  }
}

function buildRadialOption() {
  return buildGraphOption('radial')
}

function buildForceOption() {
  return buildGraphOption('force')
}

function buildGraphOption(layoutType) {
  const colorMap = { online: '#67c23a', offline: '#909399', blocked: '#f56c6c' }
  const trafficMax = Math.max(...rawEdges.map(e => e.traffic), 1)
  const nodes = rawNodes.map(n => {
    const info = nodeInfoMap.value[n.id]
    const sizeByType = n.type === 'router' ? 62 : n.category === '终端' ? 40 : 52
    return {
      id: n.id, name: n.name, category: n.category, status: n.status, value: n.down,
      symbolSize: sizeByType,
      x: layoutType === 'radial' ? undefined : Math.random() * 800,
      y: layoutType === 'radial' ? undefined : Math.random() * 500,
      fixed: layoutType === 'force' ? false : undefined,
      itemStyle: {
        color: colorMap[n.status],
        borderColor: '#fff',
        borderWidth: 3,
        shadowBlur: 14,
        shadowColor: colorMap[n.status] + '77'
      },
      label: {
        show: showLabels.value,
        position: 'bottom',
        formatter: showStats.value
          ? `{icon|${info.icon}} {name|${n.name}}\n{ip|${n.ip}}`
          : `{icon|${info.icon}} {name|${n.name}}`,
        rich: {
          icon: { fontSize: 14, padding: [0, 4, 0, 0] },
          name: { fontSize: 12, fontWeight: 600, color: '#303133' },
          ip: { fontSize: 10, color: '#909399', padding: [2, 0, 0, 0] }
        }
      }
    }
  })
  const edges = rawEdges.map(e => {
    const src = nodeInfoMap.value[e.source]
    const tgt = nodeInfoMap.value[e.target]
    const isHigh = e.high || (showTraffic.value && e.traffic / trafficMax > 0.3)
    const disabled = src.status === 'offline' || tgt.status === 'offline' ||
      src.status === 'blocked' || tgt.status === 'blocked'
    return {
      source: e.source, target: e.target, value: e.traffic,
      lineStyle: {
        color: disabled ? '#d0d3d9' : isHigh ? '#f56c6c' : '#80c0ff',
        width: showTraffic.value
          ? (disabled ? 1 : Math.max(1, Math.round(4 * e.traffic / trafficMax)))
          : 1.5,
        opacity: disabled ? 0.4 : 0.85,
        curveness: 0.2
      },
      emphasis: { lineStyle: { width: 4, color: '#409eff', opacity: 1 } }
    }
  })

  return {
    tooltip: {
      trigger: 'item',
      formatter: (p) => {
        if (p.dataType === 'edge') {
          const t = rawEdges.find(e =>
            (e.source === p.data.source && e.target === p.data.target) ||
            (e.target === p.data.source && e.source === p.data.target)
          )
          return `<div style="font-weight:600;margin-bottom:4px">🔗 连接</div>
            <div>源: ${nodeInfoMap.value[p.data.source]?.name || p.data.source}</div>
            <div>目标: ${nodeInfoMap.value[p.data.target]?.name || p.data.target}</div>
            ${t ? `<div>流量: ${formatBytes(t.traffic)}</div>` : ''}`
        }
        const info = nodeInfoMap.value[p.data.id]
        return info ? `<div style="font-weight:600;margin-bottom:4px">${info.icon} ${info.name}</div>
          <div>IP: ${info.ip}</div>
          <div>MAC: ${formatMac(info.mac)}</div>
          <div>状态: ${statusMap[info.status]}</div>
          <div>类型: ${getDeviceTypeLabel(info.type)}</div>
          <div>下行: ${formatBytes(info.down)}</div>
          <div>上行: ${formatBytes(info.up)}</div>` : p.name
      }
    },
    series: [{
      type: 'graph',
      layout: layoutType,
      circular: layoutType === 'radial',
      data: nodes, links: edges,
      roam: true, draggable: true, focusNodeAdjacency: true,
      ...(layoutType === 'force' ? {
        force: { repulsion: 520, edgeLength: [80, 180], gravity: 0.12 }
      } : {}),
      ...(layoutType === 'radial' ? {
        center: ['50%', '55%'], radius: ['18%', '72%'], rotateLabel: false
      } : {})
    }]
  }
}

const chartOption = computed(() => {
  if (layout.value === 'tree') return buildTreeOption()
  if (layout.value === 'radial') return buildRadialOption()
  return buildForceOption()
})

function onChartClick(params) {
  if (params.dataType === 'node' && params.data?.id) {
    selectedNode.value = nodeInfoMap.value[params.data.id]
  }
}

function zoomIn() {
  const inst = chartRef.value?.getEchartsInstance?.()
  inst && inst.dispatchAction({ type: 'zoom', zoomScale: 1.2, originX: 'center', originY: 'center' })
}
function zoomOut() {
  const inst = chartRef.value?.getEchartsInstance?.()
  inst && inst.dispatchAction({ type: 'zoom', zoomScale: 0.8, originX: 'center', originY: 'center' })
}
function toggleFullscreen() {
  const el = topoWrapRef.value
  if (!el) return
  if (!document.fullscreenElement) {
    el.requestFullscreen?.()
  } else {
    document.exitFullscreen?.()
  }
}
function exportImage(cmd) {
  const inst = chartRef.value?.getEchartsInstance?.()
  if (!inst) return
  const url = inst.getDataURL({ type: cmd === 'png' ? 'png' : 'svg', pixelRatio: 2, backgroundColor: '#fff' })
  const a = document.createElement('a')
  a.href = url
  a.download = `topology-${Date.now()}.${cmd}`
  a.click()
  ElMessage.success(`拓扑图已导出为 ${cmd.toUpperCase()}`)
}
function refresh() {
  const inst = chartRef.value?.getEchartsInstance?.()
  if (inst) { inst.resize() }
  ElMessage.success('拓扑数据已刷新')
}

onMounted(() => {
  nextTick(() => {
    const inst = chartRef.value?.getEchartsInstance?.()
    if (inst) { inst.resize() }
  })
})
</script>

<style scoped>
.mb-4 { margin-bottom: 16px; }
.card-title { font-weight: 600; }
.flex-between { display: flex; justify-content: space-between; align-items: center; }
.legend { display: flex; gap: 14px; flex-wrap: wrap; }
.legend-item { font-size: 12px; color: #606266; display: flex; align-items: center; gap: 5px; }
.dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }
.dot.online { background: #67c23a; }
.dot.offline { background: #909399; }
.dot.blocked { background: #f56c6c; }
.line { width: 20px; height: 3px; border-radius: 2px; display: inline-block; vertical-align: middle; }
.line.high { background: #f56c6c; }
.line.normal { background: #80c0ff; }

.topology-card :deep(.el-card__body) { padding: 16px; }
.topo-wrap {
  width: 100%;
  height: 640px;
  position: relative;
  border-radius: 8px;
  background:
    linear-gradient(135deg, #fafcff 0%, #f5f9ff 100%);
  background-image:
    radial-gradient(circle at 1px 1px, #e4e7ed 1px, transparent 0);
  background-size: 24px 24px;
  overflow: hidden;
}
.topo-wrap.tree { background-color: #fafcff; }
.topo-chart { width: 100%; height: 100%; }

.stat-list { display: flex; flex-direction: column; gap: 14px; }
.stat-item { display: flex; align-items: center; gap: 12px; }
.stat-icon {
  width: 40px; height: 40px; border-radius: 10px;
  display: flex; align-items: center; justify-content: center; font-size: 20px;
  flex-shrink: 0;
}
.stat-icon.blue { background: #ecf5ff; }
.stat-icon.green { background: #f0f9eb; }
.stat-icon.orange { background: #fdf6ec; }
.stat-icon.purple { background: #f3eaff; }
.stat-info { flex: 1; min-width: 0; }
.stat-label { font-size: 12px; color: #909399; margin-bottom: 2px; }
.stat-value { font-size: 17px; font-weight: 700; color: #303133; }

.type-list { display: flex; flex-direction: column; gap: 12px; }
.type-item {
  display: grid;
  grid-template-columns: 28px 64px 32px 1fr;
  align-items: center;
  gap: 8px;
}
.type-icon { font-size: 20px; }
.type-name { font-size: 13px; color: #606266; }
.type-count { font-size: 13px; font-weight: 600; color: #303133; text-align: right; }
.type-progress { grid-column: 1 / -1; }

.node-detail { display: flex; flex-direction: column; align-items: center; text-align: center; }
.node-avatar {
  width: 68px; height: 68px; border-radius: 50%;
  background: #ecf5ff;
  display: flex; align-items: center; justify-content: center;
  position: relative; margin-bottom: 10px;
  border: 3px solid #fff; box-shadow: 0 4px 12px rgba(64, 158, 255, 0.2);
}
.node-avatar.online { background: #f0f9eb; box-shadow: 0 4px 12px rgba(103, 194, 58, 0.25); }
.node-avatar.offline { background: #f4f4f5; box-shadow: 0 4px 12px rgba(144, 147, 153, 0.2); }
.node-avatar.blocked { background: #fef0f0; box-shadow: 0 4px 12px rgba(245, 108, 108, 0.25); }
.node-icon { font-size: 32px; }
.status-dot {
  position: absolute; right: 2px; bottom: 2px;
  width: 16px; height: 16px; border-radius: 50%;
  border: 2px solid #fff;
}
.node-avatar.online .status-dot { background: #67c23a; }
.node-avatar.offline .status-dot { background: #909399; }
.node-avatar.blocked .status-dot { background: #f56c6c; }
.node-name { font-size: 15px; font-weight: 600; color: #303133; margin-bottom: 8px; }
.node-tag { display: flex; gap: 6px; margin-bottom: 14px; flex-wrap: wrap; justify-content: center; }
.node-desc { width: 100%; text-align: left; }

.no-select { padding: 20px 0; }
</style>
