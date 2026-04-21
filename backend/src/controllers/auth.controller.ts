import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import speakeasy from 'speakeasy';
import qrcode from 'qrcode';
import { z } from 'zod';
import { User } from '../models/User';
import { RefreshToken } from '../models/RefreshToken';
import { env } from '../config/env';

// ── Schemas ────────────────────────────────────────────────────────────────────

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
  totpCode: z.string().optional(),
});

const refreshSchema = z.object({
  refreshToken: z.string(),
});

const totpVerifySchema = z.object({
  token: z.string().length(6),
  secret: z.string(),
});

// ── Helpers ────────────────────────────────────────────────────────────────────

function signAccessToken(userId: string, email: string, role: string): string {
  return jwt.sign({ sub: userId, email, role }, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN,
  } as jwt.SignOptions);
}

function signRefreshToken(userId: string): string {
  return jwt.sign({ sub: userId, jti: crypto.randomUUID() }, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN,
  } as jwt.SignOptions);
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function encryptTotp(secret: string): string {
  const key = Buffer.from(env.TOTP_ENCRYPTION_KEY, 'utf8').subarray(0, 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  const encrypted = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decryptTotp(encrypted: string): string {
  const [ivHex, encHex] = encrypted.split(':');
  const key = Buffer.from(env.TOTP_ENCRYPTION_KEY, 'utf8').subarray(0, 32);
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  const decrypted = Buffer.concat([decipher.update(Buffer.from(encHex, 'hex')), decipher.final()]);
  return decrypted.toString('utf8');
}

// ── Controllers ────────────────────────────────────────────────────────────────

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = registerSchema.parse(req.body);

    const existing = await User.findOne({ email: body.email });
    if (existing) {
      res.status(409).json({ message: 'Email already registered' });
      return;
    }

    const passwordHash = await bcrypt.hash(body.password, 12);
    const user = await User.create({
      email: body.email,
      passwordHash,
      firstName: body.firstName,
      lastName: body.lastName,
    });

    const accessToken = signAccessToken(user.id, user.email, user.globalRole);
    const refreshRaw = signRefreshToken(user.id);

    await RefreshToken.create({
      userId: user._id,
      tokenHash: hashToken(refreshRaw),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    res.status(201).json({
      accessToken,
      refreshToken: refreshRaw,
      user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, globalRole: user.globalRole },
    });
  } catch (err) {
    next(err);
  }
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = loginSchema.parse(req.body);

    const user = await User.findOne({ email: body.email });
    if (!user || !user.isActive) {
      res.status(401).json({ message: 'Invalid credentials' });
      return;
    }

    const valid = await bcrypt.compare(body.password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ message: 'Invalid credentials' });
      return;
    }

    if (user.isTotpEnabled) {
      if (!body.totpCode) {
        res.status(200).json({ requireTotp: true });
        return;
      }
      const secret = decryptTotp(user.totpSecret!);
      const verified = speakeasy.totp.verify({
        secret,
        encoding: 'base32',
        token: body.totpCode,
        window: 1,
      });
      if (!verified) {
        res.status(401).json({ message: 'Invalid 2FA code' });
        return;
      }
    }

    user.lastLogin = new Date();
    await user.save();

    const accessToken = signAccessToken(user.id, user.email, user.globalRole);
    const refreshRaw = signRefreshToken(user.id);

    await RefreshToken.create({
      userId: user._id,
      tokenHash: hashToken(refreshRaw),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    res.json({
      accessToken,
      refreshToken: refreshRaw,
      user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, globalRole: user.globalRole },
    });
  } catch (err) {
    next(err);
  }
}

export async function refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { refreshToken } = refreshSchema.parse(req.body);

    let payload: jwt.JwtPayload;
    try {
      payload = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as jwt.JwtPayload;
    } catch {
      res.status(401).json({ message: 'Invalid or expired refresh token' });
      return;
    }

    const tokenHash = hashToken(refreshToken);
    const stored = await RefreshToken.findOne({ tokenHash });
    if (!stored) {
      res.status(401).json({ message: 'Refresh token not recognised' });
      return;
    }

    // Token rotation — delete old, issue new
    await RefreshToken.deleteOne({ _id: stored._id });

    const user = await User.findById(payload.sub);
    if (!user || !user.isActive) {
      res.status(401).json({ message: 'User not found or inactive' });
      return;
    }

    const accessToken = signAccessToken(user.id, user.email, user.globalRole);
    const newRefreshRaw = signRefreshToken(user.id);

    await RefreshToken.create({
      userId: user._id,
      tokenHash: hashToken(newRefreshRaw),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    res.json({ accessToken, refreshToken: newRefreshRaw });
  } catch (err) {
    next(err);
  }
}

export async function logout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { refreshToken } = refreshSchema.parse(req.body);
    const tokenHash = hashToken(refreshToken);
    await RefreshToken.deleteOne({ tokenHash });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function setup2fa(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await User.findById(req.user!.sub);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    const secretObj = speakeasy.generateSecret({ name: `NEXUS (${user.email})`, length: 20 });
    const dataUrl = await qrcode.toDataURL(secretObj.otpauth_url!);

    res.json({ secret: secretObj.base32, qrCode: dataUrl });
  } catch (err) {
    next(err);
  }
}

export async function me(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await User.findById(req.user!.sub).select('-passwordHash -totpSecret');
    if (!user) { res.status(404).json({ message: 'User not found' }); return; }
    res.json({ _id: user._id, email: user.email, firstName: user.firstName, lastName: user.lastName, globalRole: user.globalRole });
  } catch (err) {
    next(err);
  }
}

export async function verify2fa(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { token, secret } = totpVerifySchema.parse(req.body);

    const verified = speakeasy.totp.verify({ secret, encoding: 'base32', token, window: 1 });
    if (!verified) {
      res.status(400).json({ message: 'Invalid TOTP code' });
      return;
    }

    const user = await User.findById(req.user!.sub);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    user.totpSecret = encryptTotp(secret);
    user.isTotpEnabled = true;
    await user.save();

    res.json({ message: '2FA enabled successfully' });
  } catch (err) {
    next(err);
  }
}
