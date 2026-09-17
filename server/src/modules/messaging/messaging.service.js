import { messagingRepository } from "./messaging.repository.js";
import { User } from "../../models/User.js";
import { Product } from "../../models/Product.js";
import { NotFoundError, ForbiddenError } from "../../middleware/errorHandler.js";
import { v4 as uuidv4 } from "uuid";

const normalizeRole = (user) => {
  if (user?.role === "admin") return "admin";
  if (user?.role === "seller") return "seller";
  if (user?.role === "customer") return "customer";
  if (user?.sellerProfile?.status === "approved" || user?.sellerProfile?.isVerified) return "seller";
  return "customer";
};

const normalizeStatus = (user) => user?.status || "active";

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
    const [sender, recipient, product] = await Promise.all([
      User.findById(senderId).select("_id role status sellerProfile").lean(),
      User.findById(recipientId).select("_id role status sellerProfile").lean(),
      productId ? Product.findById(productId).select("_id sellerId status").lean() : null,
    ]);

    if (!sender || !recipient) throw new NotFoundError("User");

    const senderStatus = normalizeStatus(sender);
    const recipientStatus = normalizeStatus(recipient);
    if (senderStatus !== "active" || recipientStatus !== "active") {
      throw new ForbiddenError("Messaging is unavailable for this account");
    }

    const senderRole = normalizeRole(sender);
    const recipientRole = normalizeRole(recipient);

    if (senderRole === "admin" || recipientRole === "admin") {
      throw new ForbiddenError("Messaging is available only between customers and sellers");
    }

    if (senderRole !== "customer" || recipientRole !== "seller") {
      throw new ForbiddenError("A conversation must be between a customer and a seller");
    }

    if (productId) {
      if (!product || product.status !== "active") {
        throw new NotFoundError("Product");
      }
      if (String(product.sellerId) !== String(recipient._id)) {
        throw new ForbiddenError("The selected recipient is not the seller of this product");
      }
    }

    const customerId = String(sender._id);
    const sellerId = String(recipient._id);

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
