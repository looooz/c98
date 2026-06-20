# 家庭网络设备管理工具 (Home Network Manager)

一款功能完整的家庭局域网设备管理系统，支持设备扫描识别、实时流量监控、家长控制、网络诊断、告警通知、网络拓扑可视化等功能。

## 技术栈

- **后端**: Node.js + Express + SQLite3 + `arp-scan`/`ping` + WebSocket
- **前端**: Vue 3 + Element Plus + ECharts + Pinia + Vue Router
- **实时通信**: 原生 WebSocket（双端统一）
- **端口**: 后端 API `3098` | WebSocket `3099` | 前端开发服务器 `5098`

## 快速启动

### macOS / Linux

```bash
# 进入项目根目录
cd c98

# 赋予执行权限并启动
chmod +x start.sh
./start.sh
```

### Windows

```batch
cd c98
start.bat
```

### 手动启动

```bash
# 1. 后端（终端1）
cd backend
npm install           # 首次安装
npm start             # 端口 3098 HTTP + 3099 WebSocket

# 2. 前端（终端2）
cd frontend
npm install           # 首次安装
npm run dev           # 端口 5098
```

启动成功后访问：**http://localhost:5098/**

健康检查：**http://localhost:3098/api/health**

## 功能模块

### 1. 设备扫描与发现
- ✅ 自动扫描当前局域网（ARP + Ping 组合，自动 fallback 到模拟数据）
- ✅ 手动指定 IP 范围扫描，实时进度显示
- ✅ 定时自动扫描（每小时/每周期）
- ✅ 扫描进度通过 WebSocket 实时推送
- ✅ 设备信息：IP、MAC、主机名、厂商（MAC OUI 识别）、设备类型、OS（TTL 推断）、信号强度、首次/最后在线时间

### 2. 设备管理
- ✅ 自定义设备名称、备注、分组（家庭成员/访客/智能家居）
- ✅ 预设 20+ 设备类型图标（手机/电脑/平板/电视/摄像头/路由器/游戏机...）
- ✅ 编辑/删除/忽略设备
- ✅ 批量导入/导出（JSON）
- ✅ 按 MAC 合并重复设备
- ✅ 搜索/筛选/排序/分页

### 3. 流量监控
- ✅ 实时上传/下载速率（每 2 秒采样，分设备不同流量 Profile）
- ✅ 当前活跃设备列表 + 速率排名
- ✅ 实时波形图（ECharts，近 60 数据点）
- ✅ 今日/本周/本月累计流量统计
- ✅ 按设备流量排行（Top 10）
- ✅ 时段流量趋势图（日/周/月）
- ✅ 时段建模：早中晚高峰不同流量因子

### 4. 连接历史
- ✅ 设备上线/下线事件完整记录
- ✅ 每日在线时长统计（近 30 天）
- ✅ 历史连接设备列表
- ✅ 设备在线时间线（可视化分段显示）

### 5. 家长控制
- ✅ 特定设备上网时间限制（按天/按时间段）
- ✅ 一键断网 / 恢复网络（支持时长参数）
- ✅ 按时间段屏蔽（如工作日 22:00-07:00）
- ✅ 按天屏蔽（如周日全天）
- ✅ 规则启用/禁用开关
- ✅ 定时任务管理
- ✅ 黑白名单/关键词过滤（预留字段）

### 6. 网络诊断
- ✅ Ping 测试（目标/次数/延迟/丢包）
- ✅ 网络质量检测：延迟 + 丢包率 + 综合评分
- ✅ 异步速度测试（返回任务 ID 轮询结果）
- ✅ 端口扫描（常用端口列表）
- ✅ 路由追踪
- ✅ 本机网络接口信息

### 7. 统计报表
- ✅ 总设备数/在线数/告警数/今日流量 KPI 卡片
- ✅ 各类型设备数量占比饼图 + 环形图
- ✅ 每日在线峰值趋势（30 天折线）
- ✅ 新增设备趋势（柱状）
- ✅ 流量使用 Top 10 排行
- ✅ 导出设备列表/流量记录/连接历史/月度报告

### 8. 告警通知
- ✅ 新设备接入提醒（自动入库 + 实时推送）
- ✅ 陌生设备告警（未知厂商/未知类型高亮）
- ✅ 设备离线/上线通知
- ✅ 流量异常突增告警（3σ 算法 + 200% 增幅阈值）
- ✅ 站内消息列表（标记已读/全部已读/未读计数）
- ✅ 浏览器桌面通知（ElMessage 分级提示）
- ✅ 告警类型按级别分类（info/warning/error/critical）

### 9. 网络拓扑可视化
- ✅ 三种布局：树形/环形/力导向
- ✅ 路由器为中心节点，按设备类型分组显示
- ✅ 在线/离线状态（绿色/灰色不同颜色）
- ✅ 节点可点击查看设备详情侧边栏
- ✅ 图表缩放/拖拽/全屏/导出 PNG·SVG
- ✅ 网络概览 KPI + 设备类型分布进度条 + 节点详情面板

## 项目目录结构

```
c98/
├── start.sh                  # macOS/Linux 一键启动脚本
├── start.bat                 # Windows 一键启动脚本
├── README.md
│
├── backend/                  # 后端 (Node.js + Express)
│   ├── package.json
│   ├── data/                 # SQLite 数据库文件目录
│   │   └── network_manager.db
│   ├── public/               # 静态资源（可选）
│   └── src/
│       ├── index.js          # 主入口 + 流量监控 + 定时任务
│       ├── database.js       # SQLite3 封装 + 10 张表初始化
│       ├── websocket.js      # 原生 WS 服务 + 广播/心跳/订阅
│       ├── routes/           # 7 个 API 路由模块（56+ 端点）
│       │   ├── devices.js    # 设备 + 扫描 + 导入导出
│       │   ├── traffic.js    # 实时/历史/统计/排行/趋势
│       │   ├── history.js    # 连接记录/时间线/每日时长
│       │   ├── parental.js   # 规则/定时任务/断网
│       │   ├── diagnostic.js # Ping/测速/端口/Traceroute
│       │   ├── statistics.js # 报表/导出/月度报告
│       │   └── alerts.js     # 告警列表/已读/未读计数
│       └── services/
│           ├── deviceScanner.js   # 真实扫描 + mock 扫描 + 厂商OUI
│           ├── macVendors.js      # MAC 前缀厂商表 + 类型推断
│           ├── trafficMonitor.js  # 流量建模 + 聚合 + 排行
│           └── alertService.js    # 3σ 异常检测 + 告警生成
│
└── frontend/                 # 前端 (Vue 3 + Element Plus)
    ├── package.json
    ├── vite.config.js        # 5098 端口 + /api 和 /ws 代理
    ├── index.html
    └── src/
        ├── main.js           # Element Plus + Pinia + Router + ECharts
        ├── App.vue           # 顶部导航 + 侧边栏菜单 + 路由容器
        ├── style.css
        ├── api/index.js      # Axios 封装 + 7 模块 API 函数
        ├── router/index.js   # 10 个路由 + 404 页面
        ├── stores/           # Pinia stores
        │   ├── index.js
        │   ├── app.js        # 侧边栏/主题/WS 状态/未读告警数
        │   └── device.js     # 设备列表/分组/刷新
        ├── utils/
        │   ├── format.js     # 字节/速率/时长/日期/MAC 等格式化
        │   └── websocket.js  # 原生 WS 封装 + 重连 + 心跳 + 事件
        └── views/            # 11 个完整页面
            ├── Dashboard.vue       # 总览仪表盘
            ├── Scan.vue            # 设备扫描
            ├── Devices.vue         # 设备管理
            ├── Traffic.vue         # 流量监控
            ├── History.vue         # 连接历史
            ├── Parental.vue        # 家长控制
            ├── Diagnostic.vue      # 网络诊断
            ├── Statistics.vue      # 统计报表
            ├── Alerts.vue          # 告警中心
            ├── Topology.vue        # 网络拓扑
            └── NotFound.vue        # 404 页面
```

## API 快速参考

统一响应格式:

```json
{ "success": true, "data": ..., "message": "" }
{ "success": false, "error": "...", "message": "" }
```

| 方法 | 路径 | 说明 |
|------|------|------|
| GET  | `/api/health` | 服务健康检查 |
| GET  | `/api/devices` | 设备列表（分页筛选） |
| GET  | `/api/devices/:id` | 设备详情 |
| PUT  | `/api/devices/:id` | 更新设备信息 |
| POST | `/api/devices/scan` | 启动扫描 `{ ipRange?, useMock? }` |
| GET  | `/api/devices/scan/progress` | 获取扫描进度 |
| GET  | `/api/traffic/realtime` | 所有设备实时流量 |
| GET  | `/api/traffic/history/:id` | 单个设备历史流量 |
| GET  | `/api/traffic/rankings` | 流量排行榜 |
| GET  | `/api/history/` | 连接历史记录 |
| GET  | `/api/history/timeline/:id` | 设备在线时间线 |
| GET  | `/api/parental/rules` | 家长控制规则 |
| POST | `/api/parental/devices/:id/block` | 一键断网 |
| POST | `/api/diagnostic/ping` | Ping 测试 |
| POST | `/api/diagnostic/speedtest` | 启动速度测试 |
| GET  | `/api/statistics/overview` | 统计总览 |
| GET  | `/api/alerts` | 告警列表 |
| GET  | `/api/alerts/unread-count` | 未读告警计数 |

## WebSocket 协议

连接: `ws://localhost:3099`

消息格式:
```json
{ "type": "消息类型", "data": { ... }, "timestamp": 1718000000000 }
```

### 服务端推送的消息类型

| 类型 | 说明 | Data |
|------|------|------|
| `connected` | 连接成功，返回 clientId | `{ clientId, connectedAt }` |
| `device_update` / `devices:refresh` | 设备列表刷新 | 刷新事件 |
| `device_online` | 设备上线 | `{ id, mac, ip, timestamp }` |
| `device_offline` | 设备离线 | 同上 |
| `traffic_update` | 每 2 秒实时流量快照 | 所有设备的上下行速率数组 + 总计 |
| `alert` | 新告警推送 | 完整告警对象（含级别/标题/消息） |
| `scan_progress` | 扫描进度 | `{ status, current, total, message, stats }` |
| `online_status` | 定时在线心跳 | `{ type, timestamp }` |
| `pong` | 心跳响应 | `{ serverTime }` |

### 客户端发送

| 类型 | 说明 |
|------|------|
| `ping` | 心跳（自动每 30s） |
| `subscribe` | 订阅频道 |
| `unsubscribe` | 取消订阅 |

## 数据模型亮点

### 设备流量 Profile 建模

根据设备类型应用不同的基准速率 + 时段因子 + 突发概率:

| 类型 | 上行(Kbps) | 下行(Kbps) | 突发倍率 | 说明 |
|------|----------|----------|--------|------|
| router | 500 | 8000 | 1.8 | 中心路由出口 |
| tv | 100 | 6000 | 1.5 | 4K 流媒体 |
| computer | 200 | 3000 | 3.0 | 办公/下载 |
| console | 300 | 2000 | 2.2 | 游戏联机 |
| camera | 400 | 50 | 1.3 | 监控上行推流 |
| phone | 80 | 500 | 2.5 | 手机日常 |
| smart_home | 10 | 30 | 1.2 | IoT 设备低流量 |

### 告警级别

- `info` / `success` - 普通通知（设备上线、扫描完成）
- `warning` / `high` - 警告（新设备、类型未知）
- `error` / `critical` - 严重（流量突增 >500%、陌生设备）

## 常见问题

**Q: 启动后看不到设备？**
> 进入"设备扫描"页，点击"模拟扫描"（无需真实环境）。或启动时自动初始化 20+ 台模拟设备。

**Q: 端口被占用？**
```bash
# macOS/Linux: 查找并关闭占用进程
lsof -i :3098 -i :3099 -i :5098 | grep LISTEN
kill -9 <PID>
```

**Q: 数据库怎么重置？**
```bash
rm backend/data/network_manager.db
```
重启后会自动重建并初始化模拟数据。

**Q: 想对接真实路由器流量？**
> 替换 `backend/src/services/trafficMonitor.js` 中的 `generateTrafficForDevice()`，改用 SNMP/NetFlow/路由器 API 获取真实值即可，其余逻辑无需改动。

## License

MIT
