import { readFileSync, existsSync } from 'fs';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

export class ConfigurationChecker {
  cfg: dotenv.DotenvParseOutput;
  issues: string[] = [];

  readEnvFromFile() {
    const envFile = resolve(__dirname, '../../../.env');

    if (!existsSync(envFile)) {
      console.error('Env file not found!: ', envFile);
      return;
    }

    const handle = readFileSync(envFile, 'utf-8');

    this.cfg = dotenv.parse(handle);
  }

  readEnvFromProcess() {
    this.cfg = process.env;
  }

  check() {
    this.checkDatabaseServers();
    this.checkNonEmpty('JWT_SECRET');
    this.checkIsValidUrl('MAIN_URL');
    this.checkIsValidUrl('FRONTEND_URL');
    this.checkIsValidUrl('NEXT_PUBLIC_BACKEND_URL');
    this.checkIsValidUrl('BACKEND_INTERNAL_URL');
    this.checkNonEmpty('STORAGE_PROVIDER', 'Needed to setup storage.');
    const primaryProvider = (this.get('AI_PRIMARY_PROVIDER') || 'kie').toLowerCase();
    if (primaryProvider === 'kie') {
      this.checkNonEmpty(
        'KIEAI_API_KEY',
        'Needed for the configured Kie.ai chat and creative provider.'
      );
      if (!this.get('KIEAI_CHAT_BASE_URL') && !this.get('CREATIVE_KIE_BASE_URL')) {
        this.issues.push('KIEAI_CHAT_BASE_URL or CREATIVE_KIE_BASE_URL not set.');
      }
      this.checkNonEmpty('KIEAI_CHAT_MODEL', 'Needed for the configured Kie.ai chat provider.');
    } else {
      this.checkNonEmpty(
        'OPENAI_API_KEY',
        'Needed for AI content/image generation and the AI agents.'
      );
    }
    // Re-enabled 2026-08-20 (security remediation): restores the
    // payment-provider guard that was temporarily commented out on
    // 2026-08-14. If the production host still has no Stripe/Cakto
    // credentials configured, this will now fail its boot check again —
    // that's intentional; configure a real payment provider (or keep this
    // disabled deliberately by re-commenting it, not by leaving it silently
    // broken). See SECURITY-REMEDIATION-2026-08-14.md.
    const hasCakto = !!(this.cfg.CAKTO_STARTER_CHECKOUT_URL || this.cfg.CAKTO_PRO_CHECKOUT_URL || this.cfg.CAKTO_SCALE_CHECKOUT_URL);
    const hasStripe = !!this.cfg.STRIPE_SECRET_KEY;
    if (!hasCakto && !hasStripe) {
      this.checkNonEmpty(
        'STRIPE_SECRET_KEY',
        'Needed to create checkouts and manage subscriptions. (Or set CAKTO_*_CHECKOUT_URL for Cakto)'
      );
      this.checkNonEmpty(
        'STRIPE_SIGNING_KEY',
        'Needed to validate Stripe webhook events. (Or set CAKTO_WEBHOOK_* for Cakto)'
      );
    } else if (hasStripe) {
      // Previously this only ran when *neither* provider was configured, so
      // a deploy with STRIPE_SECRET_KEY set but STRIPE_SIGNING_KEY missing
      // (e.g. Stripe configured alongside Cakto, or STRIPE_SIGNING_KEY
      // simply forgotten) booted without the intended hard failure —
      // webhook signature verification would then be broken with no
      // boot-time signal. Stripe being active at all is what requires its
      // signing key, independent of whether Cakto is also configured.
      this.checkNonEmpty(
        'STRIPE_SIGNING_KEY',
        'Needed to validate Stripe webhook events.'
      );
    }

    if (this.get('NODE_ENV') === 'production') {
      for (const key of [
        'ADMIN_JWT_SECRET',
        'ADMIN_AUDIT_EXPORT_SECRET',
        'DATA_ENCRYPTION_KEY',
        'AI_GENERATE_API_KEY',
      ]) {
        if (this.checkNonEmpty(key)) {
          const value = this.get(key)!;
          if (value.length < 32) {
            this.issues.push(`${key} must contain at least 32 characters`);
          }
          if (/change-this|troque_por|random string|your jwt secret/i.test(value)) {
            this.issues.push(`${key} must not use a placeholder value`);
          }
        }
      }

      // Re-enabled 2026-08-20 (security remediation): restores the
      // HTTPS/NOT_SECURED guard that was temporarily commented out on
      // 2026-08-14. Session cookies ship without Secure/HttpOnly/SameSite
      // whenever NOT_SECURED=true (see every cookie-setting route), so
      // running production without HTTPS is a real, active exposure, not a
      // theoretical one. If the production host still has no domain/TLS
      // reverse proxy, this will now fail its boot check again — that's
      // intentional; stand up TLS (docker-compose.proxy.yaml) rather than
      // leaving this silently disabled. See SECURITY-REMEDIATION-2026-08-14.md,
      // "Production actions required before deploying this revision". Mirrors
      // the same guard in scripts/validate-runtime-env.mjs.
      for (const key of ['MAIN_URL', 'FRONTEND_URL', 'NEXT_PUBLIC_BACKEND_URL']) {
        const value = this.get(key);
        if (value && !value.startsWith('https://')) {
          this.issues.push(`${key} must use HTTPS in production`);
        }
      }

      if (String(this.get('NOT_SECURED')).toLowerCase() === 'true') {
        this.issues.push('NOT_SECURED must not be enabled in production');
      }
    }
  }

  checkNonEmpty(key: string, description?: string): boolean {
    const v = this.get(key);

    if (!description) {
      description = '';
    }

    if (!v) {
      this.issues.push(key + ' not set. ' + description);
      return false;
    }

    if (v.length === 0) {
      this.issues.push(key + ' is empty.' + description);
      return false;
    }

    return true;
  }

  get(key: string): string | undefined {
    return this.cfg[key as keyof typeof this.cfg];
  }

  checkDatabaseServers() {
    this.checkRedis();
    this.checkIsValidUrl('DATABASE_URL');
  }

  checkRedis() {
    if (!this.cfg.REDIS_URL) {
      this.issues.push('REDIS_URL not set');
    }

    try {
      const redisUrl = new URL(this.cfg.REDIS_URL);

      if (redisUrl.protocol !== 'redis:') {
        this.issues.push('REDIS_URL must start with redis://');
      }
    } catch (error) {
      this.issues.push('REDIS_URL is not a valid URL');
    }
  }

  checkIsValidUrl(key: string) {
    if (!this.checkNonEmpty(key)) {
      return;
    }

    const urlString = this.get(key);

    try {
      new URL(urlString);
    } catch (error) {
      this.issues.push(key + ' is not a valid URL');
    }

    if (urlString.endsWith('/')) {
      this.issues.push(key + ' should not end with /');
    }
  }

  hasIssues() {
    return this.issues.length > 0;
  }

  getIssues() {
    return this.issues;
  }

  getIssuesCount() {
    return this.issues.length;
  }
}
