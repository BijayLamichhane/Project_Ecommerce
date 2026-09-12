import { messagingService } from "./messaging.service.js";
import { sendSuccess, sendCreated } from "../../utils/response.js";

export class MessagingController {
  async getConversations(req, res, next) {
    try {
      const conversations = await messagingService.getUserConversations(req.user.id);
      sendSuccess(res, conversations);
    } catch (error) {
      next(error);
    }
  }

  async getMessages(req, res, next) {
    try {
      const result = await messagingService.getConversationMessages(
        req.user.id,
        req.params.conversationId
      );
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  async sendMessage(req, res, next) {
    try {
      const result = await messagingService.sendMessage(req.user.id, req.body);
      sendCreated(res, result, "Message sent");
    } catch (error) {
      next(error);
    }
  }

  async startConversation(req, res, next) {
    try {
      const result = await messagingService.startConversation(req.user.id, req.body);
      sendCreated(res, result, "Conversation started");
    } catch (error) {
      next(error);
    }
  }
}

export const messagingController = new MessagingController();
