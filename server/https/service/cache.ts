import { NextFunction, Request, Response } from "express";
import { valkey } from "../../valkey";

const DEFAULT_TTL = 60 * 5; // 5 minutes

/**
 * Express middleware to cache GET requests in Valkey Redis.
 */
export const cacheService = (ttlSeconds: number = DEFAULT_TTL, namespace: string = 'general') => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (req.method !== "GET") return next();

    try {
      const user = (req as any).user
      const userKey = user?.uuid  || 'public';
      const queryString = JSON.stringify(req.query || {});
      const cacheKey = `cache:${namespace}:${req.baseUrl}${req.path}:${queryString}:${userKey}`;

      const cached = await valkey.get(cacheKey);
      if (cached) {
        res.set('X-Cache', 'HIT');
        res.setHeader('Content-Type', 'application/json');
        return res.status(200).send(cached);
      }

      res.set('X-Cache', 'MISS');
      const originalJSON = res.json.bind(res);

      res.json = (body: any) => {
        if (res.statusCode >= 200 && res.statusCode < 300 && body) {
          valkey.setex(cacheKey, ttlSeconds, JSON.stringify(body)).catch(err => {
            console.error(`Failed to write cache for key ${cacheKey}:`, err);
          });
        }
        return originalJSON(body);
      };

      next();
    } catch (error) {
      console.error("Valkey Cache Service Error:", error);
      return next();
    }
  };
};

export const cacheMiddleware = cacheService;

/**
 * Programmatic cache invalidation helper for workers and controllers.
 */
export const invalidateCachePattern = async (...patterns: string[]) => {
  try {
    const targetPatterns = patterns.length > 0 ? patterns : ['*'];
    for (const pattern of targetPatterns) {
      const cleanPattern = pattern.startsWith('cache:') ? pattern.slice(6) : pattern;
      const searchPattern = cleanPattern.endsWith('*') ? `cache:${cleanPattern}` : `cache:${cleanPattern}*`;
      let cursor = '0';
      do {
        const [nextCursor, keys] = await valkey.scan(cursor, 'MATCH', searchPattern, 'COUNT', 200);
        cursor = nextCursor;
        if (keys && keys.length > 0) {
          await valkey.del(...keys);
        }
      } while (cursor !== '0' && Boolean(cursor));
    }
  } catch (err) {
    console.error(`Cache invalidation error for patterns ${patterns.join(', ')}:`, err);
  }
};

/**
 * Express middleware to clear cache keys matching patterns on POST, PATCH, DELETE success.
 */
export const clearCache = (...patterns: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    res.on('finish', async () => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        await invalidateCachePattern(...patterns);
      }
    });

    next();
  };
};