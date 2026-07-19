import { SetMetadata } from '@nestjs/common';
import { AppAbility } from './ability.factory';

export const CHECK_POLICIES_KEY = 'check_policy';
export const CheckPolicies = (handler: (ability: AppAbility) => boolean) =>
  SetMetadata(CHECK_POLICIES_KEY, handler);
