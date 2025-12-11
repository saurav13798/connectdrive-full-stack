#!/bin/bash

# ConnectDrive - Complete Setup and Start Script
# Cross-platform shell script for Linux/macOS

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}========================================"
echo -e "ConnectDrive - Complete Setup and Start"
echo -e "========================================${NC}"
echo ""

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to wait for HTTP endpoint
wait_for_endpoint() {
    local url=$1
    local timeout=${2:-300}
    local timer=0
    
    echo -n "Waiting for $url"
    while [ $timer -lt $timeout ]; do
        if curl -s --max-time 5 "$url" >/dev/null 2>&1; then
            echo ""
            return 0
        fi
        echo -n "."
        sleep 5
        timer=$((timer + 5))
    done
    echo ""
    return 1
}

# Check if Docker is running
echo -e "${YELLOW}[1/8] Checking Docker...${NC}"
if ! command_exists docker; then
    echo -e "${RED}ERROR: Docker is not installed!${NC}"
    echo -e "${RED}Please install Docker from: https://docs.docker.com/get-docker/${NC}"
    exit 1
fi

if ! docker info >/dev/null 2>&1; then
    echo -e "${RED}ERROR: Docker daemon is not running!${NC}"
    echo -e "${RED}Please start Docker and try again.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Docker is running${NC}"

# Check if Docker Compose is available
if ! command_exists docker-compose && ! docker compose version >/dev/null 2>&1; then
    echo -e "${RED}ERROR: Docker Compose is not available!${NC}"
    echo -e "${RED}Please install Docker Compose.${NC}"
    exit 1
fi

# Use docker-compose or docker compose based on availability
if command_exists docker-compose; then
    DOCKER_COMPOSE="docker-compose"
else
    DOCKER_COMPOSE="docker compose"
fi

# Check if Node.js is installed
echo -e "${YELLOW}[2/8] Checking Node.js...${NC}"
if ! command_exists node; then
    echo -e "${RED}ERROR: Node.js is not installed!${NC}"
    echo -e "${RED}Please install Node.js from: https://nodejs.org/${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Node.js is installed${NC}"

# Create development environment file if it doesn't exist
echo -e "${YELLOW}[3/8] Setting up environment...${NC}"
if [ ! -f .env ]; then
    if [ -f .env.example ]; then
        cp .env.example .env
    else
        echo -e "${BLUE}Creating default .env file...${NC}"
        cat > .env << 'EOF'
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
EOF
    fi
fi
echo -e "${GREEN}✓ Environment configured${NC}"

# Install backend dependencies
echo -e "${YELLOW}[4/8] Installing backend dependencies...${NC}"
cd backend
if [ ! -d node_modules ]; then
    echo -e "${BLUE}Installing backend packages...${NC}"
    npm install
else
    echo -e "${GREEN}✓ Backend dependencies already installed${NC}"
fi
cd ..

# Install frontend dependencies
echo -e "${YELLOW}[5/8] Installing frontend dependencies...${NC}"
cd frontend
if [ ! -d node_modules ]; then
    echo -e "${BLUE}Installing frontend packages...${NC}"
    npm install
else
    echo -e "${GREEN}✓ Frontend dependencies already installed${NC}"
fi
cd ..

# Build and start services
echo -e "${YELLOW}[6/8] Building Docker images...${NC}"
$DOCKER_COMPOSE build --no-cache
echo -e "${GREEN}✓ Docker images built successfully${NC}"

# Start all services
echo -e "${YELLOW}[7/8] Starting all services...${NC}"
$DOCKER_COMPOSE up -d

# Wait for services to be ready
echo -e "${YELLOW}[8/8] Waiting for services to be ready...${NC}"
echo -e "${BLUE}This may take a few minutes on first run...${NC}"

# Wait for backend to be ready
if wait_for_endpoint "http://localhost:3001/health" 180; then
    echo -e "${GREEN}✓ Backend is healthy${NC}"
else
    echo -e "${YELLOW}⚠ Backend may still be starting...${NC}"
fi

# Wait for frontend to be ready
if wait_for_endpoint "http://localhost:3000" 120; then
    echo -e "${GREEN}✓ Frontend is healthy${NC}"
else
    echo -e "${YELLOW}⚠ Frontend may still be starting...${NC}"
fi

echo ""
echo -e "${CYAN}========================================"
echo -e "🎉 ConnectDrive is running!"
echo -e "========================================${NC}"
echo ""
echo -e "${NC}Services:"
echo -e "${BLUE}• Frontend:    http://localhost:3000${NC}"
echo -e "${BLUE}• Backend API: http://localhost:3001${NC}"
echo -e "${BLUE}• MinIO Admin: http://localhost:9001${NC}"
echo -e "${BLUE}• Database:    localhost:5432${NC}"
echo -e "${BLUE}• Redis:       localhost:6379${NC}"
echo ""
echo -e "${NC}Credentials:"
echo -e "${BLUE}• MinIO: minioadmin / minioadmin${NC}"
echo -e "${BLUE}• Database: connect / connectpass${NC}"
echo ""

# Open browser (platform-specific)
echo -e "${BLUE}Opening frontend in browser...${NC}"
sleep 2
if command_exists xdg-open; then
    xdg-open http://localhost:3000 >/dev/null 2>&1 &
elif command_exists open; then
    open http://localhost:3000 >/dev/null 2>&1 &
else
    echo -e "${YELLOW}Please open http://localhost:3000 in your browser${NC}"
fi

echo ""
echo -e "${NC}Useful commands:"
echo -e "${BLUE}• Stop all services: $DOCKER_COMPOSE down${NC}"
echo -e "${BLUE}• View logs: $DOCKER_COMPOSE logs -f${NC}"
echo -e "${BLUE}• Restart services: $DOCKER_COMPOSE restart${NC}"
echo ""

read -p "Would you like to view live logs? (y/N): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    $DOCKER_COMPOSE logs -f
fi