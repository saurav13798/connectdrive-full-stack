import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { AuthService } from './auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private authService: AuthService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        // Also extract from cookie
        (req: any) => {
          if (req.cookies && req.cookies.accessToken) {
            return req.cookies.accessToken;
          }
          return null;
        },
      ]),
      secretOrKey: process.env.JWT_SECRET || 'verysecret_dev_key',
      passReqToCallback: true, // Pass request to validate method
    });
  }

  async validate(req: any, payload: any) {
    // Extract token from request
    const token = ExtractJwt.fromAuthHeaderAsBearerToken()(req) || 
                  (req.cookies && req.cookies.accessToken);
    
    // Check if token is blacklisted
    if (token && this.authService.isTokenBlacklisted(token)) {
      throw new UnauthorizedException('Token has been revoked');
    }

    return { id: payload.sub, email: payload.email };
  }
}
