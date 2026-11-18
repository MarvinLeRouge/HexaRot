import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { Public } from './auth/public.decorator';
import { PrismaService } from './prisma/prisma.service';

@Controller()
export class AppController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Liveness and readiness probe used by the container healthcheck and
   * external monitors. Answers 503 when the database is unreachable, which is
   * an HttpException, so it is not reported to Sentry.
   */
  @Public()
  @Get('health')
  async getHealth(): Promise<{ status: 'ok' }> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      throw new ServiceUnavailableException({ status: 'error' });
    }
    return { status: 'ok' };
  }
}
