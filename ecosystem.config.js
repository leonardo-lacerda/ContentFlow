const appDirectory = process.env.CONTENTFLOW_APP_DIR || process.cwd();

module.exports = {
  apps: [
    {
      name: 'contentflow-backend',
      script: 'node',
      args: 'apps/backend/start-production.mjs',
      cwd: appDirectory,
      env: {
        NODE_ENV: 'production',
      },
      max_memory_restart: '1G',
    },
    {
      name: 'contentflow-frontend',
      script: 'node',
      args: 'apps/frontend/start-production.mjs',
      cwd: appDirectory,
      env: {
        NODE_ENV: 'production',
      },
      max_memory_restart: '512M',
    },
  ],
};
