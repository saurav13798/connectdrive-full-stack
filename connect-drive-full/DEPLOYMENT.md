# ConnectDrive Deployment Guide

## Quick Start (Docker Compose)

### Development Environment

1. **Clone repository and setup**
   ```bash
   git clone <repo>
   cd connectdrive
   cp .env.example .env
   ```

2. **Start services**
   ```bash
   docker-compose up -d
   ```

3. **Access endpoints**
   - Frontend: http://localhost:3000
   - Backend: http://localhost:3001
   - MinIO Console: http://localhost:9001

### Production Deployment

#### Option 1: Docker Compose (Small Scale)

1. **Prepare production environment**
   ```bash
   cp .env.production .env
   # Edit .env with production secrets
   ```

2. **Build production images**
   ```bash
   docker-compose build --no-cache
   docker-compose up -d
   ```

3. **Setup reverse proxy** (Nginx recommended)
   ```nginx
   upstream backend {
     server localhost:3001;
   }

   upstream frontend {
     server localhost:3000;
   }

   server {
     listen 80;
     server_name yourdomain.com;
     
     # Redirect to HTTPS
     return 301 https://$server_name$request_uri;
   }

   server {
     listen 443 ssl http2;
     server_name yourdomain.com;

     # SSL certificates
     ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
     ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

     # Backend API
     location /api/ {
       proxy_pass http://backend;
       proxy_set_header Host $host;
       proxy_set_header X-Real-IP $remote_addr;
       proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
       proxy_set_header X-Forwarded-Proto $scheme;
     }

     # Frontend
     location / {
       proxy_pass http://frontend;
       proxy_set_header Host $host;
       proxy_set_header X-Real-IP $remote_addr;
     }
   }
   ```

#### Option 2: Kubernetes (Large Scale)

1. **Build and push images**
   ```bash
   docker build -t your-registry/connectdrive-backend:1.0.0 ./backend
   docker build -t your-registry/connectdrive-frontend:1.0.0 ./frontend
   docker push your-registry/connectdrive-backend:1.0.0
   docker push your-registry/connectdrive-frontend:1.0.0
   ```

2. **Deploy to Kubernetes**
   - Use Helm charts for standardized deployment
   - Configure ingress for routing
   - Setup persistent volumes for data

#### Option 3: Managed Services

**AWS:**
- RDS for PostgreSQL
- ElastiCache for Redis
- S3 or MinIO on EC2
- CloudFront for CDN
- EC2 or ECS for application

**Azure:**
- Azure Database for PostgreSQL
- Azure Cache for Redis
- Azure Storage (or MinIO)
- Azure Container Instances
- Application Gateway

**Google Cloud:**
- Cloud SQL for PostgreSQL
- Cloud Memorystore for Redis
- Cloud Storage (or MinIO)
- Cloud Run or GKE
- Cloud Load Balancing

## Environment Configuration

### Essential Variables for Production

```bash
# Security
JWT_SECRET=<generate-strong-random-32char-string>
NODE_ENV=production

# Database (use managed service)
DATABASE_HOST=<rds-endpoint>
DATABASE_PORT=5432
DATABASE_USER=<db-user>
DATABASE_PASSWORD=<strong-password>
DATABASE_NAME=connectdrive

# MinIO/S3
MINIO_ENDPOINT=<minio-or-s3-endpoint>
MINIO_ACCESS_KEY=<access-key>
MINIO_SECRET_KEY=<secret-key>
MINIO_USE_SSL=true

# Redis (use managed service)
REDIS_HOST=<redis-endpoint>
REDIS_PASSWORD=<redis-password>

# Frontend
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
```

## Database Setup

### Initial Migration

```bash
# Connect to database
psql -h <host> -U <user> -d <database>

# Run TypeORM migrations
npm run typeorm migration:run
```

### Backup Strategy

```bash
# Daily backup script
#!/bin/bash
pg_dump -h $DB_HOST -U $DB_USER $DB_NAME | \
  gzip > backups/backup-$(date +%Y%m%d).sql.gz

# Upload to S3
aws s3 cp backups/ s3://connectdrive-backups/ --recursive
```

## Monitoring & Health Checks

### Health Endpoint

```bash
GET /health
# Returns: { "status": "ok", "uptime": 123456 }
```

### Logging

```bash
# Docker logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Application logs
tail -f /var/log/connectdrive/backend.log
```

### Metrics to Monitor

- Request latency (p95, p99)
- Error rate (5xx responses)
- Database connection pool
- Redis memory usage
- Disk space (especially MinIO)
- CPU and memory utilization

## Backup & Recovery

### Database Backup

```bash
# Automated daily backup
0 2 * * * /scripts/backup-db.sh

# Restore
psql -h $DB_HOST -U $DB_USER $DB_NAME < backup.sql
```

### MinIO Backup

```bash
# Sync to S3
aws s3 sync s3://connectdrive-prod s3://connectdrive-backup-prod

# Or use MinIO Mirror
mc mirror connectdrive backup
```

## Performance Tuning

### PostgreSQL

```sql
-- Connection pooling
max_connections = 200
shared_buffers = 256MB
effective_cache_size = 1GB
work_mem = 16MB

-- Indexes (auto-created by TypeORM)
CREATE INDEX idx_user_email ON "user"(email);
CREATE INDEX idx_file_owner ON "file"(owner_id);
CREATE INDEX idx_file_folder ON "file"(folder_id);
```

### Redis

```bash
# Memory limit
maxmemory 2gb
maxmemory-policy allkeys-lru

# Persistence
save 900 1
save 300 10
appendonly yes
```

### Application

```typescript
// Database connection pooling
ormconfig.extra = {
  max: 20,
  min: 5,
  idle: 30000
}

// Cache strategies
cache.ttl = 300 // 5 minutes
cache.store = 'redis'
```

## Security Hardening

### SSL/TLS Certificate

```bash
# Let's Encrypt
certbot certonly --standalone -d yourdomain.com

# Auto-renewal
0 0,12 * * * certbot renew --quiet
```

### Firewall Rules

```bash
# Allow only necessary ports
- 22 (SSH): restricted IP range
- 80/443 (HTTP/HTTPS): everywhere
- 5432 (PostgreSQL): internal only
- 6379 (Redis): internal only
- 9000 (MinIO): internal only
```

### Password Security

```bash
# Use strong random passwords (>20 characters)
openssl rand -base64 32

# Rotate credentials regularly (quarterly)
```

## Continuous Integration/Deployment

### GitHub Actions Example

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Build images
        run: docker-compose build
      - name: Push to registry
        run: |
          docker login -u ${{ secrets.DOCKER_USER }}
          docker push connectdrive-backend:${{ github.sha }}
      - name: Deploy
        run: |
          ssh deploy@prod-server 'cd connectdrive && \
          docker pull connectdrive-backend:${{ github.sha }} && \
          docker-compose up -d'
```

## Troubleshooting

### Service won't start

```bash
# Check logs
docker-compose logs <service>

# Verify environment variables
docker-compose config | grep <variable>

# Test connectivity
docker-compose exec backend ping postgres
```

### Database connection issues

```bash
# Test connection
psql -h $DB_HOST -U $DB_USER -d $DB_NAME

# Check connection pool
ps aux | grep postgres
```

### High disk usage

```bash
# Check MinIO bucket size
du -sh /var/lib/minio/

# Archive old files
find /var/lib/minio -mtime +30 -delete
```

## Disaster Recovery

### RTO/RPO Targets
- RTO: 4 hours
- RPO: 1 hour

### Recovery Procedures

1. **Database Recovery**
   - Restore from latest backup
   - Apply transaction logs for point-in-time recovery

2. **Storage Recovery**
   - Restore from S3 backup
   - Sync with secondary region

3. **Application Recovery**
   - Redeploy from Docker images
   - Restore configuration from version control
