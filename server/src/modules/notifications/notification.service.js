import { User } from "../../models/User.js";
import { emitToUser } from "../../sockets/index.js";
import { notificationRepository } from "./notification.repository.js";

export class NotificationService {
  async getUserNotifications(userId) {
    const [items, unreadCount] = await Promise.all([
      notificationRepository.findByUserId(userId),
      notificationRepository.getUnreadCount(userId),
    ]);
    return { items, unreadCount };
  }

  async createNotification(data, { emit = true } = {}) {
    const notification = await notificationRepository.create({
      userId: String(data.userId),
      type: data.type,
      title: data.title,
      message: data.message,
      actionUrl: data.actionUrl,
      isRead: false,
    });

    if (emit) {
      emitToUser(String(data.userId), "notification_created", notification);
    }

    return notification;
  }

  async notifyUser(userId, data) {
    return this.createNotification({ ...data, userId });
  }

  async notifyAdmins(data) {
    const admins = await User.find({ role: "admin", status: { $ne: "suspended" } })
      .select("_id")
      .lean();

    return Promise.all(
      admins.map((admin) =>
        this.createNotification(
          { ...data, userId: String(admin._id) },
          { emit: true }
        )
      )
    );
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
