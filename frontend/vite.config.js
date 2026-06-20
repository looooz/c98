import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },
  server: {
    port: 5098,
    host: '0.0.0.0',
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3098',
        changeOrigin: true,
        timeout: 60000
      },
      '/ws-api': {
        target: 'ws://localhost:3099',
        ws: true,
        changeOrigin: true
      }
    }
  },
  build: {
    target: 'es2018',
    sourcemap: false,
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        manualChunks: {
          'vue-vendor': ['vue', 'vue-router', 'pinia'],
          'element-plus': ['element-plus', '@element-plus/icons-vue'],
          'echarts': ['echarts', 'vue-echarts']
        }
      }
    }
  }
})
