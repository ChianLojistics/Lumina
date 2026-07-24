import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { RefreshJwtPayload } from '../interfaces/jwt-payload.interface';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromBodyField('refresh_token'),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
    });
  }

  async validate(payload: RefreshJwtPayload): Promise<RefreshJwtPayload> {
    return { sub: payload.sub, jti: payload.jti };
  }
}
