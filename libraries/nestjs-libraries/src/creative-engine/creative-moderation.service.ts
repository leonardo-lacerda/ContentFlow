import { BadRequestException, Injectable } from '@nestjs/common';

export interface CreativeModerationResult {
  allowed: boolean;
  flags: string[];
  requiresReview: boolean;
}

@Injectable()
export class CreativeModerationService {
  private readonly blockedPatterns: Array<[string, RegExp]> = [
    ['minor-sexualization', /\b(child|minor|underage)\b.{0,60}\b(sex|nude|naked|sexual)\b/i],
    ['impersonation', /\b(deepfake|impersonate|pretend to be|clone(?:[^\n]{0,80})?without consent|clonar[^\n]{0,80}sem consentimento)\b/i],
    ['regulated-claim', /\b(cure|cura|curar|garantia de retorno|retorno garantido|lucro garantido|milagre|100% garantido)\b/i],
  ];

  inspect(text: string): CreativeModerationResult {
    const flags = this.blockedPatterns.filter(([, pattern]) => pattern.test(text || '')).map(([flag]) => flag);
    return { allowed: !flags.includes('minor-sexualization') && !flags.includes('impersonation'), flags, requiresReview: flags.includes('regulated-claim') };
  }

  assertAllowed(text: string) {
    const result = this.inspect(text);
    if (!result.allowed) throw new BadRequestException(`Creative content blocked: ${result.flags.join(', ')}`);
    if (result.requiresReview && process.env.CREATIVE_ALLOW_REGULATED_CLAIMS !== 'true') {
      throw new BadRequestException('Creative content requires manual review before generation');
    }
    return result;
  }
}
