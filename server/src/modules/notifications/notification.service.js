import { notificationRepository } from "./notification.repository.js";

export class NotificationService {
  async getUserNotifications(userId) {
    const [items, unreadCount] = await Promise.all([
      notificationRepository.findByUserId(userId),
      notificationRepository.getUnreadCount(userId),
    ]);
    return {
      items,
      unreadCount,
    };
  }

  async createNotification(data) {
    return notificationRepository.create({
      userId: data.userId,
      type: data.type,
      title: data.title,
      message: data.message,
      actionUrl: data.actionUrl,
      isRead: false,
    });
  }

  async markAsRead(id, userId) {
    return notificationRepository.markAsRead(id, userId);
  }

  async markAllAsRead(userId) {
    await notificationRepository.markAllAsRead(userId);
    return { success: true };
  }
}

export const notificationService = new NotificationService();
