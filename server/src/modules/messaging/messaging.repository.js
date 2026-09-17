import { Conversation, Message } from "../../models/Messaging.js";

export class MessagingRepository {
  async findUserConversations(userId) {
    const conversations = await Conversation.find({
      $or: [{ customerId: userId }, { sellerId: userId }],
    })
      .populate("customer", "id name avatarUrl role")
      .populate("seller", "id name avatarUrl role")
      .populate({ path: "product", model: "Product", select: "id name slug images" })
      .sort({ lastMessageAt: -1 })
      .lean({ virtuals: true });

    // Attach latest message to each conversation
    for (const conv of conversations) {
      const lastMessage = await Message.findOne({ conversationId: conv.id })
        .sort({ createdAt: -1 })
        .lean({ virtuals: true });
      conv.messages = lastMessage ? [lastMessage] : [];
    }

    return conversations;
  }

  async findConversationById(conversationId) {
    return Conversation.findById(conversationId)
      .populate("customer", "id name avatarUrl")
      .populate("seller", "id name avatarUrl")
      .populate({ path: "product", model: "Product", select: "id name slug images pricing" })
      .lean({ virtuals: true });
  }

  async findBetweenUsers(userA, userB, productId) {
    const filter = {
      $or: [
        { customerId: userA, sellerId: userB },
        { customerId: userB, sellerId: userA },
      ],
    };
    if (productId) filter.productId = productId;
    return Conversation.findOne(filter).lean({ virtuals: true });
  }

  async createConversation(data) {
    const conv = await Conversation.create(data);
    return conv.toJSON();
  }

  async findMessages(conversationId, limit = 50) {
    return Message.find({ conversationId })
      .populate("sender", "id name avatarUrl")
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean({ virtuals: true });
  }

  async createMessage(data) {
    const message = await Message.create(data);
    await Conversation.findByIdAndUpdate(data.conversationId, {
      lastMessageAt: new Date(),
    });
    return message.toJSON();
  }

  async markAsRead(conversationId, recipientId) {
    await Message.updateMany(
      {
        conversationId,
        isRead: false,
        senderId: { $ne: recipientId },
      },
      { isRead: true }
    );
  }
}

export const messagingRepository = new MessagingRepository();
