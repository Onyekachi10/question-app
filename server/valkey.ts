import { Redis } from "ioredis";


let valkeyHost = process.env.VALKEY_HOST?.replace(/^"|"$/g, '') || '127.0.0.1';
if (valkeyHost === 'valkey' && !process.env.IS_DOCKER) {
  valkeyHost = '127.0.0.1';
}
const valkeyPort = Number(process.env.VALKEY_PORT || 6379);
const valkeyPassword = process.env.VALKEY_PASSWORD?.replace(/^"|"$/g, '');

// Shared Valkey client for caching, rate-limiting, and general commands.
//
// This client must fail fast, not queue. Every caller (rate limiter, cache,
// Live Tracking locations) already wraps its calls in try/catch and degrades
// gracefully, but ioredis buffers commands indefinitely while disconnected by
// default, so those handlers never ran: a Valkey outage left every API request
// hanging forever instead of falling through. enableOfflineQueue:false plus a
// bounded retry/timeout makes the existing fail-open paths actually reachable.
export const valkey = new Redis({
  host: valkeyHost,
  port: valkeyPort,
  password: valkeyPassword || undefined,
  enableOfflineQueue: false,
  maxRetriesPerRequest: 2,
  commandTimeout: 2000,
  retryStrategy(times: number) {
    return Math.min(times * 200, 2000);
  }
});

valkey.on('connect', () => console.log(`Connected to Valkey Redis at ${valkeyHost}:${valkeyPort}`));
valkey.on('error', (err: any) => console.error('Valkey Redis error:', err));

valkey.defineCommand("checkRateLimit", {
  numberOfKeys: 1,
  lua: `
    local current = redis.call("INCR", KEYS[1])
    if tonumber(current) == 1 then
      redis.call("EXPIRE", KEYS[1], ARGV[1])
    end
    local ttl = redis.call("TTL", KEYS[1])
    return {current, ttl}
  `,
});


