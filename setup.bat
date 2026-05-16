@echo off
chcp 65001 >nul

:: Create log directory and file
if not exist "log" mkdir log
for /f "tokens=2 delims==" %%a in ('wmic OS Get localdatetime /value') do set "dt=%%a"
set "LOGFILE=log\setup-%dt:~0,8%-%dt:~8,6%.log"

:: Start logging (all output goes to file AND screen)
call :main 2>&1 | findstr /r ".*" >> "%LOGFILE%"
goto :eof

:main
echo.
echo   ========================================
echo        Orkestria Setup
echo   ========================================
echo   Log: %LOGFILE%
echo.

where docker >nul 2>&1 || (echo [ERRO] Docker nao encontrado. && exit /b 1)
where pnpm >nul 2>&1 || (echo [ERRO] pnpm nao encontrado. && exit /b 1)
where node >nul 2>&1 || (echo [ERRO] Node.js nao encontrado. && exit /b 1)
echo [OK] Pre-requisitos ok
echo.

echo [1/6] Limpando containers antigos...
docker compose down -v 2>nul
echo.

echo [2/6] Subindo PostgreSQL, Redis e MinIO...
docker compose up -d
echo Aguardando PostgreSQL...
timeout /t 5 /nobreak >nul
echo [OK] Infra pronta
echo.

echo [3/6] Instalando dependencias...
call pnpm install
echo [OK] Dependencias instaladas
echo.

cd apps\api

echo [4/6] Gerando Prisma Client...
call npx prisma generate
echo [OK] Prisma Client gerado
echo.

echo [5/6] Rodando migrations...
call npx prisma migrate dev --name init
echo [OK] Banco criado
echo.

echo [6/6] Populando banco com dados demo...
docker exec -i orkestria-postgres psql -U postgres -d orkestria < prisma\seed.sql
echo [OK] Dados inseridos
echo.

cd ..\..

echo.
echo   ========================================
echo        Setup completo!
echo.
echo   Para iniciar:  pnpm dev
echo.
echo   Frontend:  http://localhost:3000
echo   API Docs:  http://localhost:4000/api/docs
echo.
echo   Login: admin@orkestria.com
echo   Senha: Admin@2025!
echo   ========================================
echo   Log salvo em: %LOGFILE%
echo.
goto :eof
