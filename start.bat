@echo off
chcp 65001 >nul
setlocal

echo ==========================================
echo   家庭网络设备管理工具 - 一键启动脚本
echo   后端端口: 3098 ^| 前端端口: 5098
echo ==========================================

set "ROOT_DIR=%~dp0"
set "BACKEND_DIR=%ROOT_DIR%backend"
set "FRONTEND_DIR=%ROOT_DIR%frontend"

echo.
echo [1/4] 检查后端依赖...
if not exist "%BACKEND_DIR%\node_modules" (
    echo 正在安装后端依赖...
    cd /d "%BACKEND_DIR%"
    call npm install --registry=https://registry.npmmirror.com
) else (
    echo 后端依赖已安装。
)

echo.
echo [2/4] 检查前端依赖...
if not exist "%FRONTEND_DIR%\node_modules" (
    echo 正在安装前端依赖...
    cd /d "%FRONTEND_DIR%"
    call npm install --registry=https://registry.npmmirror.com
) else (
    echo 前端依赖已安装。
)

echo.
echo [3/4] 启动后端服务 (端口 3098)...
cd /d "%BACKEND_DIR%"
start "Backend Server" cmd /k "npm start"

timeout /t 3 /nobreak >nul

echo.
echo [4/4] 启动前端服务 (端口 5098)...
cd /d "%FRONTEND_DIR%"
start "Frontend Server" cmd /k "npm run dev -- --port 5098"

echo.
echo ==========================================
echo   启动完成！
echo   后端 API:  http://localhost:3098
echo   前端界面:  http://localhost:5098
echo   关闭此窗口不会停止服务
echo   请在弹出的命令行窗口中按 Ctrl+C 停止
echo ==========================================

pause
