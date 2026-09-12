import { messagingRepository } from "./messaging.repository.js";
import { NotFoundError, ForbiddenError } from "../../middleware/errorHandler.js";
import { v4 as uuidv4 } from "uuid";

export class MessagingService {
  async getUserConversations(userId) {
    return messagingRepository.findUserConversations(userId);
  }

  async getConversationMessages(userId, conversationId) {
    const conversation = await messagingRepository.findConversationById(conversationId);
    if (!conversation) throw new NotFoundError("Conversation");
    if (conversation.customerId !== userId && conversation.sellerId !== userId) {
      throw new ForbiddenError();
    }

    await messagingRepository.markAsRead(conversationId, userId);
    const messageList = await messagingRepository.findMessages(conversationId);
    return {
      conversation,
      messages: messageList.reverse(), // Chronological order
    };
  }

  async sendMessage(senderId, input) {
    let conversationId = input.conversationId;
    if (!conversationId) {
      const existing = await messagingRepository.findBetweenUsers(
        senderId,
        input.recipientId,
        input.productId
      );
      if (existing) {
        conversationId = existing.id;
      } else {
        const newConv = await messagingRepository.createConversation({
          _id: uuidv4(),
          customerId: senderId,
          sellerId: input.recipientId,
          productId: input.productId,
          bookingId: input.bookingId,
          lastMessageAt: new Date(),
        });
        conversationId = newConv.id;
      }
    }

    const message = await messagingRepository.createMessage({
      _id: uuidv4(),
      conversationId,
      senderId,
      content: input.content,
      imageUrl: input.imageUrl,
      isRead: false,
    });

    return {
      conversationId,
      message,
    };
  }

  async startConversation(userId, input) {
    return this.sendMessage(userId, {
      recipientId: input.recipientId,
      productId: input.productId,
      bookingId: input.bookingId,
      content: input.initialMessage,
    });
  }
}

export const messagingService = new MessagingService();
