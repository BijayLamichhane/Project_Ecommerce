import { messagingRepository } from "./messaging.repository.js";
import { User } from "../../models/User.js";
import { NotFoundError, ForbiddenError } from "../../middleware/errorHandler.js";
import { v4 as uuidv4 } from "uuid";

export class MessagingService {
  async getUserConversations(userId) {
    return messagingRepository.findUserConversations(userId);
  }

  async assertConversationParticipant(userId, conversationId) {
    const conversation = await messagingRepository.findConversationById(conversationId);
    if (!conversation) throw new NotFoundError("Conversation");
    if (String(conversation.customerId) !== String(userId) && String(conversation.sellerId) !== String(userId)) {
      throw new ForbiddenError();
    }
    return conversation;
  }

  async getConversationMessages(userId, conversationId) {
    const conversation = await this.assertConversationParticipant(userId, conversationId);
    await messagingRepository.markAsRead(conversationId, userId);
    const messageList = await messagingRepository.findMessages(conversationId);
    return { conversation, messages: messageList.reverse() };
  }

  async createConversation(senderId, recipientId, productId, bookingId) {
    const [sender, recipient] = await Promise.all([
      User.findById(senderId).select("_id role status").lean(),
      User.findById(recipientId).select("_id role status").lean(),
    ]);

    if (!sender || !recipient) throw new NotFoundError("User");
    if (sender.status !== "active" || recipient.status !== "active") {
      throw new ForbiddenError("Messaging is unavailable for this account");
    }
    if (sender.role === recipient.role || !["customer", "seller"].includes(sender.role) || !["customer", "seller"].includes(recipient.role)) {
      throw new ForbiddenError("A conversation must be between a customer and a seller");
    }

    const customerId = sender.role === "customer" ? String(sender._id) : String(recipient._id);
    const sellerId = sender.role === "seller" ? String(sender._id) : String(recipient._id);

    return messagingRepository.createConversation({
      _id: uuidv4(),
      customerId,
      sellerId,
      productId,
      bookingId,
      lastMessageAt: new Date(),
    });
  }

  async sendMessage(senderId, input) {
    let conversationId = input.conversationId;

    if (conversationId) {
      const conversation = await this.assertConversationParticipant(senderId, conversationId);
      if (input.recipientId && String(input.recipientId) !== String(conversation.customerId) && String(input.recipientId) !== String(conversation.sellerId)) {
        throw new ForbiddenError();
      }
    } else {
      if (!input.recipientId || String(input.recipientId) === String(senderId)) {
        throw new ForbiddenError();
      }

      const existing = await messagingRepository.findBetweenUsers(senderId, input.recipientId, input.productId);
      if (existing) {
        conversationId = existing.id;
        await this.assertConversationParticipant(senderId, conversationId);
      } else {
        const newConv = await this.createConversation(senderId, input.recipientId, input.productId, input.bookingId);
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

    return { conversationId, message };
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
