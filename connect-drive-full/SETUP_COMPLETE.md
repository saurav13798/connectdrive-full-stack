# ConnectDrive Setup Complete! 🎉

## What's Been Created

Your ConnectDrive project now includes comprehensive setup scripts that will get the entire application running with a single click!

## 📁 Setup Files Created

### 🖥️ Windows Users
- **`START_CONNECTDRIVE.bat`** - Main launcher with menu options
- **`setup-and-start.bat`** - Batch script setup
- **`setup-and-start.ps1`** - PowerShell setup (recommended)
- **`CREATE_DESKTOP_SHORTCUT.bat`** - Creates desktop shortcut

### 🐧 Linux/macOS Users
- **`setup-and-start.sh`** - Shell script setup

### 📚 Documentation
- **`README.md`** - Complete project documentation
- **`QUICK_START.md`** - Quick start guide
- **`.env.example`** - Environment configuration template

## 🚀 How to Start ConnectDrive

### Option 1: One-Click Launcher (Windows)
```
Double-click: START_CONNECTDRIVE.bat
```

### Option 2: Direct Setup Scripts

**Windows PowerShell (Recommended):**
```powershell
.\setup-and-start.ps1
```

**Windows Command Prompt:**
```cmd
setup-and-start.bat
```

**Linux/macOS:**
```bash
chmod +x setup-and-start.sh
./setup-and-start.sh
```

## ✅ What the Setup Does

1. **Checks Prerequisites** - Verifies Docker and Node.js are installed
2. **Environment Setup** - Creates .env file with development settings
3. **Dependency Installation** - Installs all npm packages for backend and frontend
4. **Docker Build** - Builds all Docker images
5. **Service Startup** - Starts PostgreSQL, Redis, MinIO, Backend, and Frontend
6. **Health Checks** - Waits for all services to be ready
7. **Browser Launch** - Opens the application automatically

## 🌐 Access Points

After setup completes, you can access:

- **📱 Frontend App**: http://localhost:3000
- **🔧 Backend API**: http://localhost:3001
- **💾 MinIO Console**: http://localhost:9001
- **🗄️ Database**: localhost:5432
- **⚡ Redis**: localhost:6379

## 🔑 Default Credentials

- **MinIO Admin**: `minioadmin` / `minioadmin`
- **Database**: `connect` / `connectpass`

## 🛠️ Useful Commands

```bash
# Stop all services
docker-compose down

# View logs
docker-compose logs -f

# Restart services
docker-compose restart

# Check service status
docker-compose ps
```

## 🎯 Next Steps

1. **Run the setup** using one of the methods above
2. **Register an account** at http://localhost:3000
3. **Upload your first file** to test the system
4. **Explore the features** - folders, sharing, search, etc.

## 🐛 Troubleshooting

If you encounter issues:

1. **Check Prerequisites**: Ensure Docker Desktop and Node.js are installed
2. **Port Conflicts**: Make sure ports 3000, 3001, 5432, 6379, 9000, 9001 are free
3. **View Logs**: Run `docker-compose logs -f` to see what's happening
4. **Clean Start**: Run `docker-compose down -v` then try setup again
5. **Check Documentation**: Review `QUICK_START.md` for detailed troubleshooting

## 🎉 Success!

Your ConnectDrive cloud storage platform is now ready to use! The setup scripts handle everything automatically, so you can focus on using and developing the application.

**Enjoy your new cloud storage platform!** ☁️📁✨