import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UsersModule } from '@/modules/users/users.module';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { OriginGuard } from './guards/origin.guard';
import { RolesGuard } from './guards/roles.guard';
import { LOGIN_THROTTLERS } from './login-throttle';
import { SessionCookieService } from './session-cookie.service';
import {
  JWT_ALGORITHM,
  JWT_AUDIENCE,
  JWT_ISSUER,
  SessionTokenService,
} from './session-token.service';
import { SessionEntity } from './session.entity';
import { SessionRepository } from './session.repository';

import type { Env } from '@/config/env.validation';
import type { JwtModuleOptions } from '@nestjs/jwt';

@Module({
  imports: [
    UsersModule,
    TypeOrmModule.forFeature([SessionEntity]),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>): JwtModuleOptions => ({
        secret: config.get('JWT_SECRET', { infer: true }),
        signOptions: { algorithm: JWT_ALGORITHM, issuer: JWT_ISSUER, audience: JWT_AUDIENCE },
        verifyOptions: { algorithms: [JWT_ALGORITHM], issuer: JWT_ISSUER, audience: JWT_AUDIENCE },
      }),
    }),
    // Sin ThrottlerGuard global: los límites aplican solo donde se usa LoginThrottlerGuard.
    ThrottlerModule.forRoot({ throttlers: LOGIN_THROTTLERS }),
  ],
  controllers: [AuthController],
  providers: [
    SessionRepository,
    SessionTokenService,
    SessionCookieService,
    AuthService,
    // Guards globales, en este orden: origen (CSRF), sesión, rol.
    { provide: APP_GUARD, useClass: OriginGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
  exports: [AuthService],
})
export class AuthModule {}
