import rateLimit from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import { env } from "../config/env.js";
import { getRedisClient } from "../config/redis.js";

function createStore(prefix) {
  if (!env.REDIS_ENABLED) return undefined;

  const redis = getRedisClient();
  if (!redis) return undefined;

  return new RedisStore({
    sendCommand: (...args) => redis.call(...args),
    prefix,
  });
}

const standardOptions = {
  standardHeaders: "draft-7",
  legacyHeaders: false,
  passOnStoreError: true,
};

export const apiRateLimiter = rateLimit({
  ...standardOptions,
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  limit: env.RATE_LIMIT_MAX,
  store: createStore("renthub:rate-limit:api:"),
  skip: (req) => {
    const path = req.path || "";
    const isSessionBootstrap =
      req.method === "GET" &&
      ["/users/me", "/api/users/me", "/api/v1/users/me"].includes(path);

    return (
      isSessionBootstrap ||
      path === "/health" ||
      path === "/favicon.ico" ||
      path.startsWith("/uploads") ||
      path.startsWith("/api/auth") ||
      path.startsWith("/api/v1/auth") ||
      path.startsWith("/api/v1/api/auth") ||
      path.startsWith("/auth")
    );
  },
});

export const authRateLimiter = rateLimit({
  ...standardOptions,
  windowMs: 15 * 60 * 1000,
  limit: 20,
  store: createStore("renthub:rate-limit:auth:"),
});
