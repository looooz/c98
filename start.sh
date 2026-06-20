#!/bin/bash

set -e

echo "=========================================="
echo "  家庭网络设备管理工具 - 一键启动脚本"
echo "  后端端口: 3098 | 前端端口: 5098"
echo "=========================================="

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"

cleanup() {
    echo ""
    echo "正在停止服务..."
    kill $BACKEND_PID 2>/dev/null || true
    kill $FRONTEND_PID 2>/dev/null || true
    wait $BACKEND_PID 2>/dev/null || true
    wait $FRONTEND_PID 2>/dev/null || true
    echo "服务已停止。"
    exit 0
}

trap cleanup SIGINT SIGTERM

echo ""
echo "[1/4] 检查后端依赖..."
if [ ! -d "$BACKEND_DIR/node_modules" ]; then
    echo "正在安装后端依赖..."
    cd "$BACKEND_DIR"
    npm install --registry=https://registry.npmmirror.com || npm install
else
    echo "后端依赖已安装。"
fi

echo ""
echo "[2/4] 检查前端依赖..."
if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
    echo "正在安装前端依赖..."
    cd "$FRONTEND_DIR"
    npm install --registry=https://registry.npmmirror.com || npm install
else
    echo "前端依赖已安装。"
fi

echo ""
echo "[3/4] 启动后端服务 (端口 3098)..."
cd "$BACKEND_DIR"
npm start &
BACKEND_PID=$!
echo "后端 PID: $BACKEND_PID"

sleep 3

echo ""
echo "[4/4] 启动前端服务 (端口 5098)..."
cd "$FRONTEND_DIR"
npm run dev -- --port 5098 &
FRONTEND_PID=$!
echo "前端 PID: $FRONTEND_PID"

echo ""
echo "=========================================="
echo "  启动完成！"
echo "  后端 API:  http://localhost:3098"
echo "  前端界面:  http://localhost:5098"
echo "  按 Ctrl+C 停止所有服务"
echo "=========================================="

wait
