@echo off
cd /d "%~dp0"
where node >nul 2>nul || (echo Instale o Node.js 24 para abrir o portfolio. & pause & exit /b 1)
start "" "http://127.0.0.1:3000"
node server.mjs
pause
