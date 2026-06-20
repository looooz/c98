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
          <el-button type="primary" :icon="Refresh" @click="refresh" :loading="loading">刷新</el-button>
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
              <el-descriptions-item label="首次发现">{{ formatDateTime(selectedNode.first_seen) }}</el-descriptions-item>
              <el-descriptions-item label="最后在线">{{ formatDateTime(selectedNode.last_seen) }}</el-descriptions-item>
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
import { formatBytes, formatDuration, formatMac, formatDateTime, getDeviceTypeLabel, getDeviceTypeColor, getDeviceIcon, getVendorLogo } from '@/utils/format.js'
import { devices } from '@/api'

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
const loading = ref(false)
const deviceList = ref([])

const statusMap = { online: '在线', offline: '离线', blocked: '封禁' }
const tagTypeMap = { online: 'success', offline: 'info', blocked: 'danger' }

const gatewayDevice = computed(() => {
  const routers = deviceList.value.filter(d => d.device_type === 'router')
  if (routers.length > 0) {
    return routers.sort((a, b) => {
      const aOnline = a.is_online ? 1 : 0
      const bOnline = b.is_online ? 1 : 0
      if (aOnline !== bOnline) return bOnline - aOnline
      return (a.ip || '').localeCompare(b.ip || '')
    })[0]
  }
  return deviceList.value[0] || null
})

const rawNodes = computed(() => {
  return deviceList.value.map(d => {
    const isGateway = gatewayDevice.value && d.id === gatewayDevice.value.id
    const isRouter = d.device_type === 'router'
    let category = '终端'
    if (isGateway) category = '核心'
    else if (isRouter) category = '接入'

    return {
      id: String(d.id),
      name: d.custom_name || d.hostname || d.ip || '未知设备',
      category,
      type: d.device_type || 'unknown',
      status: d.is_online ? 'online' : 'offline',
      ip: d.ip || '-',
      mac: d.mac || '',
      vendor: d.vendor || '未知',
      first_seen: d.first_seen,
      last_seen: d.last_seen,
      up: 0,
      down: 0,
      connections: 0,
      duration: 0
    }
  })
})

const rawEdges = computed(() => {
  const edges = []
  const gw = gatewayDevice.value
  if (!gw) return edges

  const gwId = String(gw.id)
  const otherNodes = deviceList.value.filter(d => d.id !== gw.id)

  const routers = otherNodes.filter(d => d.device_type === 'router')
  const terminals = otherNodes.filter(d => d.device_type !== 'router')

  if (routers.length > 0) {
    routers.forEach(r => {
      edges.push({
        source: gwId,
        target: String(r.id),
        traffic: 0,
        high: false
      })
    })

    terminals.forEach((t, idx) => {
      const routerIdx = idx % routers.length
      edges.push({
        source: String(routers[routerIdx].id),
        target: String(t.id),
        traffic: 0,
        high: false
      })
    })
  } else {
    terminals.forEach(t => {
      edges.push({
        source: gwId,
        target: String(t.id),
        traffic: 0,
        high: false
      })
    })
  }

  return edges
})

const overview = computed(() => {
  const nodes = deviceList.value.length
  const edges = rawEdges.value.length
  const onlineCount = deviceList.value.filter(d => d.is_online).length
  const onlineRate = nodes > 0 ? Math.round((onlineCount / nodes) * 100) : 0

  return {
    nodes,
    edges,
    onlineRate
  }
})

const typeStats = computed(() => {
  const typeCount = {}
  const total = deviceList.value.length

  deviceList.value.forEach(d => {
    const type = d.device_type || 'unknown'
    typeCount[type] = (typeCount[type] || 0) + 1
  })

  const stats = []
  for (const [type, count] of Object.entries(typeCount)) {
    stats.push({
      type,
      label: getDeviceTypeLabel(type),
      icon: getDeviceIcon(type),
      color: getDeviceTypeColor(type),
      count,
      percent: total > 0 ? Math.round((count / total) * 100) : 0
    })
  }

  return stats.sort((a, b) => b.count - a.count)
})

const nodeInfoMap = computed(() => {
  const map = {}
  rawNodes.value.forEach(n => {
    const icon = getDeviceIcon(n.type) || '❓'
    map[n.id] = { ...n, icon, label: getDeviceTypeLabel(n.type), color: getDeviceTypeColor(n.type) }
  })
  return map
})

const treeHierarchy = computed(() => {
  const gw = gatewayDevice.value
  if (!gw) return []

  const gwId = String(gw.id)
  const otherNodes = deviceList.value.filter(d => d.id !== gw.id)
  const routers = otherNodes.filter(d => d.device_type === 'router')
  const terminals = otherNodes.filter(d => d.device_type !== 'router')

  function buildChildren(nodes) {
    return nodes.map(n => ({ id: String(n.id), children: [] }))
  }

  if (routers.length > 0) {
    const routerChildren = routers.map(r => {
      const routerTerminals = terminals.filter((_, idx) => idx % routers.length === routers.indexOf(r))
      return {
        id: String(r.id),
        children: buildChildren(routerTerminals)
      }
    })
    return [{ id: gwId, children: routerChildren }]
  } else {
    return [{ id: gwId, children: buildChildren(terminals) }]
  }
})

async function fetchDevices() {
  loading.value = true
  try {
    const res = await devices.getList({ page_size: 100 })
    if (res.success && res.data) {
      deviceList.value = res.data.list || []
    } else {
      deviceList.value = []
    }
  } catch (err) {
    console.error('Failed to fetch devices:', err)
    deviceList.value = []
  } finally {
    loading.value = false
  }
}

function buildTreeOption() {
  const colorMap = { online: '#67c23a', offline: '#909399', blocked: '#f56c6c' }
  const categories = [{ name: '核心' }, { name: '接入' }, { name: '终端' }]

  function walk(arr, depth) {
    return arr.map(node => {
      const info = nodeInfoMap.value[node.id]
      if (!info) return null
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
        children: node.children ? walk(node.children, depth + 1).filter(Boolean) : []
      }
    }).filter(Boolean)
  }

  return {
    tooltip: {
      trigger: 'item',
      formatter: (p) => {
        if (p.dataType === 'edge') {
          const t = rawEdges.value.find(e =>
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
          <div>厂商: ${info.vendor}</div>` : p.name
      }
    },
    series: [{
      type: 'tree',
      data: walk(treeHierarchy.value, 0),
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
  const trafficMax = Math.max(...rawEdges.value.map(e => e.traffic), 1)
  const nodes = rawNodes.value.map(n => {
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
  const edges = rawEdges.value.map(e => {
    const src = nodeInfoMap.value[e.source]
    const tgt = nodeInfoMap.value[e.target]
    const isHigh = e.high || (showTraffic.value && e.traffic / trafficMax > 0.3)
    const disabled = !src || !tgt || src.status === 'offline' || tgt.status === 'offline' ||
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
          const t = rawEdges.value.find(e =>
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
          <div>厂商: ${info.vendor}</div>` : p.name
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
async function refresh() {
  await fetchDevices()
  nextTick(() => {
    const inst = chartRef.value?.getEchartsInstance?.()
    if (inst) { inst.resize() }
  })
  ElMessage.success('拓扑数据已刷新')
}

onMounted(() => {
  fetchDevices()
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
.node-icon { font-size: 32px; }
.status-dot {
  position: absolute; right: 2px; bottom: 2px;
  width: 16px; height: 16px; border-radius: 50%;
  border: 2px solid #fff;
}
.node-avatar.online .status-dot { background: #67c23a; }
.node-avatar.offline .status-dot { background: #909399; }
.node-name { font-size: 15px; font-weight: 600; color: #303133; margin-bottom: 8px; }
.node-tag { display: flex; gap: 6px; margin-bottom: 14px; flex-wrap: wrap; justify-content: center; }
.node-desc { width: 100%; text-align: left; }

.no-select { padding: 20px 0; }
</style>
