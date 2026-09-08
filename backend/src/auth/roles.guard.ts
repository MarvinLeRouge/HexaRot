import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '../../generated/prisma/client';
import { ROLES_KEY } from './roles.decorator';
import { AuthenticatedRequest } from './jwt-auth.guard';

/**
 * Registered globally via APP_GUARD in AppModule, alongside JwtAuthGuard.
 * A no-op when a route has no @Roles() metadata; otherwise requires
 * request.user.role (set by JwtAuthGuard, which always runs first) to be
 * one of the required roles.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    return !!request.user && requiredRoles.includes(request.user.role);
  }
}
