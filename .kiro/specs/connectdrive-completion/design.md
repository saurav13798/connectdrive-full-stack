# ConnectDrive Completion - Design Document

## Overview

ConnectDrive is a comprehensive cloud file storage platform designed to provide secure, scalable file management capabilities comparable to Google Drive or Dropbox. The system architecture follows a modern microservices approach with a NestJS backend API, Next.js frontend application, PostgreSQL database for metadata, MinIO for object storage, and Redis for caching and job queues.

The current implementation is approximately 25% complete with foundational infrastructure in place. This design document outlines the completion of all remaining features including authentication, file management, folder organization, sharing capabilities, version control, recycle bin functionality, and background job processing.

The system serves multiple user types: end users who store and manage files, external users who access shared content, and system administrators who monitor and maintain the platform.

## Architecture

### High-Level Architecture

The ConnectDrive system follows a layered architecture pattern:

**Presentation Layer (Frontend)**
- Next.js 14 React application with server-side rendering
- Tailwind CSS for responsive UI components
- Context API for state management
- SWR for data fetching and caching
- Axios for HTTP client with interceptors

**API Layer (Backend)**
- NestJS 10 framework with TypeScript
- RESTful API design with OpenAPI documentation
- JWT-based authentication with refresh tokens
- Modular architecture with feature-based modules
- Validation pipes and exception filters

**Business Logic Layer**
- Service classes implementing business rules
- Repository pattern for data access
- Event-driven architecture for cross-module communication
- Background job processing with BullMQ

**Data Layer**
- PostgreSQL 15 for relational data and metadata
- TypeORM for object-relational mapping
- MinIO for S3-compatible object storage
- Redis for caching and message queuing

**Infrastructure Layer**
- Docker containerization for all services
- Docker Compose for local development
- Environment-based configuration
- Logging and monitoring capabilities

### Security Architecture

**Authentication & Authorization**
- JWT tokens with 15-minute access token expiry
- 7-day refresh token rotation
- bcrypt password hashing with salt rounds
- Role-based access control (future extension)

**Data Protection**
- HTTPS encryption for all communications
- Presigned URLs for secure file access
- Input validation and sanitization
- CORS protection for cross-origin requests

**File Security**
- User isolation - users can only access their own files
- Share link permissions with expiration
- Soft deletes with recovery capabilities
- Audit logging for sensitive operations

## Components and Interfaces

### Backend Modules

**Auth Module**
- AuthController: Handles registration, login, token refresh, logout
- AuthService: Implements authentication business logic
- JwtStrategy: Validates JWT tokens and extracts user context
- JwtAuthGuard: Protects routes requiring authentication

**Files Module**
- FilesController: File CRUD operations, upload/download URLs
- FilesService: File metadata management and business logic
- FoldersController: Folder hierarchy and organization
- FoldersService: Folder operations and tree management
- SharesController: Share link creation and management
- SharesService: Share permissions and access control
- RecycleController: Deleted item management
- RecycleService: Soft delete and recovery operations

**MinIO Module**
- MinIOService: Object storage operations
- Presigned URL generation for uploads/downloads
- Object lifecycle management
- Bucket operations and configuration

**Worker Module**
- WorkerService: Background job processing
- Job queues for file processing, cleanup, notifications
- Retry mechanisms and error handling
- Job monitoring and status reporting

### Frontend Components

**Authentication Components**
- LoginForm: User authentication interface
- RegisterForm: New user registration
- AuthContext: Global authentication state
- ProtectedRoute: Route guard for authenticated pages

**File Management Components**
- FileExplorer: Main file management interface
- FolderTree: Hierarchical folder navigation
- FileList: Grid/table view of files with sorting
- FileUploader: Drag-and-drop upload with progress
- FileActions: Context menu for file operations

**Sharing Components**
- ShareDialog: Share link creation and management
- ShareView: Public share access interface
- PermissionSelector: Share permission configuration

**Utility Components**
- Breadcrumb: Navigation path display
- SearchBar: File search and filtering
- StorageIndicator: Quota usage visualization
- ErrorBoundary: Error handling and display

### API Interfaces

**Authentication Endpoints**
- POST /auth/register - User registration
- POST /auth/login - User authentication
- GET /auth/me - Current user profile
- POST /auth/refresh - Token refresh
- POST /auth/logout - Session termination

**File Management Endpoints**
- GET /files/list - File listing with pagination
- POST /files/presigned-upload - Upload URL generation
- POST /files/confirm-upload - Upload confirmation
- GET /files/download/:id - Download URL generation
- DELETE /files/:id - File deletion (soft delete)
- GET /files/:id/versions - Version history
- POST /files/:id/versions/:versionId/restore - Version restoration

**Folder Management Endpoints**
- GET /folders/tree - Folder hierarchy
- POST /folders - Folder creation
- PUT /folders/:id - Folder updates
- DELETE /folders/:id - Folder deletion
- PATCH /files/:id/move - File movement

**Share Management Endpoints**
- POST /shares - Share creation
- GET /shares/my-shares - User's shares
- GET /shares/public/:token - Public share access
- DELETE /shares/:id - Share revocation

**Recycle Bin Endpoints**
- GET /recycle - Deleted items listing
- POST /recycle/:id/restore - Item restoration
- DELETE /recycle/:id - Permanent deletion
- DELETE /recycle/empty - Bulk deletion

## Data Models

### Core Entities

**User Entity**
```typescript
{
  id: string (UUID)
  email: string (unique)
  passwordHash: string
  displayName: string
  storageQuota: number (bytes, default 5GB)
  storageUsed: number (bytes)
  createdAt: Date
  updatedAt: Date
}
```

**FileEntity**
```typescript
{
  id: string (UUID)
  ownerId: string (FK to User)
  folderId: string (FK to Folder, nullable)
  key: string (MinIO object key)
  filename: string
  size: number (bytes)
  mime: string
  isDeleted: boolean
  deletedAt: Date (nullable)
  currentVersion: number
  createdAt: Date
  updatedAt: Date
}
```

**Folder Entity**
```typescript
{
  id: string (UUID)
  name: string
  ownerId: string (FK to User)
  parentId: string (FK to Folder, nullable)
  isDeleted: boolean
  deletedAt: Date (nullable)
  createdAt: Date
  updatedAt: Date
}
```

**FileVersion Entity**
```typescript
{
  id: string (UUID)
  fileId: string (FK to FileEntity)
  versionNumber: number
  key: string (MinIO object key)
  size: number (bytes)
  uploadedAt: Date
  uploadedBy: string (FK to User)
}
```

**Share Entity**
```typescript
{
  id: string (UUID)
  fileId: string (FK to FileEntity, nullable)
  folderId: string (FK to Folder, nullable)
  createdById: string (FK to User)
  shareToken: string (unique)
  permissions: string (JSON)
  isPublic: boolean
  expiresAt: Date (nullable)
  isActive: boolean
  createdAt: Date
}
```

**RecycleEntry Entity**
```typescript
{
  id: string (UUID)
  fileId: string (FK to FileEntity, nullable)
  folderId: string (FK to Folder, nullable)
  ownerId: string (FK to User)
  itemName: string
  itemType: string ('file' | 'folder')
  originalPath: string
  deletedAt: Date
  deletedBy: string (FK to User)
  size: number (bytes, nullable)
  expiresAt: Date (30 days from deletion)
}
```

### Relationships

**User Relationships**
- One-to-Many: User → FileEntity (owner)
- One-to-Many: User → Folder (owner)
- One-to-Many: User → Share (creator)
- One-to-Many: User → FileVersion (uploader)

**File Relationships**
- Many-to-One: FileEntity → User (owner)
- Many-to-One: FileEntity → Folder (parent)
- One-to-Many: FileEntity → FileVersion (versions)
- One-to-Many: FileEntity → Share (shares)
- One-to-Many: FileEntity → RecycleEntry (recycle entries)

**Folder Relationships**
- Many-to-One: Folder → User (owner)
- Many-to-One: Folder → Folder (parent, self-referencing)
- One-to-Many: Folder → Folder (children)
- One-to-Many: Folder → FileEntity (files)
- One-to-Many: Folder → Share (shares)

### Data Transfer Objects

**Authentication DTOs**
```typescript
RegisterDto: { email, password, displayName? }
LoginDto: { email, password }
AuthResponseDto: { accessToken, refreshToken, user }
UserDto: { id, email, displayName, storageQuota, storageUsed, createdAt }
```

**File Management DTOs**
```typescript
CreateFileDto: { filename, folderId?, size, mime }
FileResponseDto: { id, filename, size, mime, folderId, createdAt, updatedAt, currentVersion, isDeleted, downloadUrl? }
FileListDto: { items: FileResponseDto[], total, page, limit }
```

**Folder Management DTOs**
```typescript
CreateFolderDto: { name, parentId? }
FolderResponseDto: { id, name, parentId, createdAt, updatedAt, isDeleted, childCount, fileCount }
FolderTreeDto: { id, name, parentId, children: FolderTreeDto[], files: FileResponseDto[] }
```

**Share Management DTOs**
```typescript
CreateShareDto: { fileId?, folderId?, expiresAt?, permissions? }
ShareResponseDto: { id, shareToken, shareUrl, fileId, folderId, isPublic, expiresAt, createdAt, permissions }
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

Based on the prework analysis, the following correctness properties have been identified to ensure the ConnectDrive system operates correctly across all scenarios:

### Authentication Properties

**Property 1: User registration creates valid accounts**
*For any* valid email and password combination, user registration should create a new account with default storage quota and proper metadata
**Validates: Requirements 1.1**

**Property 2: Duplicate email rejection**
*For any* existing user email, attempting to register again should be rejected with appropriate error message
**Validates: Requirements 1.2**

**Property 3: Valid login returns tokens**
*For any* valid user credentials, login should return both access and refresh JWT tokens
**Validates: Requirements 1.3**

**Property 4: Token refresh functionality**
*For any* valid refresh token, the system should generate new access tokens when requested
**Validates: Requirements 1.4**

**Property 5: Logout invalidates tokens**
*For any* authenticated user session, logout should invalidate all associated tokens
**Validates: Requirements 1.5**

### File Management Properties

**Property 6: Upload URL generation**
*For any* valid file upload request, the system should generate presigned URLs for MinIO upload
**Validates: Requirements 2.1**

**Property 7: Upload confirmation creates metadata**
*For any* successful file upload, confirmation should create corresponding File_Entity records in database
**Validates: Requirements 2.2**

**Property 8: Quota enforcement**
*For any* file upload that would exceed user storage quota, the system should reject the upload
**Validates: Requirements 2.3**

**Property 9: Storage accounting**
*For any* file upload, the user's storage usage counter should be updated by the file size
**Validates: Requirements 2.4**

**Property 10: File versioning on duplicate names**
*For any* file uploaded with existing filename in same folder, a new version should be created while preserving the original
**Validates: Requirements 2.5**

### Folder Management Properties

**Property 11: Folder hierarchy establishment**
*For any* folder creation request, proper hierarchical relationships should be established with parent folders
**Validates: Requirements 3.1**

**Property 12: File movement updates references**
*For any* file moved between folders, the file's parent folder reference should be updated correctly
**Validates: Requirements 3.2**

**Property 13: Cascading folder deletion**
*For any* folder containing files or subfolders, deletion should move all contents to recycle bin
**Validates: Requirements 3.3**

**Property 14: Folder tree generation**
*For any* folder structure, tree requests should return complete hierarchical representation with accurate file counts
**Validates: Requirements 3.4**

**Property 15: Folder renaming preserves relationships**
*For any* folder rename operation, all existing relationships and contents should remain intact
**Validates: Requirements 3.5**

### Sharing Properties

**Property 16: Share token uniqueness**
*For any* share creation request, the system should generate unique share tokens that don't collide
**Validates: Requirements 4.1**

**Property 17: Public share access**
*For any* valid share link, external users should be able to access content without authentication
**Validates: Requirements 4.2**

**Property 18: Share expiration enforcement**
*For any* expired share link, access attempts should be denied with appropriate error messages
**Validates: Requirements 4.3**

**Property 19: Share permission enforcement**
*For any* share with specific permissions, the system should enforce download, upload, and modification restrictions
**Validates: Requirements 4.4**

**Property 20: Share revocation**
*For any* revoked share link, access should be immediately disabled for all users
**Validates: Requirements 4.5**

### Recycle Bin Properties

**Property 21: Soft deletion to recycle bin**
*For any* deleted file or folder, the item should be moved to recycle bin with 30-day retention period
**Validates: Requirements 5.1**

**Property 22: Item restoration**
*For any* item in recycle bin, restoration should return it to original location with all metadata intact
**Validates: Requirements 5.2**

**Property 23: Recycle bin emptying**
*For any* recycle bin empty operation, all contained items should be permanently deleted immediately
**Validates: Requirements 5.4**

**Property 24: Recycle bin metadata display**
*For any* deleted item, recycle bin should display original path and deletion timestamp
**Validates: Requirements 5.5**

### File Versioning Properties

**Property 25: Version creation on duplicate upload**
*For any* file uploaded with existing filename, new versions should be created while preserving previous versions
**Validates: Requirements 6.1**

**Property 26: Version listing chronological order**
*For any* file with multiple versions, version requests should return chronologically ordered list with proper metadata
**Validates: Requirements 6.2**

**Property 27: Version restoration**
*For any* previous file version, restoration should make that version the current active version
**Validates: Requirements 6.3**

**Property 28: Version limit enforcement**
*For any* file exceeding 10 versions, the system should automatically remove oldest versions to maintain limit
**Validates: Requirements 6.4**

**Property 29: Version-specific download URLs**
*For any* specific file version, download requests should provide presigned URLs for that exact version
**Validates: Requirements 6.5**

### Download Properties

**Property 30: Download URL generation with expiration**
*For any* file download request, the system should generate presigned URLs with limited time validity
**Validates: Requirements 7.1**

**Property 31: Shared file permission verification**
*For any* shared file download, the system should verify share permissions before providing access
**Validates: Requirements 7.4**

**Property 32: Folder archive creation**
*For any* folder download request, the system should create archives containing all folder contents
**Validates: Requirements 7.5**

### Background Job Properties

**Property 33: Job queuing**
*For any* operation requiring background processing, the system should queue jobs using BullMQ
**Validates: Requirements 8.1**

**Property 34: Job completion updates**
*For any* completed background job, relevant database records should be updated with results
**Validates: Requirements 8.2**

**Property 35: Job retry on failure**
*For any* failed background job, the system should retry according to configured retry policy
**Validates: Requirements 8.3**

**Property 36: Job status reporting**
*For any* background job, administrators should be able to query current status and progress
**Validates: Requirements 8.5**

### Navigation Properties

**Property 37: Navigation state updates**
*For any* folder navigation action, breadcrumb navigation and browser history should be updated correctly
**Validates: Requirements 9.3**

**Property 38: Multi-file upload processing**
*For any* drag-and-drop upload with multiple files, all files should be processed with proper progress tracking
**Validates: Requirements 9.4**

### Search and Filter Properties

**Property 39: Search result accuracy**
*For any* search query, results should include all files matching filename or metadata criteria
**Validates: Requirements 10.1**

**Property 40: File type filtering**
*For any* file type filter, only files matching selected MIME types should be displayed
**Validates: Requirements 10.2**

**Property 41: File list sorting**
*For any* sort criteria (name, size, date, type), files should be reordered correctly
**Validates: Requirements 10.3**

**Property 42: Scoped folder search**
*For any* search within a folder, results should be limited to current folder and subfolders only
**Validates: Requirements 10.4**

**Property 43: Advanced search criteria**
*For any* advanced search with date ranges and size criteria, results should match all specified parameters
**Validates: Requirements 10.5**

### Security Properties

**Property 44: Input validation**
*For any* user input, the system should validate data according to defined schemas and reject invalid input
**Validates: Requirements 11.1**

**Property 45: Password hashing security**
*For any* password storage, the system should use bcrypt hashing with appropriate salt rounds
**Validates: Requirements 11.2**

**Property 46: User ownership verification**
*For any* file operation, the system should verify user ownership before allowing access or modification
**Validates: Requirements 11.3**

**Property 47: Secure token generation**
*For any* share link creation, tokens should be cryptographically secure and unique
**Validates: Requirements 11.4**

**Property 48: Rate limiting enforcement**
*For any* API request pattern, the system should enforce rate limiting to prevent abuse
**Validates: Requirements 11.5**

### Storage Management Properties

**Property 49: Storage usage display accuracy**
*For any* user dashboard view, current storage usage and remaining quota should be calculated and displayed correctly
**Validates: Requirements 12.1**

**Property 50: Quota warning notifications**
*For any* user approaching storage quota limit, appropriate warning notifications should be provided
**Validates: Requirements 12.2**

**Property 51: Quota enforcement on uploads**
*For any* user exceeding storage quota, new uploads should be prevented until space is freed
**Validates: Requirements 12.3**

**Property 52: Storage accounting on deletion**
*For any* file deletion, user storage usage should be immediately updated to reflect freed space
**Validates: Requirements 12.4**

**Property 53: Dynamic quota management**
*For any* administrator quota modification, new limits should be applied and enforced immediately
**Validates: Requirements 12.5**

## Error Handling

### Error Categories

**Authentication Errors**
- Invalid credentials (401 Unauthorized)
- Expired tokens (401 Unauthorized)
- Missing authentication (401 Unauthorized)
- Insufficient permissions (403 Forbidden)

**File Operation Errors**
- File not found (404 Not Found)
- Storage quota exceeded (413 Payload Too Large)
- Invalid file type (400 Bad Request)
- Upload failure (500 Internal Server Error)

**Folder Operation Errors**
- Folder not found (404 Not Found)
- Folder not empty (409 Conflict)
- Invalid folder name (400 Bad Request)
- Circular reference (400 Bad Request)

**Share Operation Errors**
- Share not found (404 Not Found)
- Share expired (410 Gone)
- Share revoked (403 Forbidden)
- Invalid permissions (400 Bad Request)

**System Errors**
- Database connection failure (500 Internal Server Error)
- MinIO service unavailable (503 Service Unavailable)
- Background job failure (500 Internal Server Error)
- Rate limit exceeded (429 Too Many Requests)

### Error Response Format

All API errors follow a consistent format:
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": [
      {
        "field": "fieldName",
        "message": "Field-specific error message"
      }
    ]
  },
  "timestamp": "2025-12-10T12:00:00Z"
}
```

### Error Recovery Strategies

**Transient Errors**
- Automatic retry with exponential backoff
- Circuit breaker pattern for external services
- Graceful degradation when possible

**User Errors**
- Clear error messages with suggested actions
- Input validation with specific field errors
- Progressive disclosure of error details

**System Errors**
- Comprehensive logging for debugging
- Fallback mechanisms where applicable
- User-friendly error pages

## Testing Strategy

### Dual Testing Approach

The ConnectDrive system requires both unit testing and property-based testing to ensure comprehensive coverage:

**Unit Testing**
- Specific examples demonstrating correct behavior
- Integration points between modules
- Edge cases and error conditions
- Mock external dependencies for isolated testing

**Property-Based Testing**
- Universal properties verified across all inputs
- Randomized test data generation
- Comprehensive input space coverage
- Long-running tests with multiple iterations

### Property-Based Testing Implementation

**Testing Framework**: fast-check (JavaScript/TypeScript property-based testing library)

**Configuration Requirements**:
- Minimum 100 iterations per property test
- Custom generators for domain-specific data types
- Shrinking capabilities for minimal failing examples

**Property Test Tagging**:
Each property-based test must include a comment with the exact format:
`**Feature: connectdrive-completion, Property {number}: {property_text}**`

Example:
```typescript
// **Feature: connectdrive-completion, Property 1: User registration creates valid accounts**
test('user registration property', () => {
  fc.assert(fc.property(
    fc.emailAddress(),
    fc.string({ minLength: 8 }),
    async (email, password) => {
      const result = await authService.register({ email, password });
      expect(result.user.storageQuota).toBe(DEFAULT_QUOTA);
      expect(result.user.storageUsed).toBe(0);
    }
  ), { numRuns: 100 });
});
```

### Unit Testing Strategy

**Authentication Module**
- Valid registration with various input combinations
- Login with correct and incorrect credentials
- Token refresh and expiration scenarios
- Logout and session cleanup

**File Management Module**
- File upload with different sizes and types
- Download URL generation and expiration
- File versioning and restoration
- Storage quota enforcement

**Folder Management Module**
- Folder creation and hierarchy building
- File movement between folders
- Folder deletion and restoration
- Tree structure generation

**Sharing Module**
- Share link creation and access
- Permission enforcement scenarios
- Share expiration and revocation
- Public access without authentication

**Background Jobs Module**
- Job queuing and processing
- Retry mechanisms and failure handling
- Job status monitoring and reporting
- Cleanup operations

### Integration Testing

**End-to-End User Flows**
- Complete user journey: registration → upload → organize → share → download
- Multi-user collaboration scenarios
- Error recovery and edge cases
- Performance under load

**External Service Integration**
- MinIO object storage operations
- PostgreSQL database transactions
- Redis caching and job queues
- JWT token validation

### Test Data Management

**Generators for Property Tests**
- Valid user credentials and profiles
- File metadata with various sizes and types
- Folder hierarchies with different depths
- Share configurations with permissions
- Storage quota scenarios

**Test Database Setup**
- Isolated test database per test suite
- Automatic cleanup after test completion
- Seed data for consistent test scenarios
- Transaction rollback for unit tests

### Performance Testing

**Load Testing Scenarios**
- Concurrent file uploads and downloads
- Large folder tree operations
- High-frequency API requests
- Background job processing under load

**Scalability Validation**
- Database query performance with large datasets
- MinIO storage operations at scale
- Memory usage during file processing
- Response times under various loads