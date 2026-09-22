import { Server } from "socket.io";
import { env } from "../config/env.js";
import { auth } from "../config/auth.js";
import { logger } from "../utils/logger.js";
import { messagingService } from "../modules/messaging/messaging.service.js";
import { getAccountStatus } from "../middleware/accountStatus.js";
import { notificationService } from "../modules/notifications/notification.service.js";
import { setSocketIO, emitToUser, emitProductAvailabilityChanged } from "./emitter.js";

export { emitToUser, emitProductAvailabilityChanged } from "./emitter.js";

const socketOrigins =
  env.NODE_ENV === "production"
    ? [env.CLIENT_URL]
    : Array.from(
        new Set([env.CLIENT_URL, "http://localhost:3000", "http://localhost:5173"])
      );

const assertSocketAccountActive = async (userId) => {
  const status = await getAccountStatus(userId);
  if (!status) throw new Error("Account not found");
  if (status === "suspended") throw new Error("Account is suspended");
};


export function initSocketIO(httpServer) {
  const ioInstance = new Server(httpServer, {
    cors: {
      origin: socketOrigins,
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  setSocketIO(ioInstance);

  ioInstance.use(async (socket, next) => {
    try {
      const session = await auth.api.getSession({ headers: socket.handshake.headers });
      if (!session?.user?.id) {
        next(new Error("Authentication required"));
        return;
      }

      const userId = String(session.user.id);
      await assertSocketAccountActive(userId);
      socket.userId = userId;
      next();
    } catch (error) {
      logger.warn({ error }, "Rejected unauthenticated or suspended WebSocket connection");
      next(
        new Error(
          error?.message === "Account is suspended"
            ? "Account suspended"
            : "Authentication failed"
        )
      );
    }
  });

  ioInstance.on("connection", (socket) => {
    socket.join(`user:${socket.userId}`);
    logger.info({ userId: socket.userId }, "User connected to WebSocket");

    socket.on("join_product", async (productId, callback) => {
      if (!productId) return;
      try {
        await assertSocketAccountActive(socket.userId);
        await socket.join(`product:${String(productId)}`);
        if (typeof callback === "function") callback({ ok: true });
      } catch (err) {
        logger.warn({ err, userId: socket.userId, productId }, "Rejected product room join");
        if (typeof callback === "function") callback({ ok: false, message: "Access denied" });
      }
    });

    socket.on("leave_product", (productId) => {
      if (productId) socket.leave(`product:${String(productId)}`);
    });

    socket.on("join_conversation", async (conversationId, callback) => {
      try {
        await assertSocketAccountActive(socket.userId);
        await messagingService.assertConversationParticipant(socket.userId, conversationId);
        await socket.join(`conversation:${conversationId}`);
        if (typeof callback === "function") callback({ ok: true });
      } catch (err) {
        logger.warn(
          { err, userId: socket.userId, conversationId },
          "Rejected conversation room join"
        );
        if (typeof callback === "function") callback({ ok: false, message: "Access denied" });
      }
    });

    socket.on("leave_conversation", (conversationId) => {
      socket.leave(`conversation:${conversationId}`);
    });

    socket.on("send_message", async (data, callback) => {
      try {
        await assertSocketAccountActive(socket.userId);
        const result = await messagingService.sendMessage(socket.userId, data);
        ioInstance
          .to(`conversation:${result.conversationId}`)
          .emit("new_message", result.message);

        if (result.recipientId) {
          ioInstance.to(`user:${result.recipientId}`).emit("message_notification", {
            conversationId: result.conversationId,
            message: result.message,
          });

          try {
            await notificationService.notifyUser(result.recipientId, {
              type: "new_message",
              title: "New message",
              message: result.message.content?.length > 120
                ? result.message.content.slice(0, 117) + "..."
                : result.message.content || "You received a new message.",
              actionUrl: `/messages?conversation=${encodeURIComponent(result.conversationId)}`,
            });
          } catch (notificationError) {
            logger.warn(
              { error: notificationError, recipientId: result.recipientId, conversationId: result.conversationId },
              "Failed to persist message notification"
            );
          }
        }

        if (typeof callback === "function") {
          callback({ ok: true, conversationId: result.conversationId });
        }
      } catch (err) {
        logger.error({ err, userId: socket.userId }, "Error delivering real-time message");
        if (typeof callback === "function") {
          callback({ ok: false, message: "Unable to send message" });
        }
      }
    });

    socket.on("typing", async (data) => {
      if (!data?.conversationId) return;
      try {
        await assertSocketAccountActive(socket.userId);
        await messagingService.assertConversationParticipant(
          socket.userId,
          data.conversationId
        );
        socket.to(`conversation:${data.conversationId}`).emit("user_typing", {
          userId: socket.userId,
          isTyping: Boolean(data.isTyping),
        });
      } catch {
      }
    });

    socket.on("disconnect", () => {
      logger.debug({ userId: socket.userId }, "User disconnected from WebSocket");
    });
  });

  return ioInstance;
}
