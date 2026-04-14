import { cleanEnv, str, port, num } from 'envalid';

export const env = cleanEnv(process.env, {
  NODE_ENV: str({ choices: ['development', 'test', 'production'], default: 'development' }),
  PORT: port({ default: 4000 }),
  MONGODB_URI: str(),
  JWT_ACCESS_SECRET: str(),
  JWT_REFRESH_SECRET: str(),
  JWT_ACCESS_EXPIRES_IN: str({ default: '15m' }),
  JWT_REFRESH_EXPIRES_IN: str({ default: '7d' }),
  TOTP_ENCRYPTION_KEY: str(),
  CLIENT_ORIGIN: str({ default: 'http://localhost:3000' }),
});
