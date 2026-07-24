import { IsNotEmpty, IsString, Length } from 'class-validator';

export class Verify2faDto {
  @IsString()
  @IsNotEmpty()
  @Length(6, 6, { message: 'TOTP code must be 6 digits' })
  totp_code: string;
}
