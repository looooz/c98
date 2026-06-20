<template>
  <el-container class="layout-container">
    <el-aside :width="isCollapse ? '64px' : '220px'" class="aside">
      <div class="logo-wrap" :class="{ collapsed: isCollapse }">
        <span class="logo-icon">📡</span>
        <span v-if="!isCollapse" class="logo-text">网络监控</span>
      </div>
      <el-scrollbar class="menu-scroll">
        <el-menu
          :default-active="activeMenu"
          :collapse="isCollapse"
          :collapse-transition="false"
          router
          background-color="#1f2d3d"
          text-color="#bfcbd9"
          active-text-color="#409EFF"
        >
          <el-menu-item index="/dashboard">
            <el-icon><DataAnalysis /></el-icon>
            <template #title>仪表盘</template>
          </el-menu-item>
          <el-menu-item index="/scan">
            <el-icon><Search /></el-icon>
            <template #title>设备扫描</template>
          </el-menu-item>
          <el-menu-item index="/devices">
            <el-icon><Monitor /></el-icon>
            <template #title>设备管理</template>
          </el-menu-item>
          <el-menu-item index="/traffic">
            <el-icon><TrendCharts /></el-icon>
            <template #title>流量监控</template>
          </el-menu-item>
          <el-menu-item index="/history">
            <el-icon><Clock /></el-icon>
            <template #title>连接历史</template>
          </el-menu-item>
          <el-menu-item index="/parental">
            <el-icon><UserFilled /></el-icon>
            <template #title>家长控制</template>
          </el-menu-item>
          <el-menu-item index="/diagnostic">
            <el-icon><Tools /></el-icon>
            <template #title>网络诊断</template>
          </el-menu-item>
          <el-menu-item index="/statistics">
            <el-icon><PieChart /></el-icon>
            <template #title>统计报表</template>
          </el-menu-item>
          <el-menu-item index="/alerts">
            <el-icon><Bell /></el-icon>
            <template #title>告警中心</template>
          </el-menu-item>
          <el-menu-item index="/topology">
            <el-icon><Connection /></el-icon>
            <template #title>网络拓扑</template>
          </el-menu-item>
        </el-menu>
      </el-scrollbar>
    </el-aside>

    <el-container>
      <el-header class="header">
        <div class="header-left flex items-center gap-4">
          <el-icon class="collapse-btn" @click="toggleCollapse">
            <Fold v-if="!isCollapse" />
            <Expand v-else />
          </el-icon>
          <el-breadcrumb separator="/">
            <el-breadcrumb-item v-for="item in breadcrumbs" :key="item.path">
              {{ item.title }}
            </el-breadcrumb-item>
          </el-breadcrumb>
        </div>
        <div class="header-right flex items-center gap-4">
          <el-badge :value="unreadAlerts" :hidden="unreadAlerts === 0" class="badge-item">
            <el-icon class="header-icon" @click="goToAlerts"><Bell /></el-icon>
          </el-badge>
          <el-tooltip :content="wsStatusText" placement="bottom">
            <el-icon class="header-icon" :class="wsStatusClass">
              <Link v-if="wsConnected" />
              <Close v-else />
            </el-icon>
          </el-tooltip>
          <el-dropdown>
            <div class="user-info flex items-center gap-2">
              <el-avatar :size="36" src="https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png" />
              <span class="username">管理员</span>
            </div>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item>个人中心</el-dropdown-item>
                <el-dropdown-item divided>退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>

      <el-main class="main">
        <router-view v-slot="{ Component }">
          <transition name="fade-transform" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAppStore } from '@/stores/app'

const route = useRoute()
const router = useRouter()
const appStore = useAppStore()

const isCollapse = computed(() => appStore.sidebarCollapsed)
const unreadAlerts = computed(() => appStore.unreadAlerts)
const wsConnected = computed(() => appStore.wsConnected)

const activeMenu = computed(() => route.path)

const wsStatusClass = computed(() => ({
  'ws-connected': wsConnected.value,
  'ws-disconnected': !wsConnected.value
}))

const wsStatusText = computed(() =>
  wsConnected.value ? 'WebSocket 已连接' : 'WebSocket 未连接'
)

const breadcrumbs = computed(() => {
  const matched = route.matched.filter(item => item.meta && item.meta.title)
  return matched.map(item => ({
    path: item.path,
    title: item.meta.title
  }))
})

const toggleCollapse = () => {
  appStore.toggleSidebar()
}

const goToAlerts = () => {
  router.push('/alerts')
}
</script>

<style scoped>
.layout-container {
  height: 100vh;
}

.aside {
  background: #1f2d3d;
  transition: width 0.3s;
  overflow: hidden;
}

.logo-wrap {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  background: #19222d;
  color: #fff;
  font-weight: 600;
  border-bottom: 1px solid #2d3a4b;
}

.logo-wrap.collapsed {
  justify-content: center;
}

.logo-icon {
  font-size: 24px;
}

.logo-text {
  font-size: 16px;
  white-space: nowrap;
}

.menu-scroll {
  height: calc(100vh - 60px);
}

.header {
  background: #fff;
  box-shadow: 0 1px 4px rgba(0, 21, 41, 0.08);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  height: 60px;
}

.header-left {
  flex: 1;
}

.collapse-btn {
  font-size: 20px;
  cursor: pointer;
  color: #606266;
  transition: color 0.3s;
}

.collapse-btn:hover {
  color: #409EFF;
}

.header-icon {
  font-size: 20px;
  cursor: pointer;
  color: #606266;
  transition: color 0.3s;
}

.header-icon:hover {
  color: #409EFF;
}

.header-icon.ws-connected {
  color: #67c23a;
}

.header-icon.ws-disconnected {
  color: #f56c6c;
}

.badge-item {
  display: inline-flex;
  align-items: center;
}

.user-info {
  cursor: pointer;
  padding: 0 10px;
  border-radius: 4px;
  transition: background 0.3s;
}

.user-info:hover {
  background: #f5f7fa;
}

.username {
  font-size: 14px;
  color: #303133;
}

.main {
  background: #f5f7fa;
  padding: 0;
  overflow-y: auto;
}

.fade-transform-enter-active,
.fade-transform-leave-active {
  transition: all 0.3s;
}

.fade-transform-enter-from {
  opacity: 0;
  transform: translateX(20px);
}

.fade-transform-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}
</style>
