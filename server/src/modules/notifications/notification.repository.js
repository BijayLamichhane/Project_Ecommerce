import { Notification } from "../../models/Notification.js";

export class NotificationRepository {
  async findByUserId(userId, limit = 50) {
    return Notification.find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean({ virtuals: true });
  }

  async getUnreadCount(userId) {
    return Notification.countDocuments({ userId, isRead: false });
  }

  async create(data) {
    const notif = await Notification.create(data);
    return notif.toJSON();
  }

  async markAsRead(id, userId) {
    return Notification.findOneAndUpdate(
      { _id: id, userId },
      { $set: { isRead: true } },
      { new: true }
    ).lean({ virtuals: true });
  }

  async markAllAsRead(userId) {
    await Notification.updateMany(
      { userId, isRead: false },
      { $set: { isRead: true } }
    );
  }
}

export const notificationRepository = new NotificationRepository();
