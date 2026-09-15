import mongoose from "mongoose";
import { User } from "../../models/User.js";
import { Product } from "../../models/Product.js";
import { Booking } from "../../models/Booking.js";
import { Payment } from "../../models/Payment.js";
import { Report, AuditLog } from "../../models/Moderation.js";

const normalizeId = (value) => {
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (value && typeof value === "object") {
    if (typeof value.$oid === "string") return value.$oid;
    if (typeof value.toString === "function") {
      const stringValue = value.toString();
      if (stringValue !== "[object Object]") return stringValue;
    }
  }
  return "";
};

const normalizeUser = (user) => ({
  ...user,
  id: normalizeId(user?.id ?? user?._id),
  _id: undefined,
});

const buildUserIdFilter = (value) => {
  const id = normalizeId(value);
  if (!id) return null;
  if (mongoose.isValidObjectId(id)) {
    return { $or: [{ _id: id }, { _id: new mongoose.Types.ObjectId(id) }] };
  }
  return { _id: id };
};

export class AdminRepository {
  async getDashboardAnalytics() {
    const [
      totalUsersCount,
      totalSellersCount,
      totalProductsCount,
      activeRentalsCount,
      totalRevenueResult,
      pendingDisputesCount,
      recentBookings,
      recentActivity,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: "seller" }),
      Product.countDocuments({ status: "active" }),
      Booking.countDocuments({ status: "active" }),
      Payment.aggregate([
        { $match: { status: "completed" } },
        { $group: { _id: null, total: { $sum: { $toDecimal: "$amount" } } } },
      ]),
      Booking.countDocuments({ status: "disputed" }),
      Booking.find()
        .sort({ createdAt: -1 })
        .limit(10)
        .populate("customer", "id name email")
        .populate("seller", "id name email")
        .lean({ virtuals: true }),
      AuditLog.find()
        .sort({ createdAt: -1 })
        .limit(10)
        .populate("userId", "id name")
        .lean({ virtuals: true }),
    ]);

    return {
      metrics: {
        totalUsers: totalUsersCount,
        totalSellers: totalSellersCount,
        totalProducts: totalProductsCount,
        activeRentals: activeRentalsCount,
        totalRevenue: Number(totalRevenueResult[0]?.total ?? 0),
        pendingDisputes: pendingDisputesCount,
      },
      recentBookings,
      recentActivity,
    };
  }

  async getAllUsers(limit = 50, offset = 0) {
    const users = await User.find()
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .lean({ virtuals: true });
    return users.map(normalizeUser);
  }

  async getAllSellers() {
    const sellers = await User.find({ role: "seller" })
      .sort({ createdAt: -1 })
      .lean({ virtuals: true });
    return sellers.map(normalizeUser);
  }

  async updateUserStatus(userId, status) {
    const filter = buildUserIdFilter(userId);
    if (!filter) return null;
    return User.findOneAndUpdate(
      filter,
      { $set: { status } },
      { new: true, runValidators: true }
    ).lean({ virtuals: true });
  }

  async updateSellerStatus(userId, status) {
    const filter = buildUserIdFilter(userId);
    if (!filter) return null;
    return User.findOneAndUpdate(
      { ...filter, role: "seller" },
      { $set: { "sellerProfile.status": status } },
      { new: true, runValidators: true }
    ).lean({ virtuals: true });
  }

  async logAdminAction(data) {
    const log = await AuditLog.create({
      userId: normalizeId(data.adminId),
      action: data.actionType,
      entityType: data.actionType.includes("user")
        ? "user"
        : data.actionType.includes("seller")
        ? "user"
        : data.actionType.includes("product")
        ? "product"
        : "booking",
      entityId: normalizeId(data.targetUserId || data.targetProductId || data.targetBookingId),
      details: { reason: data.reason },
    });
    return log.toJSON();
  }

  async getReports() {
    return Report.find()
      .sort({ createdAt: -1 })
      .populate("reporterId", "id name email")
      .lean({ virtuals: true });
  }

  async getDisputes() {
    return Booking.find({ status: "disputed" })
      .sort({ createdAt: -1 })
      .populate("customer", "id name email")
      .populate("bookingItems.product")
      .lean({ virtuals: true });
  }
}

export const adminRepository = new AdminRepository();
