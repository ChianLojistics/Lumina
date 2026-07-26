import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { JwtPayload, AuthenticatedUser } from '../interfaces/jwt-payload.interface';
import { TokenService } from '../services/token.service';
import { AuthenticationException } from '../../common/exceptions';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly tokenService: TokenService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET,
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    if (await this.tokenService.isAccessTokenBlacklisted(payload.jti)) {
      throw AuthenticationException.tokenRevoked();
    }

    const user = await this.userRepository.findOne({ where: { id: payload.sub } });

    if (!user || !user.is_active) {
      throw AuthenticationException.invalidCredentials();
    }

    return {
      userId: user.id,
      email: user.email,
      role: user.role,
      merchantId: user.merchant_id ?? undefined,
      jti: payload.jti,
      exp: payload.exp,
    };
  }
}
