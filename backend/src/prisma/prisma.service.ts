import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '../../generated/prisma/client';

/**
 * NestJS wrapper around {@link PrismaClient}.
 *
 * Registered as a global provider via {@link PrismaModule} so that any module
 * can inject it without explicitly importing `PrismaModule`.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit(): Promise<void> {
    await this.$connect();
  }
}
