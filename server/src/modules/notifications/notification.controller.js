import { notificationService } from "./notification.service.js";
import { sendSuccess } from "../../utils/response.js";

export class NotificationController {
  async getNotifications(req, res, next) {
    try {
      const data = await notificationService.getUserNotifications(req.user.id);
      sendSuccess(res, data);
    } catch (error) {
      next(error);
    }
  }

  async markAsRead(req, res, next) {
    try {
      const updated = await notificationService.markAsRead(req.params.id, req.user.id);
      sendSuccess(res, updated, "Notification marked as read");
    } catch (error) {
      next(error);
    }
  }

  async markAllAsRead(req, res, next) {
    try {
      await notificationService.markAllAsRead(req.user.id);
      sendSuccess(res, null, "All notifications marked as read");
    } catch (error) {
      next(error);
    }
  }
}

export const notificationController = new NotificationController();
