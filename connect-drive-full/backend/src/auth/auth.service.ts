import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { AuthResponseDto, UserDto } from '../common/dtos';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  private readonly saltRounds: number;
  private readonly blacklistedTokens = new Set<string>(); // In production, use Redis

  constructor(
    @InjectRepository(User) private users: Repository<User>,
    @InjectRepository(RefreshToken) private refreshTokens: Repository<RefreshToken>,
    private jwt: JwtService,
    private config: ConfigService,
  ) {
    this.saltRounds = this.config.get<number>('BCRYPT_SALT_ROUNDS', 12);
  }

  async register(email: string, password: string, displayName?: string, userAgent?: string, ipAddress?: string): Promise<AuthResponseDto> {
    // Check if user already exists
    const existing = await this.users.findOne({ where: { email } });
    if (existing) {
      throw new BadRequestException('User with this email already exists');
    }

    // Hash password with configurable salt rounds
    const hash = await bcrypt.hash(password, this.saltRounds);
    
    // Create user
    const finalDisplayName = displayName || email.split('@')[0];
    const user = this.users.create({
      email,
      passwordHash: hash,
      displayName: finalDisplayName,
      storageQuota: 5368709120, // 5GB
      storageUsed: 0,
    } as any);
    
    const savedUser = await this.users.save(user);
    const finalUser = Array.isArray(savedUser) ? savedUser[0] : savedUser;
    
    if (!finalUser) {
      throw new BadRequestException('Failed to create user');
    }
    
    // Generate tokens
    return await this.createAuthResponse(finalUser, userAgent, ipAddress);
  }

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.users.findOne({ where: { email } });
    if (!user) return null;
    
    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) return null;
    
    return user;
  }

  async login(email: string, password: string, userAgent?: string, ipAddress?: string): Promise<AuthResponseDto> {
    const user = await this.validateUser(email, password);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }
    return await this.createAuthResponse(user, userAgent, ipAddress);
  }

  async refreshToken(refreshToken: string, userAgent?: string, ipAddress?: string): Promise<AuthResponseDto> {
    // Find the refresh token in database
    const storedToken = await this.refreshTokens.findOne({
      where: { token: refreshToken },
      relations: ['user'],
    });

    if (!storedToken || storedToken.isRevoked || storedToken.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Revoke the old refresh token
    storedToken.isRevoked = true;
    storedToken.revokedAt = new Date();
    await this.refreshTokens.save(storedToken);

    // Create new auth response with new refresh token
    return await this.createAuthResponse(storedToken.user, userAgent, ipAddress, storedToken.token);
  }

  async getCurrentUser(userId: string): Promise<UserDto> {
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return this.mapUserToDto(user);
  }

  async logout(userId: string, accessToken?: string): Promise<void> {
    // Blacklist the current access token
    if (accessToken) {
      this.blacklistedTokens.add(accessToken);
    }
    
    // Revoke all refresh tokens for this user
    await this.refreshTokens.update(
      { userId, isRevoked: false },
      { isRevoked: true, revokedAt: new Date() }
    );
    
    // In production, you would:
    // 1. Store blacklisted tokens in Redis with TTL
    // 2. Log the logout event for security auditing
    return;
  }

  isTokenBlacklisted(token: string): boolean {
    return this.blacklistedTokens.has(token);
  }

  async cleanupExpiredTokens(): Promise<void> {
    // Remove expired refresh tokens
    await this.refreshTokens.delete({
      expiresAt: { $lt: new Date() } as any,
    });
  }

  async revokeAllUserTokens(userId: string): Promise<void> {
    // Revoke all refresh tokens for a specific user
    await this.refreshTokens.update(
      { userId, isRevoked: false },
      { isRevoked: true, revokedAt: new Date() }
    );
  }

  private async createAuthResponse(
    user: User, 
    userAgent?: string, 
    ipAddress?: string, 
    replacedToken?: string
  ): Promise<AuthResponseDto> {
    const accessToken = this.jwt.sign(
      { sub: user.id, email: user.email },
      { expiresIn: '15m' },
    );

    // Generate cryptographically secure refresh token
    const refreshTokenValue = crypto.randomBytes(64).toString('hex');
    
    // Store refresh token in database
    const refreshTokenData: any = {
      token: refreshTokenValue,
      userId: user.id,
      user: user,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    };
    
    if (userAgent) refreshTokenData.userAgent = userAgent;
    if (ipAddress) refreshTokenData.ipAddress = ipAddress;
    if (replacedToken) refreshTokenData.replacedByToken = replacedToken;
    
    const refreshTokenEntity = this.refreshTokens.create(refreshTokenData as any);

    await this.refreshTokens.save(refreshTokenEntity);

    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      accessToken,
      refreshToken: refreshTokenValue,
      expiresIn: 15 * 60, // 15 minutes in seconds
    };
  }

  private mapUserToDto(user: User): UserDto {
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      storageQuota: user.storageQuota,
      storageUsed: user.storageUsed,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
