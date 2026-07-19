import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';

/**
 * ContentFlow v1 — bloqueia endpoints de features fora do core loop.
 * Controllers cut devem usar `@UseGuards(V1SurfaceGuard)`.
 * SUPERADMIN bypass.
 */
@Injectable()
export class V1SurfaceGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const user = req?.user;
    if (user?.isSuperAdmin || user?.role === 'SUPERADMIN') {
      return true;
    }
    throw new HttpException(
      {
        statusCode: HttpStatus.NOT_FOUND,
        message: 'FEATURE_DISABLED',
        error:
          'Esta feature não faz parte do ContentFlow v1. Foque em DNA → Swipe → Criar → Publicar.',
      },
      HttpStatus.NOT_FOUND
    );
  }
}
