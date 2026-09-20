import http from "http";
import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { connectDatabase, disconnectDatabase } from "./config/database.js";
import { connectRedis } from "./config/redis.js";
import { authClient } from "./config/auth.js";
import { migrateLegacyCredentials } from "./config/authMigration.js";
import { initSocketIO } from "./sockets/index.js";
import { bookingService } from "./modules/bookings/booking.service.js";
import { bookingInventoryRepository } from "./modules/bookings/booking.inventory.repository.js";
import { logger } from "./utils/logger.js";

async function startServer() {
  let expirySweep;

  try {
    await connectDatabase();
    await migrateLegacyCredentials();
    const backfilled = await bookingService.backfillPendingExpiry();
    if (backfilled > 0) {
      logger.info({ count: backfilled }, "Backfilled expiry times for legacy pending bookings");
    }
    await bookingService.expirePendingBookings();
    const ledgerBackfilled = await bookingInventoryRepository.reconcileFromBookings();
    if (ledgerBackfilled > 0) {
      logger.info({ count: ledgerBackfilled }, "Backfilled booking inventory ledger from existing live bookings");
    }
    await connectRedis();

    const app = createApp();
    const server = http.createServer(app);
    initSocketIO(server);

    expirySweep = setInterval(() => {
      bookingService.expirePendingBookings().catch((error) => {
        logger.error({ error }, "Pending booking expiry sweep failed");
      });
    }, 60_000);

    server.listen(env.PORT, () => {
      logger.info(`RentHub API server listening on http://localhost:${env.PORT}`);
      logger.info(`Environment: ${env.NODE_ENV}`);
      logger.info(`Client URL: ${env.CLIENT_URL}`);
      logger.info(
        `Pending booking payment hold: ${env.PENDING_BOOKING_TTL_MINUTES} minute(s)`
      );
    });

    const shutdown = async (signal) => {
      logger.info(`Received ${signal}, shutting down gracefully...`);
      if (expirySweep) clearInterval(expirySweep);

      server.close(async () => {
        logger.info("HTTP server closed.");
        await Promise.allSettled([authClient.close(), disconnectDatabase()]);
        process.exit(0);
      });
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
  } catch (error) {
    if (expirySweep) clearInterval(expirySweep);
    logger.error({ error }, "Failed to start server");
    process.exit(1);
  }
}

startServer();
