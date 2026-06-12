import {
  Controller,
  Post,
  Body,
  Req,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle, SkipThrottle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { Request, Response } from 'express';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Post('register')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Registrar novo usuário (apenas Admin)' })
  async register(@Body() dto: RegisterDto, @CurrentTenant() tenantId: string) {
    return this.auth.register(dto, tenantId);
  }

  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login com email e senha' })
  async login(@Body() dto: LoginDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const result = await this.auth.login(dto, req.ip, req.headers['user-agent']);
    
    if ((result as any).refreshToken) {
      res.cookie('refreshToken', (result as any).refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' as const : 'lax' as const,
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        path: '/api/auth',
      });
      const { refreshToken: _, ...safeResult } = result as any;
      return safeResult;
    }
    return result;
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Renovar access token com refresh token' })
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response, @Body('refreshToken') bodyToken?: string) {
    const refreshToken = req.cookies?.refreshToken || bodyToken;
    if (!refreshToken) throw new UnauthorizedException('Refresh token não fornecido');
    
    const result = await this.auth.refreshTokens(refreshToken);
    
    if ((result as any).refreshToken) {
      res.cookie('refreshToken', (result as any).refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' as const : 'lax' as const,
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: '/api/auth',
      });
    }
    return result;
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout e revogação de tokens' })
  async logout(
    @CurrentUser('sub') userId: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body('refreshToken') bodyToken?: string,
  ) {
    const refreshToken = req.cookies?.refreshToken || bodyToken;
    res.clearCookie('refreshToken', { path: '/api/auth' });
    return this.auth.logout(userId, refreshToken);
  }

  @Post('forgot-password')
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Solicitar recuperação de senha' })
  async forgotPassword(@Body('email') email: string) {
    return this.auth.forgotPassword(email);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resetar senha com token' })
  async resetPassword(
    @Body('token') token: string,
    @Body('password') password: string,
  ) {
    return this.auth.resetPassword(token, password);
  }

  @Post('mfa/enable')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Iniciar configuração de MFA' })
  async enableMfa(@CurrentUser('sub') userId: string) {
    return this.auth.enableMfa(userId);
  }

  @Post('mfa/verify')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verificar e ativar MFA' })
  async verifyMfa(
    @CurrentUser('sub') userId: string,
    @Body('code') code: string,
  ) {
    return this.auth.verifyAndActivateMfa(userId, code);
  }
}
