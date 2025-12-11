# ConnectDrive - Quick Start Guide

## 🚀 One-Click Setup

Choose the setup script for your operating system:

### Windows Users

**Option 1: PowerShell (Recommended)**
```powershell
# Right-click and "Run with PowerShell"
.\setup-and-start.ps1
```

**Option 2: Command Prompt**
```cmd
# Double-click or run from cmd
setup-and-start.bat
```

### Linux/macOS Users

```bash
# Make executable and run
chmod +x setup-and-start.sh
./setup-and-start.sh
```

## 📋 What the Setup Script Does

1. ✅ Checks Docker and Node.js installation
2. ✅ Creates development environment file (.env)
3. ✅ Installs backend dependencies (npm install)
4. ✅ Installs frontend dependencies (npm install)
5. ✅ Builds Docker images
6. ✅ Starts all services (PostgreSQL, Redis, MinIO, Backend, Frontend)
7. ✅ Waits for services to be healthy
8. ✅ Opens the application in your browser

## 🌐 Access Points

After successful setup, you can access:

- **Frontend Application**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **MinIO Admin Console**: http://localhost:9001
- **Database**: localhost:5432
- **Redis**: localhost:6379

## 🔑 Default Credentials

- **MinIO**: `minioadmin` / `minioadmin`
- **Database**: `connect` / `connectpass`

## 🛠️ Manual Setup (Alternative)

If you prefer manual setup:

1. **Install Prerequisites**
   ```bash
   # Ensure Docker and Node.js are installed
   docker --version
   node --version
   ```

2. **Setup Environment**
   ```bash
   cp .env.example .env  # Edit as needed
   ```

3. **Install Dependencies**
   ```bash
   cd backend && npm install && cd ..
   cd frontend && npm install && cd ..
   ```

4. **Start Services**
   ```bash
   docker-compose up -d
   ```

## 🔧 Useful Commands

```bash
# Stop all services
docker-compose down

# View logs
docker-compose logs -f

# Restart services
docker-compose restart

# Rebuild and restart
docker-compose up --build -d

# Check service status
docker-compose ps
```

## 🐛 Troubleshooting

### Docker Issues
- Ensure Docker Desktop is running
- Try `docker system prune` to clean up
- Check available disk space

### Port Conflicts
- Make sure ports 3000, 3001, 5432, 6379, 9000, 9001 are available
- Stop other services using these ports

### Permission Issues (Linux/macOS)
```bash
sudo chown -R $USER:$USER .
chmod +x setup-and-start.sh
```

### Node.js Issues
- Use Node.js version 16 or higher
- Clear npm cache: `npm cache clean --force`

## 📁 Project Structure

```
connect-drive-full/
├── backend/           # NestJS API server
├── frontend/          # Next.js web application
├── docker-compose.yml # Service orchestration
├── .env              # Environment variables
└── setup-and-start.* # Setup scripts
```

## 🎯 Next Steps

1. Register a new account at http://localhost:3000
2. Upload your first file
3. Explore the file management features
4. Check the API documentation at http://localhost:3001/api

## 💡 Development

For development mode with hot reloading:

```bash
# Backend (in backend/ directory)
npm run start:dev

# Frontend (in frontend/ directory)
npm run dev
```

## 📞 Support

If you encounter issues:
1. Check the logs: `docker-compose logs -f`
2. Verify all services are running: `docker-compose ps`
3. Ensure all prerequisites are installed
4. Try rebuilding: `docker-compose up --build -d`