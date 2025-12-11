# ConnectDrive - Complete Setup and Start Script
# PowerShell version for better Windows compatibility

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "ConnectDrive - Complete Setup and Start" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Function to check if a command exists
function Test-Command($cmdname) {
    return [bool](Get-Command -Name $cmdname -ErrorAction SilentlyContinue)
}

# Function to wait for HTTP endpoint
function Wait-ForEndpoint($url, $timeout = 300) {
    $timer = 0
    do {
        try {
            $response = Invoke-WebRequest -Uri $url -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop
            if ($response.StatusCode -eq 200) {
                return $true
            }
        }
        catch {
            # Endpoint not ready yet
        }
        Start-Sleep -Seconds 5
        $timer += 5
        Write-Host "." -NoNewline
    } while ($timer -lt $timeout)
    return $false
}

try {
    # Check if Docker is running
    Write-Host "[1/8] Checking Docker..." -ForegroundColor Yellow
    if (-not (Test-Command "docker")) {
        Write-Host "ERROR: Docker is not installed!" -ForegroundColor Red
        Write-Host "Please install Docker Desktop from: https://www.docker.com/products/docker-desktop" -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }

    try {
        docker info | Out-Null
        Write-Host "✓ Docker is running" -ForegroundColor Green
    }
    catch {
        Write-Host "ERROR: Docker daemon is not running!" -ForegroundColor Red
        Write-Host "Please start Docker Desktop and try again." -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }

    # Check if Node.js is installed
    Write-Host "[2/8] Checking Node.js..." -ForegroundColor Yellow
    if (-not (Test-Command "node")) {
        Write-Host "ERROR: Node.js is not installed!" -ForegroundColor Red
        Write-Host "Please install Node.js from: https://nodejs.org/" -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }
    Write-Host "✓ Node.js is installed" -ForegroundColor Green

    # Create development environment file if it doesn't exist
    Write-Host "[3/8] Setting up environment..." -ForegroundColor Yellow
    if (-not (Test-Path ".env")) {
        if (Test-Path ".env.example") {
            Copy-Item ".env.example" ".env"
        }
        else {
            Write-Host "Creating default .env file..." -ForegroundColor Blue
            @"
# ConnectDrive Development Environment
NODE_ENV=development

# Database Configuration
DB_USER=connect
DB_PASSWORD=connectpass
DB_NAME=connectdrive

# JWT Configuration
JWT_SECRET=dev_secret_key_change_in_production_at_least_32_characters_long
JWT_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d

# MinIO Configuration
MINIO_USER=minioadmin
MINIO_PASSWORD=minioadmin
MINIO_BUCKET=connectdrive
MINIO_USE_SSL=false

# Redis Configuration
REDIS_DB=0

# Storage Configuration
STORAGE_QUOTA=5368709120
RECYCLE_RETENTION_DAYS=30

# Frontend Configuration
NEXT_PUBLIC_API_URL=http://localhost:3001
"@ | Out-File -FilePath ".env" -Encoding UTF8
        }
    }
    Write-Host "✓ Environment configured" -ForegroundColor Green

    # Install backend dependencies
    Write-Host "[4/8] Installing backend dependencies..." -ForegroundColor Yellow
    Push-Location "backend"
    if (-not (Test-Path "node_modules")) {
        Write-Host "Installing backend packages..." -ForegroundColor Blue
        npm install
        if ($LASTEXITCODE -ne 0) {
            throw "Failed to install backend dependencies"
        }
    }
    else {
        Write-Host "✓ Backend dependencies already installed" -ForegroundColor Green
    }
    Pop-Location

    # Install frontend dependencies
    Write-Host "[5/8] Installing frontend dependencies..." -ForegroundColor Yellow
    Push-Location "frontend"
    if (-not (Test-Path "node_modules")) {
        Write-Host "Installing frontend packages..." -ForegroundColor Blue
        npm install
        if ($LASTEXITCODE -ne 0) {
            throw "Failed to install frontend dependencies"
        }
    }
    else {
        Write-Host "✓ Frontend dependencies already installed" -ForegroundColor Green
    }
    Pop-Location

    # Build and start services
    Write-Host "[6/8] Building Docker images..." -ForegroundColor Yellow
    docker-compose build --no-cache
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to build Docker images"
    }
    Write-Host "✓ Docker images built successfully" -ForegroundColor Green

    # Start all services
    Write-Host "[7/8] Starting all services..." -ForegroundColor Yellow
    docker-compose up -d
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to start services"
    }

    # Wait for services to be ready
    Write-Host "[8/8] Waiting for services to be ready..." -ForegroundColor Yellow
    Write-Host "This may take a few minutes on first run..." -ForegroundColor Blue

    # Wait for backend to be ready
    Write-Host "Waiting for backend" -NoNewline -ForegroundColor Blue
    $backendReady = Wait-ForEndpoint "http://localhost:3001/health" 180
    Write-Host ""
    
    if ($backendReady) {
        Write-Host "✓ Backend is healthy" -ForegroundColor Green
    }
    else {
        Write-Host "⚠ Backend may still be starting..." -ForegroundColor Yellow
    }

    # Wait for frontend to be ready
    Write-Host "Waiting for frontend" -NoNewline -ForegroundColor Blue
    $frontendReady = Wait-ForEndpoint "http://localhost:3000" 120
    Write-Host ""
    
    if ($frontendReady) {
        Write-Host "✓ Frontend is healthy" -ForegroundColor Green
    }
    else {
        Write-Host "⚠ Frontend may still be starting..." -ForegroundColor Yellow
    }

    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "🎉 ConnectDrive is running!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Services:" -ForegroundColor White
    Write-Host "• Frontend:    http://localhost:3000" -ForegroundColor Blue
    Write-Host "• Backend API: http://localhost:3001" -ForegroundColor Blue
    Write-Host "• MinIO Admin: http://localhost:9001" -ForegroundColor Blue
    Write-Host "• Database:    localhost:5432" -ForegroundColor Blue
    Write-Host "• Redis:       localhost:6379" -ForegroundColor Blue
    Write-Host ""
    Write-Host "Credentials:" -ForegroundColor White
    Write-Host "• MinIO: minioadmin / minioadmin" -ForegroundColor Blue
    Write-Host "• Database: connect / connectpass" -ForegroundColor Blue
    Write-Host ""
    
    # Open browser
    Write-Host "Opening frontend in browser..." -ForegroundColor Blue
    Start-Sleep -Seconds 2
    Start-Process "http://localhost:3000"

    Write-Host ""
    Write-Host "Useful commands:" -ForegroundColor White
    Write-Host "• Stop all services: docker-compose down" -ForegroundColor Gray
    Write-Host "• View logs: docker-compose logs -f" -ForegroundColor Gray
    Write-Host "• Restart services: docker-compose restart" -ForegroundColor Gray
    Write-Host ""
    
    $choice = Read-Host "Would you like to view live logs? (y/N)"
    if ($choice -eq "y" -or $choice -eq "Y") {
        docker-compose logs -f
    }
}
catch {
    Write-Host ""
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Setup failed. Please check the error above and try again." -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}