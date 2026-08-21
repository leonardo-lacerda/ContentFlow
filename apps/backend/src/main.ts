import { initializeSentry } from '@gitroom/nestjs-libraries/sentry/initialize.sentry';
initializeSentry('backend', true);
import compression from 'compression';

import { loadSwagger } from '@gitroom/helpers/swagger/load.swagger';
import { json } from 'express';
import { Runtime } from '@temporalio/worker';
if (process.env.DISABLE_TEMPORAL !== 'true') {
  Runtime.install({ shutdownSignals: [] });
}

process.env.TZ = 'UTC';

import cookieParser from 'cookie-parser';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';

import { SubscriptionExceptionFilter } from '@gitroom/backend/services/auth/permissions/subscription.exception';
import { HttpExceptionFilter } from '@gitroom/nestjs-libraries/services/exception.filter';
import { ConfigurationChecker } from '@gitroom/helpers/configuration/configuration.checker';

async function start() {
  const configurationIssues = checkConfiguration();
  if (process.env.NODE_ENV === 'production' && configurationIssues.length > 0) {
    Logger.error(
      `Refusing to start production with ${configurationIssues.length} configuration issue(s)`,
      'Configuration'
    );
    process.exit(1);
  }

  const allowedCorsOrigins = [
    process.env.FRONTEND_URL,
    ...(process.env.NODE_ENV !== 'production' ? ['http://localhost:6274'] : []),
    ...(process.env.MAIN_URL ? [process.env.MAIN_URL] : []),
  ].filter((origin): origin is string => Boolean(origin));

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
    cors: {
      // The frontend always uses credentials: include, including local mode
      // where auth is also mirrored through the non-secure auth header.
      credentials: true,
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'auth',
        'showorg',
        'impersonate',
        'x-copilotkit-runtime-client-gql-version',
      ],
      exposedHeaders: [
        'reload',
        'onboarding',
        'activate',
        'x-copilotkit-runtime-client-gql-version',
        ...(process.env.NOT_SECURED ? ['auth', 'showorg', 'impersonate'] : []),
      ],
      origin: (origin, callback) => {
        if (!origin || allowedCorsOrigins.includes(origin)) {
          callback(null, true);
          return;
        }
        callback(new Error(`Origin not allowed by CORS: ${origin}`));
      },
    },
  });

  // The app is deployed behind one trusted reverse proxy in production.
  // Honour its client IP only after the proxy boundary; never trust an
  // arbitrary X-Forwarded-For supplied directly by a caller.
  app.set('trust proxy', Number(process.env.TRUST_PROXY_HOPS || 1));
  app.use((_req: any, res: any, next: any) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    if (process.env.NODE_ENV === 'production') {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    next();
  });

  const mcpEnabled =
    process.env.DISABLE_MCP !== 'true' &&
    (process.env.NODE_ENV === 'production' ||
      process.env.ENABLE_MCP_LOCAL === 'true');

  if (mcpEnabled) {
    const { startMcp } = await import('@gitroom/nestjs-libraries/chat/start.mcp');
    await startMcp(app);
  }

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    })
  );

  app.use(['/copilot/*', '/posts', '/ai-generate/*', '/settings/*'], (req: any, res: any, next: any) => {
    json({ limit: '50mb' })(req, res, next);
  });

  app.use(cookieParser());
  app.use(compression());
  app.useGlobalFilters(new SubscriptionExceptionFilter());
  app.useGlobalFilters(new HttpExceptionFilter());

  loadSwagger(app);

  const port = process.env.PORT || 3000;

  try {
    await app.listen(port);
    Logger.log('Backend started successfully on port ' + port);

    Logger.log(`🚀 Backend is running on: http://localhost:${port}`);
  } catch (e) {
    Logger.error(`Backend failed to start on port ${port}`, e);
    process.exit(1);
  }
}

function checkConfiguration() {
  const checker = new ConfigurationChecker();
  checker.readEnvFromProcess();
  checker.check();

  if (checker.hasIssues()) {
    for (const issue of checker.getIssues()) {
      Logger.warn(issue, 'Configuration issue');
    }

    Logger.warn('Configuration issues found: ' + checker.getIssuesCount());
  } else {
    Logger.log('Configuration check completed without any issues');
  }
  return checker.getIssues();
}

start();
