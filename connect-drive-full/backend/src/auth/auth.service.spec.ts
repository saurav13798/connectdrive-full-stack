import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as fc from 'fast-check';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { User } from './entities/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';

describe('AuthService Properties', () => {
  let service: AuthService;

  const mockUserRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockRefreshTokenRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
    verify: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: getRepositoryToken(RefreshToken),
          useValue: mockRefreshTokenRepository,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);

    // Setup default mock returns
    mockConfigService.get.mockReturnValue(12); // BCRYPT_SALT_ROUNDS
    mockJwtService.sign.mockReturnValue('mock-token');
    
    // Setup refresh token mocks
    const mockRefreshToken = {
      id: 'refresh-token-id',
      token: 'refresh-token-value',
    };
    mockRefreshTokenRepository.create.mockReturnValue(mockRefreshToken);
    mockRefreshTokenRepository.save.mockResolvedValue(mockRefreshToken);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // **Feature: connectdrive-completion, Property 1: User registration creates valid accounts**
  describe('User Registration Properties', () => {
    it('should create valid accounts for any valid email and password', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.emailAddress(),
          fc.string({ minLength: 8 }).map(s => s + 'A1'), // Ensure strong password
          fc.option(fc.string({ maxLength: 100 })),
          async (email, password, displayName) => {
            // Mock user doesn't exist
            mockUserRepository.findOne.mockResolvedValue(null);
            
            // Mock user creation
            const mockUser = {
              id: 'test-id',
              email,
              passwordHash: 'hashed-password',
              displayName: displayName || email.split('@')[0],
              storageQuota: 5368709120,
              storageUsed: 0,
              createdAt: new Date(),
              updatedAt: new Date(),
            };
            
            mockUserRepository.create.mockReturnValue(mockUser);
            mockUserRepository.save.mockResolvedValue(mockUser);

            const result = await service.register(email, password, displayName || undefined);

            // Verify the result has the expected structure
            expect(result).toHaveProperty('id');
            expect(result).toHaveProperty('email', email);
            expect(result).toHaveProperty('displayName');
            expect(result).toHaveProperty('accessToken');
            expect(result).toHaveProperty('refreshToken');
            expect(result).toHaveProperty('expiresIn', 15 * 60);

            // Verify user was created with default quota
            expect(mockUserRepository.create).toHaveBeenCalledWith(
              expect.objectContaining({
                email,
                storageQuota: 5368709120,
                storageUsed: 0,
              })
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    // **Feature: connectdrive-completion, Property 2: Duplicate email rejection**
    it('should reject registration attempts with existing emails', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.emailAddress(),
          fc.string({ minLength: 8 }).map(s => s + 'A1'),
          async (email, password) => {
            // Mock existing user
            mockUserRepository.findOne.mockResolvedValue({
              id: 'existing-id',
              email,
            });

            await expect(service.register(email, password)).rejects.toThrow(BadRequestException);
            expect(mockUserRepository.create).not.toHaveBeenCalled();
            expect(mockUserRepository.save).not.toHaveBeenCalled();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // **Feature: connectdrive-completion, Property 3: Valid login returns tokens**
  describe('Login Properties', () => {
    it('should return tokens for valid credentials', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.emailAddress(),
          fc.string({ minLength: 8 }),
          async (email, password) => {
            const hashedPassword = await bcrypt.hash(password, 12);
            const mockUser = {
              id: 'test-id',
              email,
              passwordHash: hashedPassword,
              displayName: 'Test User',
              storageQuota: 5368709120,
              storageUsed: 0,
            };

            mockUserRepository.findOne.mockResolvedValue(mockUser);

            const result = await service.login(email, password);

            expect(result).toHaveProperty('accessToken');
            expect(result).toHaveProperty('refreshToken');
            expect(result).toHaveProperty('id', mockUser.id);
            expect(result).toHaveProperty('email', email);
          }
        ),
        { numRuns: 50 } // Reduced runs due to bcrypt performance
      );
    });

    it('should reject invalid credentials', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.emailAddress(),
          fc.string({ minLength: 8 }),
          fc.string({ minLength: 8 }).filter(s => s !== 'correctPassword'),
          async (email, correctPassword, wrongPassword) => {
            const hashedPassword = await bcrypt.hash(correctPassword, 12);
            const mockUser = {
              id: 'test-id',
              email,
              passwordHash: hashedPassword,
            };

            mockUserRepository.findOne.mockResolvedValue(mockUser);

            await expect(service.login(email, wrongPassword)).rejects.toThrow(UnauthorizedException);
          }
        ),
        { numRuns: 30 } // Reduced runs due to bcrypt performance
      );
    });
  });

  // **Feature: connectdrive-completion, Property 4: Token refresh functionality**
  describe('Token Refresh Properties', () => {
    it('should generate new tokens for valid refresh tokens', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.emailAddress(),
          async (userId, email) => {
            const mockUser = {
              id: userId,
              email,
              displayName: 'Test User',
            };

            // Mock valid refresh token
            mockJwtService.verify.mockReturnValue({ sub: userId, email });
            mockUserRepository.findOne.mockResolvedValue(mockUser);

            const result = await service.refreshToken('valid-refresh-token');

            expect(result).toHaveProperty('accessToken');
            expect(result).toHaveProperty('refreshToken');
            expect(result).toHaveProperty('id', userId);
            expect(result).toHaveProperty('email', email);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject invalid refresh tokens', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string(),
          async (invalidToken) => {
            mockJwtService.verify.mockImplementation(() => {
              throw new Error('Invalid token');
            });

            await expect(service.refreshToken(invalidToken)).rejects.toThrow(UnauthorizedException);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // **Feature: connectdrive-completion, Property 5: Logout invalidates tokens**
  describe('Logout Properties', () => {
    it('should blacklist tokens on logout', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.string({ minLength: 10 }),
          async (userId, token) => {
            await service.logout(userId, token);

            // Verify token is blacklisted
            expect(service.isTokenBlacklisted(token)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // **Feature: connectdrive-completion, Property 45: Password hashing security**
  describe('Password Security Properties', () => {
    it('should hash passwords with appropriate salt rounds', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.emailAddress(),
          fc.string({ minLength: 8 }).map(s => s + 'A1'),
          async (email, password) => {
            mockUserRepository.findOne.mockResolvedValue(null);
            
            const mockUser = {
              id: 'test-id',
              email,
              passwordHash: 'will-be-set',
              displayName: email.split('@')[0],
              storageQuota: 5368709120,
              storageUsed: 0,
            };

            mockUserRepository.create.mockImplementation((userData) => {
              // Verify password is hashed
              expect(userData.passwordHash).not.toBe(password);
              expect(userData.passwordHash).toMatch(/^\$2[aby]\$\d{2}\$/); // bcrypt format
              return mockUser;
            });
            
            mockUserRepository.save.mockResolvedValue(mockUser);

            await service.register(email, password);

            expect(mockUserRepository.create).toHaveBeenCalled();
          }
        ),
        { numRuns: 50 } // Reduced runs due to bcrypt performance
      );
    });
  });
});