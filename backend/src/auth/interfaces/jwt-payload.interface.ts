import { Request } from 'express';
import { Role } from '../enums/role.enum';

export interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
  merchant_id?: string;
  jti: string;
  exp?: number;
}

export interface RefreshJwtPayload {
  sub: string;
  jti: string;
}

export interface AuthenticatedUser {
  userId: string;
  email: string;
  role: Role;
  merchantId?: string;
  jti: string;
  exp: number;
}

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
  apiKey?: {
    id: string;
    merchantId: string;
    permissions: string[];
  };
}
