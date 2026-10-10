import { Controller, Get } from '@nestjs/common';

import { Public } from '@/modules/auth/decorators/public.decorator';

import type { HealthStatus } from '@vm/shared-types';

@Public()
@Controller('health')
export class HealthController {
  @Get()
  check(): HealthStatus {
    return {
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }
}
