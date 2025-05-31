import Redis from "ioredis";
import { logger } from "../utils/logger";

let redisClient: Redis;

export const initRedis = (): void => {
  try {
    const redisUrl = process.env.REDIS_URI || "redis://127.0.0.1:6379";
    
    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 5,
      enableReadyCheck: true,
      connectTimeout: 10000,
      // Configurações para melhor gerenciamento de memória
      // Não usar keyPrefix aqui, pois causa conflito com BullMQ
      // Configurações para melhor desempenho
      enableOfflineQueue: true,
      // Configurações para melhor resiliência
      retryStrategy: (times) => {
        const delay = Math.min(times * 200, 5000);
        return delay;
      }
    });

    redisClient.on("connect", () => {
      logger.info("Redis client connected");
    });

    redisClient.on("error", (err) => {
      logger.error("Redis client error:", err);
    });

    // Configurar limites de memória via comandos
    redisClient.config("SET", "maxmemory", "8gb");
    redisClient.config("SET", "maxmemory-policy", "allkeys-lru");
    
  } catch (e) {
    logger.error("Redis initialization error:", e);
    throw e;
  }
};

export const getRedis = (): Redis => {
  if (!redisClient) {
    initRedis();
  }
  return redisClient;
};

export const closeRedis = async (): Promise<void> => {
  if (redisClient) {
    await redisClient.quit();
  }
};
