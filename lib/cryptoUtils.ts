import crypto from 'crypto';
import { SessionPayload } from './authTypes';

function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET?.trim();
  if (process.env.NODE_ENV === 'production') {
    if (!secret || secret.length < 32 || secret.includes('lrsys-sri-lanka-customs-secret-key-2026-secure-salt')) {
      throw new Error(
        '[CRITICAL SECURITY EXCEPTION]: A secure SESSION_SECRET of at least 32 characters must be provided via .env in production! Refusing to start with insecure or missing session secret.'
      );
    }
    return secret;
  }
  return secret || 'lrsys-sri-lanka-customs-secret-key-2026-secure-salt';
}

const SESSION_SECRET = getSessionSecret();
const ITERATIONS = 100000;
const KEY_LENGTH = 64;
const DIGEST = 'sha512';

/**
 * Hash a plain password with a random cryptographically secure salt using PBKDF2
 */
export function hashPassword(password: string): { hash: string; salt: string } {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, DIGEST).toString('hex');
  return { hash, salt };
}

/**
 * Verify a plain password against stored hash and salt
 */
export function verifyPassword(password: string, storedHash: string, salt: string): boolean {
  try {
    const hash = crypto.pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, DIGEST).toString('hex');
    const hashBuffer = Buffer.from(hash, 'hex');
    const storedBuffer = Buffer.from(storedHash, 'hex');
    if (hashBuffer.length !== storedBuffer.length) {
      return false;
    }
    return crypto.timingSafeEqual(hashBuffer, storedBuffer);
  } catch (err) {
    return false;
  }
}

/**
 * Generate a cryptographically secure 6-digit numeric OTP
 */
export function generateOtp(): string {
  return crypto.randomInt(100000, 999999).toString();
}

/**
 * Hash an OTP for secure storage
 */
export function hashOtp(otp: string): string {
  return crypto.createHmac('sha256', SESSION_SECRET).update(otp.trim()).digest('hex');
}

/**
 * Verify an OTP against stored hash
 */
export function verifyOtpHash(otp: string, storedHash: string): boolean {
  try {
    const computed = hashOtp(otp);
    const computedBuf = Buffer.from(computed, 'hex');
    const storedBuf = Buffer.from(storedHash, 'hex');
    if (computedBuf.length !== storedBuf.length) return false;
    return crypto.timingSafeEqual(computedBuf, storedBuf);
  } catch {
    return false;
  }
}

/**
 * Base64URL encode string
 */
function base64UrlEncode(str: string): string {
  return Buffer.from(str)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

/**
 * Base64URL decode string
 */
function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return Buffer.from(base64, 'base64').toString('utf8');
}

/**
 * Sign and create session token: payload.signature
 */
export function createSessionToken(payload: SessionPayload): string {
  const json = JSON.stringify(payload);
  const data = base64UrlEncode(json);
  const signature = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(data)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return `${data}.${signature}`;
}

/**
 * Verify and parse session token
 */
export function verifySessionToken(token: string): SessionPayload | null {
  try {
    if (!token || typeof token !== 'string') return null;
    const parts = token.split('.');
    if (parts.length !== 2) return null;

    const [data, signature] = parts;
    const expectedSignature = crypto
      .createHmac('sha256', SESSION_SECRET)
      .update(data)
      .digest('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

    if (signature !== expectedSignature) {
      return null;
    }

    const json = base64UrlDecode(data);
    const payload: SessionPayload = JSON.parse(json);

    // Check expiration
    if (payload.exp && Date.now() > payload.exp) {
      return null;
    }

    return payload;
  } catch (err) {
    return null;
  }
}

