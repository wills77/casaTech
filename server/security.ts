import crypto from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { db } from './db.ts';

export const SESSION_COOKIE_NAME = 'casatech_session';
const SESSION_DURATION_DAYS = 7;

export interface AuthenticatedUser {
  id: number;
  username: string | null;
  email: string;
  role: 'customer' | 'admin';
  full_name: string;
  phone: string;
  is_suspended: number;
  must_change_password: number;
}

export interface AuthedRequest extends Request {
  user?: AuthenticatedUser;
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, keyHex] = parts;
  const keyBuf = Buffer.from(keyHex, 'hex');
  const derived = crypto.scryptSync(password, salt, 64);
  if (keyBuf.length !== derived.length) return false;
  return crypto.timingSafeEqual(keyBuf, derived);
}

export function hashSessionToken(token: string): string {
  const secret = process.env.SESSION_SECRET || 'casatech_dev_session_secret_change_in_prod';
  return crypto.createHmac('sha256', secret).update(token).digest('hex');
}

export function createSession(userId: number): { rawToken: string; expiresAt: string } {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashSessionToken(rawToken);
  const expiresDate = new Date(Date.now() + SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000);
  const expiresAt = expiresDate.toISOString();

  db.prepare('INSERT INTO sessions (user_id, token_hash, expires_at) VALUES (?, ?, ?)').run(
    userId,
    tokenHash,
    expiresAt
  );

  return { rawToken, expiresAt };
}

export function deleteSession(rawToken: string): void {
  const tokenHash = hashSessionToken(rawToken);
  db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(tokenHash);
}

export function setSessionCookie(res: Response, rawToken: string, expiresAt: string): void {
  const isProd = process.env.NODE_ENV === 'production';
  res.cookie(SESSION_COOKIE_NAME, rawToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProd,
    expires: new Date(expiresAt),
    path: '/',
  });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(SESSION_COOKIE_NAME, { path: '/' });
}

function getUserFromRequest(req: Request): AuthenticatedUser | undefined {
  const rawToken = req.cookies?.[SESSION_COOKIE_NAME];
  if (!rawToken || typeof rawToken !== 'string') return undefined;

  const tokenHash = hashSessionToken(rawToken);
  const row = db
    .prepare(
      `SELECT u.id, u.username, u.email, u.role, u.full_name, u.phone, u.is_suspended, u.must_change_password, s.expires_at
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = ?`
    )
    .get(tokenHash) as (AuthenticatedUser & { expires_at: string }) | undefined;

  if (!row) return undefined;
  if (new Date(row.expires_at).getTime() < Date.now()) {
    db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(tokenHash);
    return undefined;
  }
  if (row.is_suspended === 1) {
    return undefined;
  }

  return {
    id: row.id,
    username: row.username,
    email: row.email,
    role: row.role,
    full_name: row.full_name,
    phone: row.phone,
    is_suspended: row.is_suspended,
    must_change_password: row.must_change_password,
  };
}

export function optionalAuth(req: AuthedRequest, _res: Response, next: NextFunction): void {
  req.user = getUserFromRequest(req);
  next();
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction): void {
  const user = getUserFromRequest(req);
  if (!user) {
    res.status(401).json({ error: 'Authentification requise.' });
    return;
  }
  req.user = user;
  next();
}

export function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction): void {
  const user = getUserFromRequest(req);
  if (!user) {
    res.status(401).json({ error: 'Authentification administrateur requise.' });
    return;
  }
  if (user.role !== 'admin') {
    res.status(403).json({ error: 'Accès refusé. Droits administrateur requis.' });
    return;
  }
  req.user = user;
  next();
}

export function logAudit(
  actorId: number | null,
  actorRole: string,
  action: string,
  entityType: string,
  entityId: string | number,
  details: Record<string, unknown> = {}
): void {
  try {
    db.prepare(
      'INSERT INTO audit_logs (actor_id, actor_role, action, entity_type, entity_id, details_json) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(actorId, actorRole, action, entityType, String(entityId), JSON.stringify(details));
  } catch (err) {
    console.error('Audit log error:', err);
  }
}
