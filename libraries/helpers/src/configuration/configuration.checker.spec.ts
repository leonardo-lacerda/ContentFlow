import { ConfigurationChecker } from './configuration.checker';

const validProductionEnv = {
  NODE_ENV: 'production',
  DATABASE_URL: 'postgresql://user:password@localhost:5432/contentflow',
  REDIS_URL: 'redis://localhost:6379',
  JWT_SECRET: 'j'.repeat(64),
  ADMIN_JWT_SECRET: 'a'.repeat(64),
  ADMIN_AUDIT_EXPORT_SECRET: 'e'.repeat(64),
  DATA_ENCRYPTION_KEY: 'd'.repeat(64),
  AI_GENERATE_API_KEY: 'g'.repeat(64),
  STORAGE_PROVIDER: 'local',
  AI_PRIMARY_PROVIDER: 'kie',
  KIEAI_API_KEY: 'k'.repeat(32),
  KIEAI_CHAT_MODEL: 'text-model',
  KIEAI_CHAT_BASE_URL: 'https://api.kie.ai',
  CAKTO_STARTER_CHECKOUT_URL: 'configured',
  MAIN_URL: 'https://contentflow.example.com',
  FRONTEND_URL: 'https://contentflow.example.com',
  NEXT_PUBLIC_BACKEND_URL: 'https://contentflow.example.com/api',
  BACKEND_INTERNAL_URL: 'http://127.0.0.1:3000',
  NOT_SECURED: 'false',
};

describe('ConfigurationChecker production guard', () => {
  const originalEnv = process.env;

  afterEach(() => {
    process.env = originalEnv;
  });

  it('rejects production without the audit signing secret and HTTPS', () => {
    process.env = {
      ...validProductionEnv,
      ADMIN_AUDIT_EXPORT_SECRET: '',
      FRONTEND_URL: 'http://contentflow.example.com',
    };

    const checker = new ConfigurationChecker();
    checker.readEnvFromProcess();
    checker.check();

    expect(checker.getIssues()).toEqual(
      expect.arrayContaining([
        'ADMIN_AUDIT_EXPORT_SECRET not set. ',
        'FRONTEND_URL must use HTTPS in production',
      ])
    );
  });

  it('accepts a complete production configuration', () => {
    process.env = { ...validProductionEnv };

    const checker = new ConfigurationChecker();
    checker.readEnvFromProcess();
    checker.check();

    expect(checker.getIssues()).toEqual([]);
  });
});
