import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as fc from 'fast-check';
import * as bcrypt from 'bcrypt';
import { AuthService } from '../auth.service';
import { User } from '../entities/user.entity';
import { RefreshToken } from '../entities/refresh-token.entity';

/**
 * **Feature: connectdrive-complete-redesign, Property 2: Login Authentication**
 * 
 * For any valid user credentials, the login process should return JWT token pairs 
 * and establish authenticated session
 */
describe('Auth Login Properties', () => {
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

  it('Property 2: Login Authentication', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          email: fc.emailAddress(),
          password: fc.string({ minLength: 8, maxLength: 100 })
            .map(s => s.replace(/\s/g, 'X') + 'A1'), // Remove spaces and ensure valid password
          displayName: fc.string({ minLength: 1, maxLength: 100 }),
          userAgent: fc.option(fc.string(), { nil: undefined }),
          ipAddress: fc.option(fc.ipV4(), { nil: undefined }),
        }),
        async ({ email, password, displayName, userAgent, ipAddress }) => {
          // Setup: Create user with hashed password
          const hashedPassword = await bcrypt.hash(password, 12);
          const mockUser = {
            id: 'user-id',
            email,
            displayName,
            passwordHash: hashedPassword,
            storageQuota: 5368709120,
            storageUsed: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          
          mockUserRepository.findOne.mockResolvedValue(mockUser);
          
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
          const result = await service.login(email, password, userAgent, ipAddress);

          // Verify
          expect(result).toBeDefined();
          expect(result.id).toBe(mockUser.id);
          expect(result.email).toBe(email);
          expect(result.displayName).toBe(displayName);
          expect(result.accessToken).toBe('mock-jwt-token');
          expect(result.refreshToken).toBeDefined();
          expect(result.expiresIn).toBe(15 * 60); // 15 minutes

          // Verify user lookup
          expect(mockUserRepository.findOne).toHaveBeenCalledWith({ where: { email } });
          
          // Verify refresh token creation
          expect(mockRefreshTokenRepository.create).toHaveBeenCalledWith({
            token: expect.any(String),
            userId: mockUser.id,
            user: mockUser,
            expiresAt: expect.any(Date),
            userAgent,
            ipAddress,
            replacedByToken: undefined,
          });
          
          expect(mockRefreshTokenRepository.save).toHaveBeenCalled();
        }
      ),
      { numRuns: 50 }
    );
  }, 30000);

  it('Property 2 Edge Case: Invalid Credentials', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          email: fc.emailAddress(),
          correctPassword: fc.string({ minLength: 8, maxLength: 100 })
            .map(s => s.replace(/\s/g, 'X') + 'A1'),
          wrongPassword: fc.string({ minLength: 8, maxLength: 100 })
            .map(s => s.replace(/\s/g, 'Y') + 'B2'),
        }).filter(({ correctPassword, wrongPassword }) => correctPassword !== wrongPassword),
        async ({ email, correctPassword, wrongPassword }) => {
          // Setup: User with correct password hash
          const hashedPassword = await bcrypt.hash(correctPassword, 12);
          const mockUser = {
            id: 'user-id',
            email,
            passwordHash: hashedPassword,
          };
          
          mockUserRepository.findOne.mockResolvedValue(mockUser);

          // Execute & Verify: Wrong password should fail
          await expect(service.login(email, wrongPassword)).rejects.toThrow(
            'Invalid email or password'
          );
          
          // Verify no refresh token creation
          expect(mockRefreshTokenRepository.create).not.toHaveBeenCalled();
          expect(mockRefreshTokenRepository.save).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 50 }
    );
  }, 20000);

  it('Property 2 Edge Case: Non-existent User', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          email: fc.emailAddress(),
          password: fc.string({ minLength: 8, maxLength: 100 })
            .map(s => s.replace(/\s/g, 'X') + 'A1'),
        }),
        async ({ email, password }) => {
          // Setup: No user found
          mockUserRepository.findOne.mockResolvedValue(null);

          // Execute & Verify
          await expect(service.login(email, password)).rejects.toThrow(
            'Invalid email or password'
          );
          
          // Verify no refresh token creation
          expect(mockRefreshTokenRepository.create).not.toHaveBeenCalled();
          expect(mockRefreshTokenRepository.save).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 50 }
    );
  }, 15000);
});