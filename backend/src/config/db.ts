import mongoose from 'mongoose';
import { env } from './env';

export async function connectDB(): Promise<void> {
  mongoose.connection.on('connected', () => console.log('[mongo] connected'));
  mongoose.connection.on('error', (err) => console.error('[mongo] error', err));
  mongoose.connection.on('disconnected', () => console.warn('[mongo] disconnected'));

  await mongoose.connect(env.MONGODB_URI);
}
