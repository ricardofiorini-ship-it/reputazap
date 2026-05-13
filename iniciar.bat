@echo off
echo ====================================
echo   StarTouch - Iniciando...
echo ====================================
echo.

echo [1/2] Instalando dependencias...
call npm install --silent
echo Dependencias OK!
echo.

echo [2/2] Iniciando servidores...
echo.
echo - Frontend: http://localhost:5173
echo - Backend:  http://localhost:3001
echo.
echo Para conectar o Google Meu Negocio:
echo http://localhost:3001/auth/google
echo.
echo Pressione CTRL+C para parar
echo ====================================

start "StarTouch Backend" cmd /k "node server.js"
timeout /t 2 /nobreak >nul
npm run dev
