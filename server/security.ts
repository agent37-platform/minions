import { createHash, timingSafeEqual } from 'node:crypto';
import { isIP } from 'node:net';
import type { NextFunction, Request, RequestHandler, Response } from 'express';

export interface SecurityConfig {
  host: string;
  corsOrigins: string[];
  auth: { username: string; password: string } | null;
  yoloEnabled: boolean;
  allowRemoteYolo: boolean;
}

function parseBoolean(value: string | undefined, name: string): boolean {
  if (value === undefined || value.trim() === '') return false;
  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  throw new Error(`${name} must be true or false`);
}

function isLoopbackHost(host: string): boolean {
  const normalized = host.trim().toLowerCase().replace(/^\[|\]$/g, '');
  const ipVersion = isIP(normalized);
  return (ipVersion === 6 && normalized === '::1')
    || (ipVersion === 4 && normalized.startsWith('127.'));
}

function isTrustedLoopbackOrigin(req: Request, origin: string): boolean {
  try {
    const parsed = new URL(origin);
    const requestHost = req.get('host');
    const originHost = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, '');
    const trustedHostname = originHost === 'localhost' || isLoopbackHost(originHost);
    return Boolean(requestHost)
      && trustedHostname
      && parsed.host === requestHost
      && parsed.protocol === `${req.protocol}:`;
  } catch {
    return false;
  }
}

export function loadSecurityConfig(env: NodeJS.ProcessEnv = process.env): SecurityConfig {
  const host = env.MINIONS_HOST?.trim() || '127.0.0.1';
  const password = env.MINIONS_AUTH_PASSWORD;
  const username = env.MINIONS_AUTH_USERNAME?.trim() || 'minions';
  const yoloEnabled = parseBoolean(env.MINIONS_YOLO, 'MINIONS_YOLO');
  const allowRemoteYolo = parseBoolean(env.MINIONS_ALLOW_REMOTE_YOLO, 'MINIONS_ALLOW_REMOTE_YOLO');
  const corsOrigins = (env.MINIONS_CORS_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (!isLoopbackHost(host) && !password) {
    throw new Error('Remote bind requires authentication via MINIONS_AUTH_PASSWORD');
  }
  if (!isLoopbackHost(host) && yoloEnabled && !allowRemoteYolo) {
    throw new Error('Remote bind with YOLO enabled is blocked; set MINIONS_ALLOW_REMOTE_YOLO=true to accept the risk');
  }

  return {
    host,
    corsOrigins,
    auth: password ? { username, password } : null,
    yoloEnabled,
    allowRemoteYolo,
  };
}

function safeEqual(left: string, right: string): boolean {
  const leftHash = createHash('sha256').update(left).digest();
  const rightHash = createHash('sha256').update(right).digest();
  return timingSafeEqual(leftHash, rightHash);
}

function parseBasicAuthorization(value: string | undefined): { username: string; password: string } | null {
  if (!value?.startsWith('Basic ')) return null;
  try {
    const decoded = Buffer.from(value.slice(6), 'base64').toString('utf8');
    const separator = decoded.indexOf(':');
    if (separator < 0) return null;
    return { username: decoded.slice(0, separator), password: decoded.slice(separator + 1) };
  } catch {
    return null;
  }
}

function rejectUnauthorized(res: Response): void {
  res.setHeader('WWW-Authenticate', 'Basic realm="Minions", charset="UTF-8"');
  res.status(401).json({ error: 'Authentication required', code: 'UNAUTHORIZED' });
}

export function createSecurityMiddleware(config: SecurityConfig): RequestHandler {
  const allowedOrigins = new Set(config.corsOrigins);

  return (req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');

    const origin = req.get('origin');
    if (origin) {
      if (!isTrustedLoopbackOrigin(req, origin) && !allowedOrigins.has(origin)) {
        res.status(403).json({ error: 'Origin is not allowed', code: 'ORIGIN_NOT_ALLOWED' });
        return;
      }
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,POST,PUT,PATCH,DELETE,OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Authorization,Content-Type');
      if (req.method === 'OPTIONS') {
        res.status(204).end();
        return;
      }
    }

    if (config.auth) {
      const credentials = parseBasicAuthorization(req.get('authorization'));
      if (!credentials
        || !safeEqual(credentials.username, config.auth.username)
        || !safeEqual(credentials.password, config.auth.password)) {
        rejectUnauthorized(res);
        return;
      }
    }

    next();
  };
}
