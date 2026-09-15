import http from "http";
import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { connectDatabase } from "./config/database.js";
import { connectRedis } from "./config/redis.js";
import { migrateLegacyCredentials } from "./config/authMigration.js";
import { initSocketIO } from "./sockets/index.js";
import { logger } from "./utils/logger.js";

async function startServer() {
  try {
    await connectDatabase();
    await migrateLegacyCredentials();
    await connectRedis();
    const app = createApp();
    const server = http.createServer(app);
    initSocketIO(server);
    server.listen(env.PORT, () => {
      logger.info(`RentHub API server listening on http://localhost:${env.PORT}`);
      logger.info(`Environment: ${env.NODE_ENV}`);
      logger.info(`Client URL: ${env.CLIENT_URL}`);
    });

    const shutdown = async (signal) => {
      logger.info(`Received ${signal}, shutting down gracefully...`);
      server.close(() => {
        logger.info("HTTP server closed.");
        process.exit(0);
      });
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
  } catch (error) {
    logger.error({ error }, "Failed to start server");
    process.exit(1);
  }
}

startServer();
