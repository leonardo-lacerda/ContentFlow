import { PostgresStore } from '@mastra/pg';

export const pStore = new PostgresStore({
  id: 'contentflow-store',
  connectionString: process.env.DATABASE_URL!,
});
