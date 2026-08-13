const appDirectory = process.env.CONTENTFLOW_APP_DIR || process.cwd();

module.exports = {
  apps: [
    {
      name: 'contentflow-backend',
      script: 'pnpm',
      args: 'start:prod:backend',
      cwd: appDirectory,
      env: {
        NODE_ENV: 'production',
      },
      max_memory_restart: '1G',
    },
    {
      name: 'contentflow-frontend',
      script: 'pnpm',
      args: 'start:prod:frontend',
      cwd: appDirectory,
      env: {
        NODE_ENV: 'production',
      },
      max_memory_restart: '512M',
    },
  ],
};
