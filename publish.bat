@echo off
chcp 65001 >nul
setlocal
title 海贼王卡牌对战 - GitHub Pages 一键发布

if "%~2"=="" (
  echo 用法: publish.bat ^<GitHub用户名^> ^<仓库名^>
  echo 示例: publish.bat alex my-one-piece-card-game
  echo.
  echo 前置条件:
  echo   1. 已在 GitHub 创建空的公开仓库（不要勾选初始化 README）
  echo   2. Windows 凭据管理器里有 GitHub 账号（首次 push 会弹登录窗口）
  echo.
  pause
  exit /b 1
)

set USER=%~1
set REPO=%~2
set URL=https://github.com/%USER%/%REPO%.git

echo ============================================
echo   发布到 %URL%
echo ============================================
echo.

where git >nul 2>nul
if %errorlevel% neq 0 (
  echo [错误] 未检测到 git，请先安装：https://git-scm.com/
  pause
  exit /b 1
)

if not exist .git (
  git init -b main
)

git add .
git commit -m "海贼王卡牌对战 发布更新 %date% %time%"
if not exist .git\refs\tags\v1.0 (
  git tag v1.0
)

git remote remove origin 2>nul
git remote add origin %URL%

echo.
echo 准备推送到 GitHub（如弹出登录窗口请完成授权）...
git push -u origin main --tags

if %errorlevel% neq 0 (
  echo.
  echo [推送失败] 常见原因:
  echo   1. 仓库不为空（先在 GitHub 删掉自动生成的 README 再试）
  echo   2. 未完成登录授权（Windows 凭据管理器添加 GitHub 账号）
  echo   3. 仓库名拼写错误
  pause
  exit /b 1
)

echo.
echo ============================================
echo   ✅ 推送成功！
echo ============================================
echo.
echo 接下来（只需一次）:
echo   1. 打开 https://github.com/%USER%/%REPO%/settings/pages
echo   2. Source 选择 main 分支 / (root)，点 Save
echo   3. 等 1~2 分钟，线上地址:
echo      https://%USER%.github.io/%REPO%/
echo      （发到微信/QQ，手机点开即玩）
echo.
pause
