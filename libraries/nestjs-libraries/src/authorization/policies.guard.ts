import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CHECK_POLICIES_KEY } from './policy.decorator';
import { AbilityFactory, AppAbility } from './ability.factory';

@Injectable()
export class PoliciesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private abilityFactory: AbilityFactory
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const policyHandler = this.reflector.get<(ability: AppAbility) => boolean>(
      CHECK_POLICIES_KEY,
      context.getHandler()
    );

    if (!policyHandler) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    const ability = this.abilityFactory.defineAbility(user);
    return policyHandler(ability);
  }
}
