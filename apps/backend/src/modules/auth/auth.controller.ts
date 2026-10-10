import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';

import { LoginDTO } from '@vm/shared-types';

import { ZodValidationPipe } from '@/shared/pipes/zod-validation.pipe';

import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import { LoginThrottlerGuard } from './guards/login-throttler.guard';
import { SessionCookieService } from './session-cookie.service';

import type { AuthUser } from '@vm/shared-types';
import type { Request, Response } from 'express';

const UNKNOWN_IP = 'desconocida';

@Controller('api/auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly sessionCookie: SessionCookieService,
  ) {}

  /** El token va solo en la cookie `HttpOnly`; el cuerpo lleva solo el usuario (RF-auth-01). */
  @Public()
  @UseGuards(LoginThrottlerGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body(new ZodValidationPipe(LoginDTO)) body: LoginDTO,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ user: AuthUser }> {
    const { user, issuedToken } = await this.authService.login(body, request.ip ?? UNKNOWN_IP);
    this.sessionCookie.set(response, issuedToken);
    return { user };
  }

  /** Pública para ser idempotente: con o sin sesión válida, expira la cookie (RF-auth-08). */
  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<null> {
    await this.authService.logout(this.sessionCookie.read(request));
    this.sessionCookie.clear(response);
    return null;
  }

  @Get('me')
  me(@CurrentUser() user: AuthUser): { user: AuthUser } {
    return { user };
  }
}
