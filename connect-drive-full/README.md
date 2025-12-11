# ConnectDrive - Cloud Storage Platform

A modern, full-featured cloud storage platform built with NestJS, Next.js, and Docker.

## 🚀 Quick Start

**Just want to run the app? Use our one-click setup:**

### Windows
```cmd
# Double-click or run:
setup-and-start.bat
```

### Linux/macOS
```bash
chmod +x setup-and-start.sh
./setup-and-start.sh
```

### PowerShell (Windows)
```powershell
.\setup-and-start.ps1
```

The setup script will automatically:
- Check prerequisites
- Install dependencies
- Start all services
- Open the app in your browser

## 📋 Features

### ✅ Implemented
- **User Authentication** - JWT-based auth with refresh tokens
- **File Management** - Upload, download, delete, organize files
- **Folder System** - Hierarchical folder structure
- **File Versioning** - Keep multiple versions of files
- **Search** - Find files by name and metadata
- **Storage Quotas** - Per-user storage limits
- **Recycle Bin** - Soft delete with 30-day retention
- **Sharing** - Share files and folders with expiration
- **MinIO Integration** - Scalable object storage
- **Background Jobs** - Async processing with Redis/BullMQ
- **Docker Support** - Full containerization

### 🔄 In Progress
- **File Previews** - Image and document previews
- **Advanced Search** - Full-text search capabilities
- **Admin Dashboard** - User and system management
- **Mobile App** - React Native mobile client

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Next.js       │    │   NestJS        │    │   PostgreSQL    │
│   Frontend      │◄──►│   Backend       │◄──►│   Database      │
│   (Port 3000)   │    │   (Port 3001)   │    │   (Port 5432)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │              ┌─────────────────┐    ┌─────────────────┐
         │              │     MinIO       │    │     Redis       │
         └──────────────►│ Object Storage  │    │   Job Queue     │
                        │  (Port 9000)    │    │  (Port 6379)    │
                        └─────────────────┘    └─────────────────┘
```

## 🛠️ Technology Stack

### Backend
- **NestJS** - Progressive Node.js framework
- **TypeORM** - Database ORM
- **PostgreSQL** - Primary database
- **MinIO** - S3-compatible object storage
- **Redis** - Caching and job queues
- **BullMQ** - Background job processing
- **JWT** - Authentication tokens
- **bcrypt** - Password hashing

### Frontend
- **Next.js** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Utility-first CSS
- **Axios** - HTTP client
- **React Context** - State management

### DevOps
- **Docker** - Containerization
- **Docker Compose** - Multi-container orchestration
- **Jest** - Testing framework
- **ESLint** - Code linting
- **Prettier** - Code formatting

## 📁 Project Structure

```
connect-drive-full/
├── backend/                 # NestJS API server
│   ├── src/
│   │   ├── auth/           # Authentication module
│   │   ├── files/          # File management
│   │   ├── folders/        # Folder operations
│   │   ├── shares/         # Sharing system
│   │   ├── users/          # User management
│   │   ├── minio/          # Object storage
│   │   └── common/         # Shared utilities
│   ├── Dockerfile
│   └── package.json
├── frontend/               # Next.js web app
│   ├── pages/             # App pages
│   ├── components/        # React components
│   ├── contexts/          # React contexts
│   ├── styles/            # CSS styles
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml     # Service orchestration
├── .env.example          # Environment template
└── setup-and-start.*    # Setup scripts
```

## 🔧 Development Setup

### Prerequisites
- **Docker** & **Docker Compose**
- **Node.js** 16+ & **npm**
- **Git**

### Manual Setup
```bash
# Clone repository
git clone <repository-url>
cd connect-drive-full

# Setup environment
cp .env.example .env

# Install dependencies
cd backend && npm install && cd ..
cd frontend && npm install && cd ..

# Start services
docker-compose up -d

# Access the app
open http://localhost:3000
```

### Development Mode
```bash
# Backend (with hot reload)
cd backend
npm run start:dev

# Frontend (with hot reload)
cd frontend
npm run dev
```

## 🧪 Testing

```bash
# Backend tests
cd backend
npm test                    # Run all tests
npm run test:watch         # Watch mode
npm run test:coverage      # Coverage report

# Frontend tests
cd frontend
npm test
```

## 🌐 API Documentation

The backend provides a RESTful API with the following main endpoints:

### Authentication
- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `POST /auth/refresh` - Refresh tokens
- `POST /auth/logout` - Logout

### Files
- `POST /files/init` - Initialize upload
- `POST /files/confirm` - Confirm upload
- `GET /files/list` - List files
- `GET /files/search` - Search files
- `GET /files/:id` - Get file metadata
- `GET /files/:id/download` - Download file
- `DELETE /files/:id` - Delete file

### Folders
- `POST /folders` - Create folder
- `GET /folders` - List folders
- `PUT /folders/:id` - Update folder
- `DELETE /folders/:id` - Delete folder

### Shares
- `POST /shares` - Create share
- `GET /shares` - List shares
- `GET /shares/:token` - Access shared item
- `DELETE /shares/:id` - Revoke share

## 🔒 Security Features

- **JWT Authentication** with refresh tokens
- **Password Hashing** with bcrypt
- **Rate Limiting** on authentication endpoints
- **Input Validation** with class-validator
- **CORS Protection** configured
- **Secure Headers** implemented
- **File Type Validation** for uploads
- **Access Control** for all operations

## 📊 Monitoring & Logging

- **Structured Logging** with Winston
- **Health Checks** for all services
- **Metrics Collection** ready
- **Error Tracking** implemented
- **Performance Monitoring** hooks

## 🚀 Deployment

### Production Environment
```bash
# Use production environment
cp .env.production .env

# Build and deploy
docker-compose -f docker-compose.prod.yml up -d
```

### Environment Variables
Key environment variables to configure:

```env
# Security
JWT_SECRET=your-super-secret-key
DB_PASSWORD=strong-database-password
MINIO_PASSWORD=strong-minio-password

# Storage
STORAGE_QUOTA=5368709120  # 5GB default
MINIO_BUCKET=connectdrive

# External URLs
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

### Common Issues

**Port Conflicts**
```bash
# Check what's using ports
netstat -tulpn | grep :3000
netstat -tulpn | grep :3001
```

**Docker Issues**
```bash
# Clean up Docker
docker system prune -a
docker-compose down -v
```

**Permission Issues (Linux/macOS)**
```bash
sudo chown -R $USER:$USER .
```

### Getting Help

1. Check the [QUICK_START.md](QUICK_START.md) guide
2. Review the logs: `docker-compose logs -f`
3. Verify service status: `docker-compose ps`
4. Open an issue on GitHub

## 🎯 Roadmap

- [ ] Mobile application (React Native)
- [ ] Advanced file previews
- [ ] Real-time collaboration
- [ ] Advanced admin dashboard
- [ ] Multi-tenant support
- [ ] Advanced analytics
- [ ] Third-party integrations
- [ ] Advanced security features

---

**Ready to get started?** Run the setup script and start building with ConnectDrive! 🚀