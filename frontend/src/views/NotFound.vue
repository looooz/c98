<template>
  <div class="not-found-page">
    <div class="nf-box">
      <div class="nf-icon">🛰️</div>
      <div class="nf-code">404</div>
      <div class="nf-title">页面走丢了</div>
      <div class="nf-desc">您访问的页面不存在或已被移除</div>
      <div class="nf-actions">
        <el-button type="primary" @click="$router.push('/')">
          <el-icon><HomeFilled /></el-icon>
          <span>返回首页</span>
        </el-button>
        <el-button @click="$router.back()">
          <el-icon><Back /></el-icon>
          <span>返回上一页</span>
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { HomeFilled, Back } from '@element-plus/icons-vue'
</script>

<style scoped>
.not-found-page {
  min-height: calc(100vh - 120px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
}
.nf-box {
  text-align: center;
  padding: 60px 80px;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06);
}
.nf-icon {
  font-size: 80px;
  margin-bottom: 20px;
  animation: float 3s ease-in-out infinite;
}
.nf-code {
  font-size: 96px;
  font-weight: 800;
  line-height: 1;
  background: linear-gradient(135deg, #409eff 0%, #67c23a 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  margin-bottom: 16px;
}
.nf-title {
  font-size: 24px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 8px;
}
.nf-desc {
  font-size: 14px;
  color: #909399;
  margin-bottom: 32px;
}
.nf-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}
@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}
</style>
