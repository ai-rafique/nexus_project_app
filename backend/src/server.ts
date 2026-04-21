import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { env } from './config/env';
import { connectDB } from './config/db';
import app from './app';

fs.mkdirSync(path.join(process.cwd(), 'uploads'), { recursive: true });

async function start(): Promise<void> {
  await connectDB();
  app.listen(env.PORT, () => {
    console.log(`[server] NEXUS backend running on port ${env.PORT} (${env.NODE_ENV})`);
  });
}

start().catch((err) => {
  console.error('[server] fatal startup error', err);
  process.exit(1);
});
