import { NextFunction, Request, Response } from "express";
import { valkey } from "../../valkey";
import { RateLimitError } from "../../config/errorHandler";

export interface RateLimitOptions {
  windowMs?: number;
  maxRequests?: number;
  prefix?: string;
}

export const createRateLimiter = (options: RateLimitOptions = {}) => {
  const windowMs = options.windowMs || 15 * 60 * 1000;
  const windowSeconds = Math.ceil(windowMs / 1000);
  const maxRequests = options.maxRequests || 100;
  const prefix = options.prefix || 'rate:global';

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || '127.0.0.1';
      const user = (req as any).user || (req as any).staff || (req as any).admin || (req as any).client;
      const identifier = user?.uuid || user?.username || ip;
      const key = `${prefix}:${identifier}`;

      const result: any = await (valkey as any).checkRateLimit(key, windowSeconds.toString());
      const currentCount = Number(result[0] || 0);
      const ttl = Number(result[1] || windowSeconds);

      res.set('X-RateLimit-Limit', maxRequests.toString());
      res.set('X-RateLimit-Remaining', Math.max(0, maxRequests - currentCount).toString());

      if (currentCount > maxRequests) {
        res.set('Retry-After', ttl.toString());
        return next(new RateLimitError(`Too many attempts. Please try again in ${ttl} seconds.`, { retryAfter: ttl }));
      }

      return next();
    } catch (error) {
      console.error("Valkey Rate Limiter Error:", error);
      return next();
    }
  };
};

export const rateLimiterForLogins = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 5,
  prefix: 'rate:login'
});

export const authRateLimiter = rateLimiterForLogins;

export const rateLimiterAllApi = createRateLimiter({
  windowMs: 5 * 60 * 1000,
  maxRequests: 200,
  prefix: 'rate:global'
});

export const globalRateLimiter = rateLimiterAllApi;