import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as fc from 'fast-check';
import { AuthService } from '../auth.service';
import { User } from '../entities/user.entity';
import { RefreshToken } from '../entities/refresh-token.entity';

/**
 * **Feature: connectdrive-complete-redesign, Property 1: User Registration Success**
 * 
 * For any valid email and password combination, user registration should create 
 * a new account with default storage quota and return authentication tokens
 */
describe('Auth Registration Properties', () => {
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
    get: jest.fn().mockImplementation((key: string, defaultValue?: any) => {
      if (key === 'BCRYPT_SALT_ROUNDS') return 12;
      return defaultValue;
    }),
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

    // Setup default mocks
    mockJwtService.sign.mockReturnValue('mock-jwt-token');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('Property 1: User Registration Success', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          email: fc.emailAddress(),
          password: fc.string({ minLength: 8, maxLength: 100 })
            .map(s => s.replace(/\s/g, 'X') + 'A1') // Remove spaces and ensure strong password
            .filter(pwd => pwd.length >= 8 && /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(pwd)),
          displayName: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined }),
          userAgent: fc.option(fc.string(), { nil: undefined }),
          ipAddress: fc.option(fc.ipV4(), { nil: undefined }),
        }),
        async ({ email, password, displayName, userAgent, ipAddress }) => {
          // Setup: No existing user
          mockUserRepository.findOne.mockResolvedValue(null);
          
          const mockUser = {
            id: 'user-id',
            email,
            displayName: displayName || email.split('@')[0],
            passwordHash: 'hashed-password',
            storageQuota: 5368709120,
            storageUsed: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          
          mockUserRepository.create.mockReturnValue(mockUser);
          mockUserRepository.save.mockResolvedValue(mockUser);
          
          const mockRefreshToken = {
            id: 'refresh-token-id',
            token: 'refresh-token-value',
            userId: mockUser.id,
            user: mockUser,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            userAgent,
            ipAddress,
          };
          
          mockRefreshTokenRepository.create.mockReturnValue(mockRefreshToken);
          mockRefreshTokenRepository.save.mockResolvedValue(mockRefreshToken);

          // Execute
          const result = await service.register(email, password, displayName, userAgent, ipAddress);

          // Verify
          expect(result).toBeDefined();
          expect(result.id).toBe(mockUser.id);
          expect(result.email).toBe(email);
          expect(result.displayName).toBe(displayName || email.split('@')[0]);
          expect(result.accessToken).toBe('mock-jwt-token');
          expect(result.refreshToken).toBeDefined();
          expect(result.expiresIn).toBe(15 * 60); // 15 minutes

          // Verify user creation
          expect(mockUserRepository.create).toHaveBeenCalledWith({
            email,
            passwordHash: expect.any(String),
            displayName: displayName || email.split('@')[0],
            storageQuota: 5368709120,
            storageUsed: 0,
          });
          
          expect(mockUserRepository.save).toHaveBeenCalledWith(mockUser);
          
          // Verify refresh token creation
          expect(mockRefreshTokenRepository.create).toHaveBeenCalledWith(
            expect.objectContaining({
              token: expect.any(String),
              userId: mockUser.id,
              user: mockUser,
              expiresAt: expect.any(Date),
            })
          );
          
          expect(mockRefreshTokenRepository.save).toHaveBeenCalled();
        }
      ),
      { numRuns: 50 }
    );
  }, 30000);

  it('Property 1 Edge Case: Duplicate Email Registration', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          email: fc.emailAddress(),
          password: fc.string({ minLength: 8, maxLength: 100 })
            .map(s => s.replace(/\s/g, 'X') + 'A1') // Remove spaces and ensure strong password
            .filter(pwd => pwd.length >= 8 && /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(pwd)),
        }),
        async ({ email, password }) => {
          // Setup: Existing user
          const existingUser = {
            id: 'existing-user-id',
            email,
            displayName: 'Existing User',
          };
          
          mockUserRepository.findOne.mockResolvedValue(existingUser);

          // Execute & Verify
          await expect(service.register(email, password)).rejects.toThrow(
            'User with this email already exists'
          );
          
          // Verify no user creation attempted
          expect(mockUserRepository.create).not.toHaveBeenCalled();
          expect(mockUserRepository.save).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 50 }
    );
  });
});