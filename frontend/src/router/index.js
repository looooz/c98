import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    redirect: '/dashboard'
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: () => import('@/views/Dashboard.vue'),
    meta: { title: '仪表盘', icon: 'DataAnalysis' }
  },
  {
    path: '/scan',
    name: 'Scan',
    component: () => import('@/views/Scan.vue'),
    meta: { title: '设备扫描', icon: 'Search' }
  },
  {
    path: '/devices',
    name: 'Devices',
    component: () => import('@/views/Devices.vue'),
    meta: { title: '设备管理', icon: 'Monitor' }
  },
  {
    path: '/traffic',
    name: 'Traffic',
    component: () => import('@/views/Traffic.vue'),
    meta: { title: '流量监控', icon: 'TrendCharts' }
  },
  {
    path: '/history',
    name: 'History',
    component: () => import('@/views/History.vue'),
    meta: { title: '连接历史', icon: 'Clock' }
  },
  {
    path: '/parental',
    name: 'Parental',
    component: () => import('@/views/Parental.vue'),
    meta: { title: '家长控制', icon: 'UserFilled' }
  },
  {
    path: '/diagnostic',
    name: 'Diagnostic',
    component: () => import('@/views/Diagnostic.vue'),
    meta: { title: '网络诊断', icon: 'Tools' }
  },
  {
    path: '/statistics',
    name: 'Statistics',
    component: () => import('@/views/Statistics.vue'),
    meta: { title: '统计报表', icon: 'PieChart' }
  },
  {
    path: '/alerts',
    name: 'Alerts',
    component: () => import('@/views/Alerts.vue'),
    meta: { title: '告警中心', icon: 'Bell' }
  },
  {
    path: '/topology',
    name: 'Topology',
    component: () => import('@/views/Topology.vue'),
    meta: { title: '网络拓扑', icon: 'Connection' }
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/views/NotFound.vue'),
    meta: { title: '404' }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  if (to.meta.title) {
    document.title = `${to.meta.title} - 智能网络监控管理系统`
  }
  next()
})

export default router
