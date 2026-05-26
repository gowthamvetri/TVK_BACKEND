/**
 * Cache Middleware
 * Intercepts HTTP requests to implement caching
 * Automatically caches GET responses based on route configuration
 */

import { Request, Response, NextFunction, RequestHandler } from 'express';
import logger from '../logger';
import { cacheService } from './CacheService';
import { CacheOptions } from './types';

// Extend Express Request to add cache metadata
declare global {
  namespace Express {
    interface Request {
      cacheKey?: string;
      cacheOptions?: CacheOptions;
      cacheDisabled?: boolean;
      skipCache?: boolean;
    }
  }
}

/**
 * Options for cache middleware
 */
export interface CacheMiddlewareOptions {
  ttl?: number;
  keyGenerator?: (req: Request) => string;
  condition?: (req: Request) => boolean;
  excludePaths?: string[];
  compress?: boolean;
}

/**
 * Create cache middleware for GET requests
 */
export function createCacheMiddleware(options: CacheMiddlewareOptions = {}): RequestHandler {
  const {
    ttl = 3600,
    keyGenerator,
    condition,
    excludePaths = [],
    compress = false,
  } = options;

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Only cache GET requests
      if (req.method !== 'GET') {
        return next();
      }

      // Check excluded paths
      if (excludePaths.some((path) => req.path.includes(path))) {
        return next();
      }

      // Check custom condition
      if (condition && !condition(req)) {
        return next();
      }

      // Check for explicit cache skip
      if (req.skipCache || req.cacheDisabled) {
        return next();
      }

      // Generate cache key
      const cacheKey = keyGenerator
        ? keyGenerator(req)
        : `v1:http:${req.method}:${req.path}:${JSON.stringify(req.query)}`;

      // Store cache key in request for later use
      req.cacheKey = cacheKey;
      req.cacheOptions = { ttl, compressed: compress };

      // Try to get from cache
      const cached = await cacheService.get(cacheKey);

      if (cached.hit && cached.data) {
        logger.debug('HTTP cache hit', { path: req.path, method: req.method });

        // Send cached response
        res.set('X-Cache', 'HIT');
        return res.json(cached.data);
      }

      // Not in cache, intercept response
      const originalJson = res.json.bind(res);

      res.json = function (data: any) {
        // Cache successful responses only
        if (res.statusCode >= 200 && res.statusCode < 300) {
          cacheService
            .set(cacheKey, data, { ttl, compressed: compress })
            .catch((err) => {
              logger.error('Error caching response', { error: err });
            });

          res.set('X-Cache', 'MISS');
        }

        return originalJson(data);
      };

      next();
    } catch (error) {
      logger.error('Cache middleware error', {
        error: error instanceof Error ? error.message : String(error),
      });

      // Don't block request on cache errors
      next();
    }
  };
}

/**
 * Middleware to disable cache for specific routes
 */
export function cacheDisabled(): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    req.cacheDisabled = true;
    next();
  };
}

/**
 * Middleware to set custom cache TTL
 */
export function setCacheTTL(ttl: number): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    req.cacheOptions = { ...(req.cacheOptions || {}), ttl };
    next();
  };
}

/**
 * Middleware to set custom cache key
 */
export function setCacheKey(keyGenerator: (req: Request) => string): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    req.cacheKey = keyGenerator(req);
    next();
  };
}

/**
 * Cache decorator for specific route handlers
 * Usage: app.get('/api/users/:id', cacheRoute(600), userController.getUser)
 */
export function cacheRoute(
  ttl: number = 3600,
  keyGenerator?: (req: Request) => string
): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (req.method !== 'GET' || req.skipCache || req.cacheDisabled) {
        return next();
      }

      const cacheKey =
        keyGenerator?.(req) ||
        `v1:route:${req.path}:${Object.values(req.params).join(':')}`;

      // Try cache first
      const cached = await cacheService.get(cacheKey);

      if (cached.hit && cached.data) {
        logger.debug('Route cache hit', { path: req.path });
        res.set('X-Cache', 'HIT');
        return res.json(cached.data);
      }

      // Intercept response
      const originalJson = res.json.bind(res);

      res.json = function (data: any) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          cacheService.set(cacheKey, data, { ttl }).catch((err) => {
            logger.error('Error caching route response', { error: err });
          });

          res.set('X-Cache', 'MISS');
        }

        return originalJson(data);
      };

      next();
    } catch (error) {
      logger.error('Route cache middleware error', {
        error: error instanceof Error ? error.message : String(error),
      });

      next();
    }
  };
}

/**
 * Manual cache invalidation helper
 * Can be called in route handlers after data updates
 */
export async function invalidateCache(pattern: string): Promise<void> {
  try {
    const deletedCount = await cacheService.deletePattern(pattern);
    logger.info('Cache invalidated', { pattern, deletedCount });
  } catch (error) {
    logger.error('Error invalidating cache', {
      pattern,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Get cache stats middleware
 * Useful for monitoring and debugging
 */
export function cachingStats(): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    const stats = cacheService.getMetrics();
    res.set('X-Cache-Stats', JSON.stringify(stats));
    next();
  };
}

/**
 * Cache response by condition
 * Useful for conditional caching based on response data
 */
export function conditionalCacheResponse(
  shouldCache: (data: any) => boolean,
  ttl: number = 3600
): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (req.method !== 'GET' || req.skipCache) {
      return next();
    }

    const cacheKey =
      req.cacheKey ||
      `v1:http:${req.method}:${req.path}:${JSON.stringify(req.query)}`;

    const cached = await cacheService.get(cacheKey);

    if (cached.hit && cached.data) {
      res.set('X-Cache', 'HIT');
      return res.json(cached.data);
    }

    const originalJson = res.json.bind(res);

    res.json = function (data: any) {
      if (
        res.statusCode >= 200 &&
        res.statusCode < 300 &&
        shouldCache(data)
      ) {
        cacheService.set(cacheKey, data, { ttl }).catch((err) => {
          logger.error('Error conditional caching', { error: err });
        });

        res.set('X-Cache', 'MISS');
      }

      return originalJson(data);
    };

    next();
  };
}

/**
 * Cache list responses with pagination awareness
 */
export function cacheListResponse(ttl: number = 300): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (req.method !== 'GET' || req.skipCache) {
      return next();
    }

    const page = req.query.page || 1;
    const limit = req.query.limit || 10;
    const cacheKey = `v1:list:${req.path}:page:${page}:limit:${limit}:${Object.entries(
      req.query
    )
      .filter(([key]) => key !== 'page' && key !== 'limit')
      .map(([key, value]) => `${key}:${value}`)
      .join(':')}`;

    const cached = await cacheService.get(cacheKey);

    if (cached.hit && cached.data) {
      res.set('X-Cache', 'HIT');
      return res.json(cached.data);
    }

    const originalJson = res.json.bind(res);

    res.json = function (data: any) {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        cacheService.set(cacheKey, data, { ttl }).catch((err) => {
          logger.error('Error caching list response', { error: err });
        });

        res.set('X-Cache', 'MISS');
      }

      return originalJson(data);
    };

    next();
  };
}

export default createCacheMiddleware;
