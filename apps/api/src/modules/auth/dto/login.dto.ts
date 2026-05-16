import { IsEmail, IsString, MinLength, MaxLength, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'admin@orkestria.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Admin@2025!' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiPropertyOptional({ description: 'Código MFA (se habilitado)' })
  @IsOptional()
  @IsString()
  mfaCode?: string;
}

export class ForgotPasswordDto {
  @ApiProperty({ example: 'user@orkestria.com' })
  @IsEmail()
  email: string;
}

export class ResetPasswordDto {
  @ApiProperty()
  @IsString()
  token: string;

  @ApiProperty({ example: 'NovaSenha@2025!' })
  @IsString()
  @MinLength(8)
  password: string;
}

export class RefreshTokenDto {
  @ApiProperty()
  @IsString()
  refreshToken: string;
}
