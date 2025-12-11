@echo off
echo ========================================
echo ConnectDrive - Complete Setup and Start
echo ========================================
echo.

:: Check if Docker is running
echo [1/8] Checking Docker...
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Docker is not installed or not running!
    echo Please install Docker Desktop and make sure it's running.
    echo Download from: https://www.docker.com/products/docker-desktop
    pause
    exit /b 1
)

docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Docker daemon is not running!
    echo Please start Docker Desktop and try again.
    pause
    exit /b 1
)
echo ✓ Docker is running

:: Check if Node.js is installed
echo [2/8] Checking Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed!
    echo Please install Node.js from: https://nodejs.org/
    pause
    exit /b 1
)
echo ✓ Node.js is installed

:: Create development environment file if it doesn't exist
echo [3/8] Setting up environment...
if not exist .env (
    echo Creating development .env file...
    copy .env.example .env >nul 2>&1
    if not exist .env.example (
        echo Creating default .env file...
        (
            echo # ConnectDrive Development Environment
            echo NODE_ENV=development
            echo.
            echo # Database Configuration
            echo DB_USER=connect
            echo DB_PASSWORD=connectpass
            echo DB_NAME=connectdrive
            echo.
            echo # JWT Configuration
            echo JWT_SECRET=dev_secret_key_change_in_production_at_least_32_characters_long
            echo JWT_EXPIRATION=15m
            echo JWT_REFRESH_EXPIRATION=7d
            echo.
            echo # MinIO Configuration
            echo MINIO_USER=minioadmin
            echo MINIO_PASSWORD=minioadmin
            echo MINIO_BUCKET=connectdrive
            echo MINIO_USE_SSL=false
            echo.
            echo # Redis Configuration
            echo REDIS_DB=0
            echo.
            echo # Storage Configuration
            echo STORAGE_QUOTA=5368709120
            echo RECYCLE_RETENTION_DAYS=30
            echo.
            echo # Frontend Configuration
            echo NEXT_PUBLIC_API_URL=http://localhost:3001
        ) > .env
    )
)
echo ✓ Environment configured

:: Install backend dependencies
echo [4/8] Installing backend dependencies...
cd backend
if not exist node_modules (
    echo Installing backend packages...
    npm install
    if %errorlevel% neq 0 (
        echo ERROR: Failed to install backend dependencies!
        pause
        exit /b 1
    )
) else (
    echo ✓ Backend dependencies already installed
)
cd ..

:: Install frontend dependencies
echo [5/8] Installing frontend dependencies...
cd frontend
if not exist node_modules (
    echo Installing frontend packages...
    npm install
    if %errorlevel% neq 0 (
        echo ERROR: Failed to install frontend dependencies!
        pause
        exit /b 1
    )
) else (
    echo ✓ Frontend dependencies already installed
)
cd ..

:: Build and start services
echo [6/8] Building Docker images...
docker-compose build --no-cache
if %errorlevel% neq 0 (
    echo ERROR: Failed to build Docker images!
    pause
    exit /b 1
)
echo ✓ Docker images built successfully

:: Start all services
echo [7/8] Starting all services...
docker-compose up -d
if %errorlevel% neq 0 (
    echo ERROR: Failed to start services!
    pause
    exit /b 1
)

:: Wait for services to be ready
echo [8/8] Waiting for services to be ready...
echo This may take a few minutes on first run...

:wait_loop
timeout /t 5 /nobreak >nul
docker-compose ps --format "table {{.Name}}\t{{.Status}}" | findstr "Up" >nul
if %errorlevel% neq 0 (
    echo Still waiting for services...
    goto wait_loop
)

:: Check service health
echo.
echo Checking service health...
timeout /t 10 /nobreak >nul

:: Test backend health
curl -s http://localhost:3001/health >nul 2>&1
if %errorlevel% equ 0 (
    echo ✓ Backend is healthy
) else (
    echo ⚠ Backend may still be starting...
)

:: Test frontend
curl -s http://localhost:3000 >nul 2>&1
if %errorlevel% equ 0 (
    echo ✓ Frontend is healthy
) else (
    echo ⚠ Frontend may still be starting...
)

echo.
echo ========================================
echo 🎉 ConnectDrive is starting up!
echo ========================================
echo.
echo Services:
echo • Frontend:    http://localhost:3000
echo • Backend API: http://localhost:3001
echo • MinIO Admin: http://localhost:9001
echo • Database:    localhost:5432
echo • Redis:       localhost:6379
echo.
echo Credentials:
echo • MinIO: minioadmin / minioadmin
echo • Database: connect / connectpass
echo.
echo Opening frontend in browser...
timeout /t 3 /nobreak >nul
start http://localhost:3000

echo.
echo To stop all services, run: docker-compose down
echo To view logs, run: docker-compose logs -f
echo.
echo Press any key to view live logs...
pause >nul
docker-compose logs -f