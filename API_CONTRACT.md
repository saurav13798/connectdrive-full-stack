# ConnectDrive - API Contract & Data Shapes

**Version:** 1.0.0  
**Last Updated:** December 10, 2025  
**Status:** Specification Document

---

## Table of Contents
1. [Overview](#overview)
2. [TypeORM Entities](#typeorm-entities)
3. [Data Transfer Objects (DTOs)](#data-transfer-objects)
4. [API Endpoints](#api-endpoints)
5. [Response Formats](#response-formats)
6. [Error Handling](#error-handling)

---

## Overview

### Base URLs
- **Production API:** `https://api.connectdrive.com` (port 3001)
- **Development API:** `http://localhost:3001`
- **Frontend:** `http://localhost:3000`

### Authentication
- **Method:** JWT Bearer Token
- **Header:** `Authorization: Bearer <token>`
- **Location:** HTTP Cookie (accessToken) or Authorization header
- **Expiry:** 15 minutes (access token)
- **Refresh:** Using refresh token via `/auth/refresh` endpoint

### CORS
- **Origin:** Frontend URL (configurable)
- **Credentials:** Included
- **Methods:** GET, POST, PUT, DELETE, PATCH
- **Headers:** Content-Type, Authorization

---

## TypeORM Entities

### 1. User Entity
```typescript
@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  passwordHash: string;

  @Column({ nullable: true })
  displayName: string;

  @Column('bigint', { default: 0 })
  storageQuota: number; // bytes (default 5GB = 5368709120)

  @Column('bigint', { default: 0 })
  storageUsed: number; // bytes

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @OneToMany(() => FileEntity, file => file.owner)
  files: FileEntity[];

  @OneToMany(() => Folder, folder => folder.owner)
  folders: Folder[];

  @OneToMany(() => Share, share => share.createdBy)
  shares: Share[];
}
```

### 2. Folder Entity
```typescript
@Entity('folders')
export class Folder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  ownerId: string; // foreign key to User

  @Column({ nullable: true })
  parentId: string; // self-reference for hierarchy

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ default: false })
  isDeleted: boolean;

  @Column({ nullable: true })
  deletedAt: Date;

  // Relations
  @ManyToOne(() => User, user => user.folders)
  @JoinColumn({ name: 'ownerId' })
  owner: User;

  @ManyToOne(() => Folder, folder => folder.children)
  @JoinColumn({ name: 'parentId' })
  parent: Folder;

  @OneToMany(() => Folder, folder => folder.parent)
  children: Folder[];

  @OneToMany(() => FileEntity, file => file.folder)
  files: FileEntity[];
}
```

### 3. FileEntity
```typescript
@Entity('files')
export class FileEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  ownerId: string; // foreign key to User

  @Column({ nullable: true })
  folderId: string; // foreign key to Folder

  @Column()
  key: string; // MinIO storage key (unique identifier)

  @Column()
  filename: string; // user-friendly name

  @Column('bigint')
  size: number; // bytes

  @Column()
  mime: string; // MIME type (e.g., 'image/jpeg')

  @Column({ default: false })
  isDeleted: boolean;

  @Column({ nullable: true })
  deletedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column('int', { default: 1 })
  currentVersion: number;

  // Relations
  @ManyToOne(() => User, user => user.files)
  @JoinColumn({ name: 'ownerId' })
  owner: User;

  @ManyToOne(() => Folder, folder => folder.files)
  @JoinColumn({ name: 'folderId' })
  folder: Folder;

  @OneToMany(() => FileVersion, version => version.file, { cascade: true })
  versions: FileVersion[];

  @OneToMany(() => Share, share => share.file)
  shares: Share[];

  @OneToMany(() => RecycleEntry, entry => entry.file)
  recycleEntries: RecycleEntry[];
}
```

### 4. FileVersion Entity
```typescript
@Entity('file_versions')
export class FileVersion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  fileId: string; // foreign key to FileEntity

  @Column('int')
  versionNumber: number; // 1, 2, 3, ...

  @Column()
  key: string; // MinIO storage key for this version

  @Column('bigint')
  size: number;

  @CreateDateColumn()
  uploadedAt: Date;

  @Column()
  uploadedBy: string; // User ID

  // Relations
  @ManyToOne(() => FileEntity, file => file.versions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'fileId' })
  file: FileEntity;
}
```

### 5. Share Entity
```typescript
@Entity('shares')
export class Share {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  fileId: string; // foreign key to FileEntity (null if sharing folder)

  @Column({ nullable: true })
  folderId: string; // foreign key to Folder (null if sharing file)

  @Column()
  createdById: string; // foreign key to User (who created the share)

  @Column({ unique: true })
  shareToken: string; // unique token for public access (e.g., 'abc123xyz')

  @Column('text', { nullable: true })
  permissions: string; // JSON: { canDownload, canUpload, canShare, canDelete }

  @Column({ default: true })
  isPublic: boolean;

  @Column({ nullable: true })
  expiresAt: Date; // null = never expires

  @CreateDateColumn()
  createdAt: Date;

  @Column({ default: false })
  isActive: boolean;

  // Relations
  @ManyToOne(() => FileEntity, file => file.shares)
  @JoinColumn({ name: 'fileId' })
  file: FileEntity;

  @ManyToOne(() => Folder)
  @JoinColumn({ name: 'folderId' })
  folder: Folder;

  @ManyToOne(() => User, user => user.shares)
  @JoinColumn({ name: 'createdById' })
  createdBy: User;
}
```

### 6. RecycleEntry Entity
```typescript
@Entity('recycle_bin')
export class RecycleEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  fileId: string; // foreign key to FileEntity

  @Column({ nullable: true })
  folderId: string; // foreign key to Folder

  @Column()
  ownerId: string; // User who owns the deleted item

  @Column()
  itemName: string; // filename or folder name

  @Column({ nullable: true })
  itemType: string; // 'file' or 'folder'

  @Column({ nullable: true })
  originalPath: string; // /folder1/subfolder/filename.txt

  @CreateDateColumn()
  deletedAt: Date;

  @Column()
  deletedBy: string; // User ID who deleted it

  @Column('bigint', { nullable: true })
  size: number; // for files

  @Column({ nullable: true })
  expiresAt: Date; // auto-delete after 30 days

  // Relations
  @ManyToOne(() => FileEntity)
  @JoinColumn({ name: 'fileId' })
  file: FileEntity;

  @ManyToOne(() => Folder)
  @JoinColumn({ name: 'folderId' })
  folder: Folder;
}
```

---

## Data Transfer Objects (DTOs)

### Auth DTOs

#### RegisterDto
```typescript
export class RegisterDto {
  @IsEmail()
  email: string;

  @MinLength(8)
  password: string;

  @IsOptional()
  @IsString()
  displayName?: string;
}
```

#### LoginDto
```typescript
export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;
}
```

#### AuthResponseDto
```typescript
export class AuthResponseDto {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    displayName: string;
    storageQuota: number;
    storageUsed: number;
  };
}
```

#### UserDto
```typescript
export class UserDto {
  id: string;
  email: string;
  displayName: string;
  storageQuota: number;
  storageUsed: number;
  createdAt: Date;
}
```

### File DTOs

#### CreateFileDto
```typescript
export class CreateFileDto {
  filename: string;

  @IsOptional()
  folderId?: string;

  size: number;
  mime: string;
}
```

#### FileResponseDto
```typescript
export class FileResponseDto {
  id: string;
  filename: string;
  size: number;
  mime: string;
  folderId: string;
  createdAt: Date;
  updatedAt: Date;
  currentVersion: number;
  isDeleted: boolean;
  downloadUrl?: string; // signed URL
}
```

#### FileListDto
```typescript
export class FileListDto {
  items: FileResponseDto[];
  total: number;
  page: number;
  limit: number;
}
```

### Folder DTOs

#### CreateFolderDto
```typescript
export class CreateFolderDto {
  name: string;

  @IsOptional()
  parentId?: string; // parent folder ID
}
```

#### FolderResponseDto
```typescript
export class FolderResponseDto {
  id: string;
  name: string;
  parentId: string;
  createdAt: Date;
  updatedAt: Date;
  isDeleted: boolean;
  childCount: number;
  fileCount: number;
}
```

#### FolderTreeDto
```typescript
export class FolderTreeDto {
  id: string;
  name: string;
  parentId: string;
  children: FolderTreeDto[];
  files: FileResponseDto[];
}
```

### Share DTOs

#### CreateShareDto
```typescript
export class CreateShareDto {
  @IsOptional()
  fileId?: string;

  @IsOptional()
  folderId?: string;

  @IsOptional()
  expiresAt?: Date;

  @IsOptional()
  permissions?: {
    canDownload: boolean;
    canUpload: boolean;
    canShare: boolean;
    canDelete: boolean;
  };
}
```

#### ShareResponseDto
```typescript
export class ShareResponseDto {
  id: string;
  shareToken: string;
  shareUrl: string; // https://connectdrive.com/share/abc123xyz
  fileId: string;
  folderId: string;
  isPublic: boolean;
  expiresAt: Date;
  createdAt: Date;
  permissions: object;
}
```

---

## API Endpoints

### Authentication Endpoints

#### 1. Register User
```
POST /auth/register
Content-Type: application/json

Request:
{
  "email": "user@example.com",
  "password": "secure123!",
  "displayName": "John Doe"
}

Response: 201 Created
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "displayName": "John Doe",
    "storageQuota": 5368709120,
    "storageUsed": 0
  }
}
```

#### 2. Login User
```
POST /auth/login
Content-Type: application/json

Request:
{
  "email": "user@example.com",
  "password": "secure123!"
}

Response: 200 OK
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "user": { ... }
}
```

#### 3. Get Current User
```
GET /auth/me
Authorization: Bearer <token>

Response: 200 OK
{
  "id": "uuid",
  "email": "user@example.com",
  "displayName": "John Doe",
  "storageQuota": 5368709120,
  "storageUsed": 1024000,
  "createdAt": "2025-12-10T12:00:00Z"
}
```

#### 4. Refresh Token
```
POST /auth/refresh
Authorization: Bearer <refresh_token>

Response: 200 OK
{
  "accessToken": "new_token"
}
```

#### 5. Logout
```
POST /auth/logout
Authorization: Bearer <token>

Response: 200 OK
{
  "message": "Logged out successfully"
}
```

---

### File Management Endpoints

#### 1. List Files (in root or folder)
```
GET /files/list?folderId=<uuid>&page=1&limit=20
Authorization: Bearer <token>

Response: 200 OK
{
  "items": [
    {
      "id": "uuid",
      "filename": "document.pdf",
      "size": 2048000,
      "mime": "application/pdf",
      "folderId": "uuid",
      "createdAt": "2025-12-10T12:00:00Z",
      "updatedAt": "2025-12-10T12:00:00Z",
      "currentVersion": 1,
      "isDeleted": false
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 20
}
```

#### 2. Get Upload Presigned URL
```
POST /files/presigned-upload
Authorization: Bearer <token>
Content-Type: application/json

Request:
{
  "filename": "document.pdf",
  "mime": "application/pdf",
  "size": 2048000,
  "folderId": "uuid" (optional)
}

Response: 200 OK
{
  "uploadUrl": "https://minio:9000/connectdrive/...",
  "fileId": "uuid",
  "key": "user_uuid/document.pdf"
}
```

#### 3. Confirm Upload
```
POST /files/confirm-upload
Authorization: Bearer <token>
Content-Type: application/json

Request:
{
  "fileId": "uuid",
  "key": "user_uuid/document.pdf",
  "size": 2048000,
  "mime": "application/pdf"
}

Response: 201 Created
{
  "id": "uuid",
  "filename": "document.pdf",
  "size": 2048000,
  "mime": "application/pdf",
  "createdAt": "2025-12-10T12:00:00Z"
}
```

#### 4. Get Download Presigned URL
```
GET /files/download/:fileId
Authorization: Bearer <token>

Response: 200 OK
{
  "url": "https://minio:9000/connectdrive/...?X-Amz-Signature=..."
}
```

#### 5. Delete File (soft delete)
```
DELETE /files/:fileId
Authorization: Bearer <token>

Response: 200 OK
{
  "message": "File moved to recycle bin"
}
```

#### 6. Get File Versions
```
GET /files/:fileId/versions
Authorization: Bearer <token>

Response: 200 OK
{
  "versions": [
    {
      "id": "uuid",
      "versionNumber": 2,
      "uploadedAt": "2025-12-10T12:05:00Z",
      "size": 2048000,
      "uploadedBy": "uuid"
    },
    {
      "id": "uuid",
      "versionNumber": 1,
      "uploadedAt": "2025-12-10T12:00:00Z",
      "size": 2000000,
      "uploadedBy": "uuid"
    }
  ]
}
```

#### 7. Restore File Version
```
POST /files/:fileId/versions/:versionId/restore
Authorization: Bearer <token>

Response: 200 OK
{
  "message": "File restored to version X"
}
```

---

### Folder Management Endpoints

#### 1. List Folders (tree view)
```
GET /folders/tree?parentId=<uuid>
Authorization: Bearer <token>

Response: 200 OK
{
  "id": "uuid",
  "name": "Root",
  "parentId": null,
  "children": [
    {
      "id": "uuid",
      "name": "Documents",
      "parentId": "uuid",
      "children": [],
      "files": []
    }
  ],
  "files": [
    {
      "id": "uuid",
      "filename": "readme.txt",
      "size": 1024,
      "mime": "text/plain",
      "createdAt": "2025-12-10T12:00:00Z"
    }
  ]
}
```

#### 2. Create Folder
```
POST /folders
Authorization: Bearer <token>
Content-Type: application/json

Request:
{
  "name": "My Documents",
  "parentId": "uuid" (optional)
}

Response: 201 Created
{
  "id": "uuid",
  "name": "My Documents",
  "parentId": "uuid",
  "createdAt": "2025-12-10T12:00:00Z",
  "childCount": 0,
  "fileCount": 0
}
```

#### 3. Update Folder
```
PUT /folders/:folderId
Authorization: Bearer <token>
Content-Type: application/json

Request:
{
  "name": "Updated Name"
}

Response: 200 OK
{
  "id": "uuid",
  "name": "Updated Name",
  "parentId": "uuid",
  "updatedAt": "2025-12-10T12:05:00Z"
}
```

#### 4. Delete Folder (soft delete)
```
DELETE /folders/:folderId
Authorization: Bearer <token>

Response: 200 OK
{
  "message": "Folder moved to recycle bin"
}
```

#### 5. Move File to Folder
```
PATCH /files/:fileId/move
Authorization: Bearer <token>
Content-Type: application/json

Request:
{
  "folderId": "uuid"
}

Response: 200 OK
{
  "message": "File moved successfully"
}
```

---

### Share Management Endpoints

#### 1. Create Share Link
```
POST /shares
Authorization: Bearer <token>
Content-Type: application/json

Request:
{
  "fileId": "uuid" (optional),
  "folderId": "uuid" (optional),
  "expiresAt": "2025-12-20T12:00:00Z" (optional),
  "permissions": {
    "canDownload": true,
    "canUpload": false,
    "canShare": false,
    "canDelete": false
  }
}

Response: 201 Created
{
  "id": "uuid",
  "shareToken": "abc123xyz789",
  "shareUrl": "http://localhost:3000/share/abc123xyz789",
  "fileId": "uuid",
  "isPublic": true,
  "expiresAt": "2025-12-20T12:00:00Z",
  "createdAt": "2025-12-10T12:00:00Z",
  "permissions": { ... }
}
```

#### 2. List My Shares
```
GET /shares/my-shares
Authorization: Bearer <token>

Response: 200 OK
{
  "shares": [
    {
      "id": "uuid",
      "shareToken": "abc123xyz789",
      "shareUrl": "...",
      "fileId": "uuid",
      "createdAt": "2025-12-10T12:00:00Z",
      "expiresAt": "2025-12-20T12:00:00Z"
    }
  ]
}
```

#### 3. Get Share Details (public endpoint, no auth)
```
GET /shares/public/:shareToken

Response: 200 OK
{
  "id": "uuid",
  "fileId": "uuid",
  "folderId": "uuid",
  "filename": "document.pdf",
  "size": 2048000,
  "mime": "application/pdf",
  "createdAt": "2025-12-10T12:00:00Z",
  "permissions": { ... },
  "files": [
    { ... } (if folder)
  ]
}
```

#### 4. Download via Share Link (public endpoint, no auth)
```
GET /shares/public/:shareToken/download

Response: 200 OK
Redirects to signed MinIO URL
```

#### 5. Revoke Share
```
DELETE /shares/:shareId
Authorization: Bearer <token>

Response: 200 OK
{
  "message": "Share revoked"
}
```

---

### Recycle Bin Endpoints

#### 1. List Recycle Bin
```
GET /recycle
Authorization: Bearer <token>

Response: 200 OK
{
  "items": [
    {
      "id": "uuid",
      "itemName": "document.pdf",
      "itemType": "file",
      "originalPath": "/Documents/document.pdf",
      "deletedAt": "2025-12-10T12:00:00Z",
      "deletedBy": "uuid",
      "size": 2048000,
      "expiresAt": "2025-01-09T12:00:00Z"
    }
  ]
}
```

#### 2. Restore from Recycle
```
POST /recycle/:recycleId/restore
Authorization: Bearer <token>

Response: 200 OK
{
  "message": "Item restored successfully"
}
```

#### 3. Permanently Delete
```
DELETE /recycle/:recycleId
Authorization: Bearer <token>

Response: 200 OK
{
  "message": "Item permanently deleted"
}
```

#### 4. Empty Recycle Bin
```
DELETE /recycle/empty
Authorization: Bearer <token>

Response: 200 OK
{
  "message": "Recycle bin emptied"
}
```

---

### Worker/Job Endpoints

#### 1. Get Job Status (admin only)
```
GET /worker/jobs/:jobId
Authorization: Bearer <token>
X-Admin: true

Response: 200 OK
{
  "id": "job-uuid",
  "status": "completed",
  "type": "file-compression",
  "progress": 100,
  "result": { ... }
}
```

#### 2. List Active Jobs (admin only)
```
GET /worker/jobs?status=active
Authorization: Bearer <token>
X-Admin: true

Response: 200 OK
{
  "jobs": [ ... ]
}
```

---

## Response Formats

### Success Response
```json
{
  "success": true,
  "data": { /* endpoint-specific data */ },
  "message": "Operation successful"
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Email is required",
    "details": [
      {
        "field": "email",
        "message": "Email must be valid"
      }
    ]
  },
  "timestamp": "2025-12-10T12:00:00Z"
}
```

### Pagination Response
```json
{
  "data": [ /* items */ ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5,
    "hasNext": true,
    "hasPrev": false
  }
}
```

---

## Error Handling

### HTTP Status Codes
| Code | Meaning | Example |
|------|---------|---------|
| 200 | OK | File downloaded |
| 201 | Created | File uploaded |
| 204 | No Content | File deleted |
| 400 | Bad Request | Invalid parameters |
| 401 | Unauthorized | Missing/invalid token |
| 403 | Forbidden | No permission |
| 404 | Not Found | File not found |
| 409 | Conflict | File already exists |
| 413 | Payload Too Large | File exceeds quota |
| 500 | Server Error | Internal error |

### Error Codes
```
AUTH_INVALID_CREDENTIALS
AUTH_EMAIL_EXISTS
AUTH_TOKEN_EXPIRED
AUTH_REFRESH_FAILED

FILE_NOT_FOUND
FILE_EXISTS
FILE_QUOTA_EXCEEDED
FILE_UPLOAD_FAILED
FILE_DOWNLOAD_FAILED

FOLDER_NOT_FOUND
FOLDER_EXISTS
FOLDER_NOT_EMPTY

SHARE_NOT_FOUND
SHARE_EXPIRED
SHARE_REVOKED

PERMISSION_DENIED
RESOURCE_NOT_FOUND
VALIDATION_ERROR
```

---

## Implementation Notes

1. **File Storage**: MinIO with folder-based structure: `/user-id/folder-structure/filename`
2. **Token Expiry**: Access tokens valid 15 minutes, refresh tokens valid 7 days
3. **Storage Quota**: Default 5GB, configurable per user
4. **Soft Deletes**: Files moved to recycle bin (30-day retention)
5. **Versioning**: Keep up to 10 versions per file
6. **Sharing**: Tokens are unique, URL-safe strings (base64url)
7. **Background Jobs**: BullMQ for file processing, cleanup jobs
8. **Timestamps**: UTC, ISO 8601 format
