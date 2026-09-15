import { Server } from "socket.io";
import { env } from "../config/env.js";
import { auth } from "../config/auth.js";
import { logger } from "../utils/logger.js";
import { messagingService } from "../modules/messaging/messaging.service.js";

export function initSocketIO(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: [env.CLIENT_URL],
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  io.use(async (socket, next) => {
    try {
      const session = await auth.api.getSession({
        headers: socket.handshake.headers,
      });

      if (!session?.user?.id) {
        next(new Error("Authentication required"));
        return;
      }

      socket.userId = String(session.user.id);
      next();
    } catch (error) {
      logger.warn({ error }, "Rejected unauthenticated WebSocket connection");
      next(new Error("Authentication failed"));
    }
  });

  io.on("connection", (socket) => {
    socket.join(`user:${socket.userId}`);
    logger.info({ userId: socket.userId }, "User connected to WebSocket");

    socket.on("join_conversation", async (conversationId, callback) => {
      try {
        await messagingService.assertConversationParticipant(socket.userId, conversationId);
        await socket.join(`conversation:${conversationId}`);
        if (typeof callback === "function") callback({ ok: true });
      } catch (err) {
        logger.warn({ err, userId: socket.userId, conversationId }, "Rejected conversation room join");
        if (typeof callback === "function") callback({ ok: false, message: "Access denied" });
      }
    });

    socket.on("leave_conversation", (conversationId) => {
      socket.leave(`conversation:${conversationId}`);
    });

    socket.on("send_message", async (data, callback) => {
      try {
        const result = await messagingService.sendMessage(socket.userId, data);
        io.to(`conversation:${result.conversationId}`).emit("new_message", result.message);

        if (result.message?.senderId && data?.recipientId) {
          io.to(`user:${data.recipientId}`).emit("message_notification", {
            conversationId: result.conversationId,
            message: result.message,
          });
        }

        if (typeof callback === "function") callback({ ok: true, conversationId: result.conversationId });
      } catch (err) {
        logger.error({ err, userId: socket.userId }, "Error delivering real-time message");
        if (typeof callback === "function") callback({ ok: false, message: "Unable to send message" });
      }
    });

    socket.on("typing", async (data) => {
      if (!data?.conversationId) return;
      try {
        await messagingService.assertConversationParticipant(socket.userId, data.conversationId);
        socket.to(`conversation:${data.conversationId}`).emit("user_typing", {
          userId: socket.userId,
          isTyping: Boolean(data.isTyping),
        });
      } catch {
        // Ignore unauthorized typing events.
      }
    });

    socket.on("disconnect", () => {
      logger.debug({ userId: socket.userId }, "User disconnected from WebSocket");
    });
  });

  return io;
}
