import Redis from "ioredis";
import { env } from "./env.js";
import { logger } from "../utils/logger.js";

let redisClient = null;

export function getRedisClient() {
  if (!redisClient) {
    redisClient = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      enableReadyCheck: true,
    });

    redisClient.on("connect", () => {
      logger.info("Redis connected");
    });

    redisClient.on("error", (err) => {
      logger.error({ err }, "Redis connection error");
    });

    redisClient.on("close", () => {
      logger.warn("Redis connection closed");
    });
  }
  return redisClient;
}

export async function connectRedis() {
  try {
    const client = getRedisClient();
    await client.connect();
  } catch (err) {
    logger.warn("Redis connection failed (optional in development):", err.message);
  }
}

export async function disconnectRedis() {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    logger.info("Redis disconnected");
  }
}

export const CacheKeys = {
  product: (id) => `product:${id}`,
  productList: (params) => `products:list:${params}`,
  category: (id) => `category:${id}`,
  categoryList: () => "categories:list",
  sellerProfile: (id) => `seller:${id}`,
  bookingLock: (productId, startDate, endDate) => `booking_lock:${productId}:${startDate}:${endDate}`,
  rateLimitKey: (ip) => `rate_limit:${ip}`,
};

export const CacheTTL = {
  product: 300,       // 5 minutes
  productList: 120,   // 2 minutes
  category: 3600,     // 1 hour
  categoryList: 3600, // 1 hour
  seller: 300,        // 5 minutes
};
