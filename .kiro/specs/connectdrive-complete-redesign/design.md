# Design Document

## Overview

ConnectDrive Complete Redesign represents a comprehensive overhaul of the existing cloud file storage platform, combining backend feature completion, frontend quality improvements, and modern UI redesign. The system will deliver a production-ready solution comparable to Google Drive or Dropbox, with enterprise-grade security, modern user experience, and robust architecture.

The current platform has a solid foundation with NestJS backend, Next.js frontend, PostgreSQL database, and Docker infrastructure, but requires significant improvements across all layers to meet production standards. This design addresses critical gaps in functionality, user experience, performance, accessibility, and maintainability.

## Architecture

### High-Level Architecture

The system follows a modern three-tier architecture with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend Layer                           │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │   Next.js App   │  │  Design System  │  │  PWA Shell   │ │
│  │                 │  │   Components    │  │              │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    │   API Gateway     │
                    │  (Rate Limiting,  │
                    │   Authentication) │
                    └─────────┬─────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                   Backend Layer                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │   NestJS API    │  │  Background     │  │   MinIO      │ │
│  │   Controllers   │  │   Workers       │  │   Storage    │ │
│  │   Services      │  │   (BullMQ)      │  │   Service    │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                   Data Layer                                │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │   PostgreSQL    │  │     Redis       │  │   MinIO      │ │
│  │   Database      │  │   (Cache/Queue) │  │  Object      │ │
│  │                 │  │                 │  │  Storage     │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Technology Stack

**Frontend:**
- Next.js 14 with App Router
- React 18 with Concurrent Features
- TypeScript with strict mode
- Tailwind CSS with custom design system
- SWR for data fetching and caching
- React Hook Form for form management
- Framer Motion for animations
- React Testing Library + Jest for testing
- Fast-check for property-based testing

**Backend:**
- NestJS with TypeScript
- TypeORM with PostgreSQL
- JWT authentication with refresh tokens
- BullMQ for background job processing
- MinIO for S3-compatible object storage
- Redis for caching and session management
- Class-validator for input validation
- Swagger/OpenAPI for documentation

**Infrastructure:**
- Docker containers with multi-stage builds
- Docker Compose for development
- PostgreSQL 15 for primary database
- Redis 7 for caching and queues
- MinIO for object storage
- Nginx for reverse proxy (production)

## Components and Interfaces

### Frontend Components Architecture

**Design System Components:**
```typescript
// Core UI Components
interface ButtonProps {
  variant: 'primary' | 'secondary' | 'ghost' | 'danger';
  size: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
}

interface InputProps {
  type: 'text' | 'email' | 'password' | 'search';
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  value: string;
  onChange: (value: string) => void;
}

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}
```

**Feature Components:**
```typescript
// File Management Components
interface FileListProps {
  files: FileEntity[];
  viewMode: 'grid' | 'list' | 'details';
  onFileSelect: (file: FileEntity) => void;
  onFileAction: (action: FileAction, files: FileEntity[]) => void;
  loading?: boolean;
}

interface FileUploaderProps {
  onUpload: (files: File[]) => Promise<void>;
  maxFileSize: number;
  allowedTypes: string[];
  multiple?: boolean;
  disabled?: boolean;
}

interface ShareModalProps {
  file: FileEntity;
  isOpen: boolean;
  onClose: () => void;
  onShare: (shareConfig: ShareConfig) => Promise<void>;
}
```

### Backend API Interfaces

**Authentication Endpoints:**
```typescript
// Auth Controller
@Controller('auth')
export class AuthController {
  @Post('register')
  async register(@Body() dto: RegisterDto): Promise<AuthResponse>;
  
  @Post('login')
  async login(@Body() dto: LoginDto): Promise<AuthResponse>;
  
  @Post('refresh')
  async refresh(@Body() dto: RefreshDto): Promise<AuthResponse>;
  
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Request() req): Promise<UserProfile>;
}
```

**File Management Endpoints:**
```typescript
// Files Controller
@Controller('files')
@UseGuards(JwtAuthGuard)
export class FilesController {
  @Get()
  async listFiles(@Query() query: ListFilesDto): Promise<FileListResponse>;
  
  @Post('upload-url')
  async getUploadUrl(@Body() dto: UploadRequestDto): Promise<UploadUrlResponse>;
  
  @Post('confirm-upload')
  async confirmUpload(@Body() dto: ConfirmUploadDto): Promise<FileEntity>;
  
  @Get(':id/download')
  async getDownloadUrl(@Param('id') id: string): Promise<DownloadUrlResponse>;
  
  @Delete(':id')
  async deleteFile(@Param('id') id: string): Promise<void>;
}
```

### Data Transfer Objects

```typescript
// Authentication DTOs
export class RegisterDto {
  @IsEmail()
  email: string;
  
  @IsString()
  @MinLength(8)
  password: string;
  
  @IsString()
  @MinLength(2)
  displayName: string;
}

export class LoginDto {
  @IsEmail()
  email: string;
  
  @IsString()
  password: string;
}

// File Management DTOs
export class UploadRequestDto {
  @IsString()
  filename: string;
  
  @IsNumber()
  @Min(1)
  size: number;
  
  @IsString()
  mimeType: string;
  
  @IsOptional()
  @IsString()
  folderId?: string;
}

export class ListFilesDto {
  @IsOptional()
  @IsString()
  folderId?: string;
  
  @IsOptional()
  @IsString()
  search?: string;
  
  @IsOptional()
  @IsIn(['name', 'size', 'createdAt', 'updatedAt'])
  sortBy?: string;
  
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';
  
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number;
  
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;
}
```

## Data Models

### Database Schema

**User Entity:**
```typescript
@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;
  
  @Column({ unique: true })
  email: string;
  
  @Column()
  passwordHash: string;
  
  @Column()
  displayName: string;
  
  @Column({ type: 'bigint', default: 5368709120 }) // 5GB default
  storageQuota: number;
  
  @Column({ type: 'bigint', default: 0 })
  storageUsed: number;
  
  @Column({ default: true })
  isActive: boolean;
  
  @CreateDateColumn()
  createdAt: Date;
  
  @UpdateDateColumn()
  updatedAt: Date;
  
  @OneToMany(() => FileEntity, file => file.owner)
  files: FileEntity[];
  
  @OneToMany(() => Folder, folder => folder.owner)
  folders: Folder[];
}
```

**File Entity:**
```typescript
@Entity('files')
export class FileEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;
  
  @Column()
  filename: string;
  
  @Column()
  originalName: string;
  
  @Column({ type: 'bigint' })
  size: number;
  
  @Column()
  mimeType: string;
  
  @Column()
  minioKey: string;
  
  @Column({ nullable: true })
  description?: string;
  
  @ManyToOne(() => User, user => user.files)
  owner: User;
  
  @ManyToOne(() => Folder, folder => folder.files, { nullable: true })
  folder?: Folder;
  
  @OneToMany(() => FileVersion, version => version.file)
  versions: FileVersion[];
  
  @OneToMany(() => Share, share => share.file)
  shares: Share[];
  
  @CreateDateColumn()
  createdAt: Date;
  
  @UpdateDateColumn()
  updatedAt: Date;
  
  @DeleteDateColumn()
  deletedAt?: Date;
}
```

**Folder Entity:**
```typescript
@Entity('folders')
export class Folder {
  @PrimaryGeneratedColumn('uuid')
  id: string;
  
  @Column()
  name: string;
  
  @ManyToOne(() => User, user => user.folders)
  owner: User;
  
  @ManyToOne(() => Folder, folder => folder.children, { nullable: true })
  parent?: Folder;
  
  @OneToMany(() => Folder, folder => folder.parent)
  children: Folder[];
  
  @OneToMany(() => FileEntity, file => file.folder)
  files: FileEntity[];
  
  @CreateDateColumn()
  createdAt: Date;
  
  @UpdateDateColumn()
  updatedAt: Date;
  
  @DeleteDateColumn()
  deletedAt?: Date;
}
```

**Share Entity:**
```typescript
@Entity('shares')
export class Share {
  @PrimaryGeneratedColumn('uuid')
  id: string;
  
  @Column({ unique: true })
  token: string;
  
  @ManyToOne(() => FileEntity, file => file.shares)
  file: FileEntity;
  
  @ManyToOne(() => User)
  createdBy: User;
  
  @Column({ type: 'enum', enum: ['view', 'download', 'edit'] })
  permission: 'view' | 'download' | 'edit';
  
  @Column({ nullable: true })
  password?: string;
  
  @Column({ nullable: true })
  expiresAt?: Date;
  
  @Column({ default: 0 })
  accessCount: number;
  
  @Column({ nullable: true })
  maxAccess?: number;
  
  @CreateDateColumn()
  createdAt: Date;
  
  @UpdateDateColumn()
  updatedAt: Date;
}
```

**File Version Entity:**
```typescript
@Entity('file_versions')
export class FileVersion {
  @PrimaryGeneratedColumn('uuid')
  id: string;
  
  @ManyToOne(() => FileEntity, file => file.versions)
  file: FileEntity;
  
  @Column()
  versionNumber: number;
  
  @Column()
  minioKey: string;
  
  @Column({ type: 'bigint' })
  size: number;
  
  @Column({ nullable: true })
  changeDescription?: string;
  
  @CreateDateColumn()
  createdAt: Date;
}
```

**Recycle Entry Entity:**
```typescript
@Entity('recycle_entries')
export class RecycleEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;
  
  @Column()
  originalPath: string;
  
  @Column({ type: 'enum', enum: ['file', 'folder'] })
  itemType: 'file' | 'folder';
  
  @Column()
  itemId: string;
  
  @Column({ type: 'json' })
  metadata: any;
  
  @ManyToOne(() => User)
  owner: User;
  
  @CreateDateColumn()
  deletedAt: Date;
  
  @Column()
  expiresAt: Date;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

Based on the prework analysis, the following correctness properties have been identified:

**Property 1: User Registration Success**
*For any* valid email and password combination, user registration should create a new account with default storage quota and return authentication tokens
**Validates: Requirements 1.1**

**Property 2: Login Authentication**
*For any* valid user credentials, the login process should return JWT token pairs and establish authenticated session
**Validates: Requirements 1.3**

**Property 3: Token Refresh Mechanism**
*For any* expired but valid refresh token, the system should automatically refresh access tokens without user intervention
**Validates: Requirements 1.4**

**Property 4: File Upload Processing**
*For any* valid file upload request, the system should provide presigned URLs and create proper metadata records upon confirmation
**Validates: Requirements 2.2**

**Property 5: Storage Quota Enforcement**
*For any* file upload that would exceed user storage quota, the system should prevent the upload and return quota exceeded error
**Validates: Requirements 2.3**

**Property 6: File List Updates**
*For any* successful file upload, the file list should immediately reflect the new file with correct metadata
**Validates: Requirements 2.5**

**Property 7: Folder Hierarchy Management**
*For any* folder creation operation, the system should establish proper hierarchical relationships and maintain folder tree integrity
**Validates: Requirements 3.2**

**Property 8: File Movement Operations**
*For any* file move operation between folders, the system should update parent-child relationships correctly while preserving file metadata
**Validates: Requirements 3.3**

**Property 9: Bulk Operations Processing**
*For any* bulk operation on multiple files, all selected files should be processed consistently with proper error handling for individual failures
**Validates: Requirements 3.5**

**Property 10: Share Link Generation**
*For any* share creation request, the system should generate cryptographically unique tokens and enforce specified permissions
**Validates: Requirements 4.1**

**Property 11: Share Access Control**
*For any* valid share link access, external users should be able to access files according to share permissions without authentication
**Validates: Requirements 4.2**

**Property 12: Permission Enforcement**
*For any* share with specific permissions, the system should enforce download, upload, and modification restrictions correctly
**Validates: Requirements 4.3**

**Property 13: Share Expiration Handling**
*For any* expired or revoked share link, the system should deny access and return appropriate error messages
**Validates: Requirements 4.4**

**Property 14: Recycle Bin Operations**
*For any* file or folder deletion, items should be moved to recycle bin with 30-day retention and original path preservation
**Validates: Requirements 5.1**

**Property 15: Recycle Bin Display**
*For any* recycle bin view, items should display with original paths, deletion timestamps, and restoration options
**Validates: Requirements 5.2**

**Property 16: Item Restoration**
*For any* recycle bin restoration, items should return to original locations with all metadata intact
**Validates: Requirements 5.3**

**Property 17: Automatic Cleanup**
*For any* recycle bin items older than 30 days, the system should automatically delete them via background jobs
**Validates: Requirements 5.4**

**Property 18: Bulk Recycle Operations**
*For any* bulk recycle bin operation, all selected items should be processed consistently (restore or permanent delete)
**Validates: Requirements 5.5**

**Property 19: File Versioning**
*For any* file upload with existing filename, the system should create new version records while preserving previous versions
**Validates: Requirements 6.1**

**Property 20: Version History Display**
*For any* file with multiple versions, the version history should display chronologically with timestamps and size information
**Validates: Requirements 6.2**

**Property 21: Version Restoration**
*For any* version restoration operation, the selected version should become the current active version
**Validates: Requirements 6.3**

**Property 22: Version Limit Management**
*For any* file exceeding 10 versions, the system should automatically remove the oldest version to maintain the limit
**Validates: Requirements 6.4**

**Property 23: Version Download Access**
*For any* specific version download request, the system should provide secure access to that exact version's content
**Validates: Requirements 6.5**

**Property 24: Search Functionality**
*For any* search query, the system should return files matching filename or metadata with relevant ranking
**Validates: Requirements 7.1**

**Property 25: Search Filtering**
*For any* applied search filter, results should only include items matching the filter criteria (type, date, size)
**Validates: Requirements 7.2**

**Property 26: Search Sorting**
*For any* search result sorting, items should be ordered correctly by the specified criteria (name, size, date, type)
**Validates: Requirements 7.3**

**Property 27: Advanced Search Features**
*For any* advanced search with multiple criteria, the system should return results matching all specified conditions
**Validates: Requirements 7.5**

**Property 28: Accessibility Compliance**
*For any* interactive element, the system should provide proper ARIA labels and semantic markup for screen readers
**Validates: Requirements 8.2**

**Property 29: Keyboard Navigation**
*For any* user interface element, full functionality should be accessible via keyboard navigation with visible focus indicators
**Validates: Requirements 8.3**

**Property 30: Theme Consistency**
*For any* theme switch operation, all components should update consistently to reflect the selected theme
**Validates: Requirements 8.5**

**Property 31: Performance Metrics**
*For any* page load, Core Web Vitals scores should meet Google's "Good" thresholds (LCP < 2.5s, FID < 100ms, CLS < 0.1)
**Validates: Requirements 9.1**

**Property 32: Virtualization Performance**
*For any* large file list display, virtualization should maintain smooth scrolling performance regardless of list size
**Validates: Requirements 9.3**

**Property 33: Animation Performance**
*For any* UI animation, the system should maintain 60fps performance with hardware acceleration
**Validates: Requirements 9.4**

**Property 34: API Optimization**
*For any* repeated API call, the system should implement caching and request deduplication to reduce redundant requests
**Validates: Requirements 9.5**

**Property 35: Error Boundary Protection**
*For any* JavaScript error in component trees, error boundaries should catch errors and display user-friendly recovery options
**Validates: Requirements 10.1**

**Property 36: API Error Handling**
*For any* failed API request, the system should provide specific error messages with retry mechanisms
**Validates: Requirements 10.2**

**Property 37: Timeout Handling**
*For any* network request timeout, the system should handle the scenario with automatic retry and user notification
**Validates: Requirements 10.4**

**Property 38: Form Validation**
*For any* invalid form submission, the system should display clear field-specific validation messages with accessibility support
**Validates: Requirements 10.5**

**Property 39: Authorization Enforcement**
*For any* file operation, the system should verify user ownership and enforce proper authorization before allowing access
**Validates: Requirements 12.1**

**Property 40: Data Sanitization**
*For any* user input containing potentially malicious content, the system should sanitize the input to prevent XSS attacks
**Validates: Requirements 12.2**

**Property 41: Password Security**
*For any* password storage operation, the system should hash passwords using bcrypt with appropriate salt rounds
**Validates: Requirements 12.3**

**Property 42: Rate Limiting**
*For any* API endpoint, the system should enforce rate limiting to prevent abuse and ensure fair usage
**Validates: Requirements 12.4**

**Property 43: Upload Validation**
*For any* file upload attempt, the system should validate file types and sizes before processing the upload
**Validates: Requirements 12.5**

**Property 44: Storage Usage Display**
*For any* dashboard view, the system should display accurate storage usage with visual progress indicators and quota information
**Validates: Requirements 13.1**

**Property 45: Quota Warnings**
*For any* user approaching storage limits, the system should provide proactive warning notifications
**Validates: Requirements 13.2**

**Property 46: Quota Enforcement**
*For any* user exceeding storage quota, the system should prevent new uploads and provide quota management tools
**Validates: Requirements 13.3**

**Property 47: Storage Calculation Updates**
*For any* file deletion, the system should immediately update storage usage calculations with visual feedback
**Validates: Requirements 13.4**

**Property 48: Quota Management**
*For any* administrator quota modification, the system should apply changes immediately and notify affected users
**Validates: Requirements 13.5**

**Property 49: Background Job Queuing**
*For any* operation requiring background processing, the system should queue jobs using BullMQ with proper error handling
**Validates: Requirements 14.1**

**Property 50: Job Completion Tracking**
*For any* completed background job, the system should update database records and provide job status monitoring
**Validates: Requirements 14.2**

**Property 51: Job Failure Handling**
*For any* failed background job, the system should implement retry policies and alert administrators
**Validates: Requirements 14.3**

**Property 52: System Cleanup**
*For any* expired system items, background jobs should process cleanup operations and maintain system health
**Validates: Requirements 14.4**

**Property 53: Monitoring Endpoints**
*For any* administrator monitoring request, the system should provide accurate job queue status and system health information
**Validates: Requirements 14.5**

**Property 54: Empty State Handling**
*For any* empty state condition, the system should display helpful messages with clear next actions for users
**Validates: Requirements 15.4**

## Error Handling

### Frontend Error Handling Strategy

**Error Boundaries:**
```typescript
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

class AppErrorBoundary extends Component<Props, ErrorBoundaryState> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to monitoring service
    console.error('Error caught by boundary:', error, errorInfo);
    // Send to error tracking service
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} onRetry={this.handleRetry} />;
    }
    return this.props.children;
  }
}
```

**API Error Handling:**
```typescript
export class AppError extends Error {
  constructor(
    public type: 'network' | 'authentication' | 'validation' | 'server' | 'client',
    public code: string,
    message: string,
    public retryable: boolean = false,
    public userFriendly: boolean = true,
    public metadata?: any
  ) {
    super(message);
    this.name = 'AppError';
  }

  static fromAxiosError(error: AxiosError): AppError {
    if (error.response) {
      // Server responded with error status
      const status = error.response.status;
      const data = error.response.data as any;
      
      if (status === 401) {
        return new AppError('authentication', 'UNAUTHORIZED', 'Please log in again', false, true);
      } else if (status === 403) {
        return new AppError('authentication', 'FORBIDDEN', 'You don\'t have permission to perform this action', false, true);
      } else if (status === 422) {
        return new AppError('validation', 'VALIDATION_ERROR', data.message || 'Invalid input', false, true, data.errors);
      } else if (status >= 500) {
        return new AppError('server', 'SERVER_ERROR', 'Something went wrong on our end', true, true);
      }
    } else if (error.request) {
      // Network error
      return new AppError('network', 'NETWORK_ERROR', 'Please check your internet connection', true, true);
    }
    
    return new AppError('client', 'UNKNOWN_ERROR', error.message, false, false);
  }
}
```

### Backend Error Handling

**Global Exception Filter:**
```typescript
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let code = 'INTERNAL_ERROR';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      
      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        message = (exceptionResponse as any).message || exception.message;
        code = (exceptionResponse as any).code || 'HTTP_ERROR';
      } else {
        message = exceptionResponse as string;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      this.logger.error(`Unhandled exception: ${exception.message}`, exception.stack);
    }

    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message,
      code,
    };

    response.status(status).json(errorResponse);
  }
}
```

## Testing Strategy

### Dual Testing Approach

The system implements both unit testing and property-based testing to ensure comprehensive coverage:

**Unit Testing:**
- Specific examples and edge cases
- Integration points between components
- Error conditions and boundary cases
- User interaction flows

**Property-Based Testing:**
- Universal properties across all inputs
- Data integrity and consistency
- Security and authorization rules
- Performance characteristics

### Property-Based Testing Configuration

**Frontend Testing (Fast-check):**
```typescript
// Property test configuration
const testConfig = {
  numRuns: 100, // Minimum 100 iterations per property
  timeout: 5000,
  seed: Date.now(),
};

// Example property test
describe('File Upload Properties', () => {
  it('Property 5: Storage Quota Enforcement', () => {
    fc.assert(
      fc.property(
        fc.record({
          userQuota: fc.integer({ min: 1000, max: 10000000 }),
          currentUsage: fc.integer({ min: 0, max: 5000000 }),
          fileSize: fc.integer({ min: 1, max: 15000000 }),
        }),
        async ({ userQuota, currentUsage, fileSize }) => {
          const user = createMockUser({ storageQuota: userQuota, storageUsed: currentUsage });
          const file = createMockFile({ size: fileSize });
          
          const result = await uploadService.validateUpload(user, file);
          
          if (currentUsage + fileSize > userQuota) {
            expect(result.success).toBe(false);
            expect(result.error).toContain('quota exceeded');
          } else {
            expect(result.success).toBe(true);
          }
        }
      ),
      testConfig
    );
  });
});
```

**Backend Testing (Fast-check for TypeScript):**
```typescript
// Property test for authorization
describe('Authorization Properties', () => {
  it('Property 39: Authorization Enforcement', () => {
    fc.assert(
      fc.property(
        fc.record({
          ownerId: fc.uuid(),
          requesterId: fc.uuid(),
          fileId: fc.uuid(),
          operation: fc.constantFrom('read', 'write', 'delete'),
        }),
        async ({ ownerId, requesterId, fileId, operation }) => {
          const file = await createTestFile({ ownerId, id: fileId });
          const requester = await createTestUser({ id: requesterId });
          
          const hasAccess = await authService.canAccessFile(requester, file, operation);
          
          if (ownerId === requesterId) {
            expect(hasAccess).toBe(true);
          } else {
            // Should check for explicit sharing permissions
            const shareExists = await shareService.hasValidShare(requester, file, operation);
            expect(hasAccess).toBe(shareExists);
          }
        }
      ),
      testConfig
    );
  });
});
```

### Testing Requirements

- Each correctness property must be implemented by a single property-based test
- Property tests must run a minimum of 100 iterations
- Each property test must be tagged with the format: `**Feature: connectdrive-complete-redesign, Property {number}: {property_text}**`
- Unit tests complement property tests by covering specific examples and integration scenarios
- All tests must use the specified testing frameworks (Jest + React Testing Library for frontend, Jest + Supertest for backend)
- Property tests must validate the universal properties identified in the correctness properties section