import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { Role } from '../enums/role.enum';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  password: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  full_name?: string;

  @IsOptional()
  @IsEnum(Role, { message: 'role must be one of: merchant, customer' })
  role?: Role;
}
