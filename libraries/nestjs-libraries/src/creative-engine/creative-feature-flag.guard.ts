import { CanActivate, Injectable, NotFoundException } from '@nestjs/common';

@Injectable()
export class CreativeFeatureFlagGuard implements CanActivate {
  canActivate() {
    if (process.env.CREATIVE_ENGINE_ENABLED === 'false') {
      throw new NotFoundException('Creative Engine is disabled');
    }
    return true;
  }
}
