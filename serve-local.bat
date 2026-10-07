@echo off
chcp 65001 >nul
title 海贼王卡牌对战 - 本地试玩服务器
echo ============================================
echo   海贼王卡牌对战 - 手机局域网试玩
echo ============================================
echo.
echo 正在启动本地服务器（端口 8080）...
echo 启动后：
echo   1. 手机连接同一个 Wi-Fi
echo   2. 手机浏览器访问下面显示的局域网地址
echo   3. 例如 http://192.168.x.x:8080
echo.
echo 按 Ctrl+C 停止服务器
echo ============================================
echo.
where npx >nul 2>nul
if %errorlevel% neq 0 (
  echo [错误] 未检测到 Node.js，请先安装：https://nodejs.org/
  pause
  exit /b 1
)
npx --yes serve -l 8080 .
pause
