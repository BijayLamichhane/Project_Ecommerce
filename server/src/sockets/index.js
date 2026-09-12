import { Server } from "socket.io";
import { env } from "../config/env.js";
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

  io.use((socket, next) => {
    const userId = socket.handshake.auth?.userId || socket.handshake.query?.userId;
    if (userId && typeof userId === "string") {
      socket.userId = userId;
    }
    next();
  });

  io.on("connection", (socket) => {
    if (socket.userId) {
      socket.join(`user:${socket.userId}`);
      logger.info({ userId: socket.userId }, "User connected to WebSocket");
    }

    socket.on("join_conversation", (conversationId) => {
      socket.join(`conversation:${conversationId}`);
    });

    socket.on("leave_conversation", (conversationId) => {
      socket.leave(`conversation:${conversationId}`);
    });

    socket.on("send_message", async (data) => {
      if (!socket.userId) return;
      try {
        const result = await messagingService.sendMessage(socket.userId, data);
        io.to(`conversation:${result.conversationId}`).emit("new_message", result.message);
        io.to(`user:${data.recipientId}`).emit("message_notification", {
          conversationId: result.conversationId,
          message: result.message,
        });
      } catch (err) {
        logger.error({ err }, "Error delivering real-time message");
      }
    });

    socket.on("typing", (data) => {
      if (!socket.userId) return;
      socket.to(`conversation:${data.conversationId}`).emit("user_typing", {
        userId: socket.userId,
        isTyping: data.isTyping,
      });
    });

    socket.on("disconnect", () => {
      if (socket.userId) {
        logger.debug({ userId: socket.userId }, "User disconnected from WebSocket");
      }
    });
  });

  return io;
}
