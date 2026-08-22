import { IsString, IsEnum, IsOptional } from 'class-validator';
import { TenantUserRole } from '../entities/tenant-user.entity';

export class AddTenantUserDto {
  @IsString()
  user_id: string;

  @IsEnum(TenantUserRole)
  role: TenantUserRole;

  @IsOptional()
  @IsString()
  invited_by?: string;
}
