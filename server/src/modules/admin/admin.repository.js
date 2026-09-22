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

const OPEN_SELLER_BOOKING_STATUSES = ["pending", "confirmed", "active", "return_requested"];

export class AdminRepository {
  async getDashboardAnalytics() {
    const [
      totalUsersCount,
      totalSellersCount,
      totalProductsCount,
      featuredProductsCount,
      activeRentalsCount,
      totalRevenueResult,
      pendingDisputesCount,
      recentBookings,
      recentActivity,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: "seller" }),
      Product.countDocuments({ status: "active" }),
      Product.countDocuments({ status: "active", isFeatured: true }),
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
        featuredProducts: featuredProductsCount,
        activeRentals: activeRentalsCount,
        totalRevenue: Number(totalRevenueResult[0]?.total ?? 0),
        pendingDisputes: pendingDisputesCount,
      },
      recentBookings,
      recentActivity,
    };
  }

  async getProducts({ q, status = "all", featured = "all", page = 1, limit = 20 } = {}) {
    const filter = {};

    if (q) {
      const escapedQuery = q.replace(/[.*+?^${}()|[\\]\\]/g, (match) => "\\" + match);
      filter.$or = [
        { name: new RegExp(escapedQuery, "i") },
        { brand: new RegExp(escapedQuery, "i") },
        { model: new RegExp(escapedQuery, "i") },
      ];
    }

    if (status !== "all") {
      filter.status = status;
    }

    if (featured === "featured") {
      filter.isFeatured = true;
    } else if (featured === "standard") {
      filter.isFeatured = false;
    }

    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      Product.find(filter)
        .populate("category")
        .populate("seller", "id name email")
        .sort({ isFeatured: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean({ virtuals: true }),
      Product.countDocuments(filter),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
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
    const sellers = await User.find({
      $or: [
        { role: "seller" },
        { "sellerProfile.status": "pending" },
      ],
    })
      .sort({ "sellerProfile.status": 1, createdAt: -1 })
      .lean({ virtuals: true });
    return sellers.map(normalizeUser);
  }

  async getSellerById(userId) {
    const filter = buildUserIdFilter(userId);
    if (!filter) return null;
    return User.findOne({
      $and: [
        filter,
        { $or: [{ role: "seller" }, { "sellerProfile.status": "pending" }] },
      ],
    }).lean({ virtuals: true });
  }

  async countOpenSellerBookings(sellerId) {
    return Booking.countDocuments({
      sellerId: normalizeId(sellerId),
      status: { $in: OPEN_SELLER_BOOKING_STATUSES },
    });
  }

  async approveSellerApplication(userId) {
    const filter = buildUserIdFilter(userId);
    if (!filter) return null;
    return User.findOneAndUpdate(
      {
        $and: [
          filter,
          { role: "customer", "sellerProfile.status": "pending" },
        ],
      },
      {
        $set: {
          role: "seller",
          "sellerProfile.status": "approved",
          "sellerProfile.isVerified": true,
          "sellerProfile.verifiedAt": new Date(),
        },
        $unset: {
          "sellerProfile.rejectionReason": 1,
          "sellerProfile.rejectedAt": 1,
        },
      },
      { new: true, runValidators: true }
    ).lean({ virtuals: true });
  }

  async rejectSellerApplication(userId, reason) {
    const filter = buildUserIdFilter(userId);
    if (!filter) return null;
    return User.findOneAndUpdate(
      {
        $and: [
          filter,
          { role: "customer", "sellerProfile.status": "pending" },
        ],
      },
      {
        $set: {
          "sellerProfile.status": "rejected",
          "sellerProfile.rejectionReason": reason,
          "sellerProfile.rejectedAt": new Date(),
          "sellerProfile.isVerified": false,
        },
        $unset: { "sellerProfile.verifiedAt": 1 },
      },
      { new: true, runValidators: true }
    ).lean({ virtuals: true });
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

  async updateSellerStatus(userId, status, reason) {
    const filter = buildUserIdFilter(userId);
    if (!filter) return null;
    const update = { $set: { "sellerProfile.status": status } };
    if (status === "approved") {
      update.$set["sellerProfile.isVerified"] = true;
      update.$set["sellerProfile.verifiedAt"] = new Date();
      update.$unset = {
        "sellerProfile.rejectionReason": 1,
        "sellerProfile.rejectedAt": 1,
      };
    } else if (status === "rejected") {
      update.$set["sellerProfile.isVerified"] = false;
      update.$set["sellerProfile.rejectionReason"] = reason;
      update.$set["sellerProfile.rejectedAt"] = new Date();
      update.$unset = { "sellerProfile.verifiedAt": 1 };
    }

    return User.findOneAndUpdate(
      { ...filter, role: "seller" },
      update,
      { new: true, runValidators: true }
    ).lean({ virtuals: true });
  }

  async disbandSeller(userId) {
    const filter = buildUserIdFilter(userId);
    if (!filter) return null;

    const updated = await User.findOneAndUpdate(
      { ...filter, role: "seller" },
      {
        $set: {
          role: "customer",
          "sellerProfile.status": "suspended",
          "sellerProfile.isVerified": false,
          "sellerProfile.disbandRequested": false,
          "sellerProfile.disbandedAt": new Date(),
        },
        $unset: { "sellerProfile.disbandRequestedAt": 1 },
      },
      { new: true, runValidators: true }
    ).lean({ virtuals: true });

    if (updated) {
      await Product.updateMany(
        { sellerId: normalizeId(userId), status: { $in: ["active", "draft"] } },
        { $set: { status: "inactive" } }
      );
    }

    return updated;
  }

  async logAdminAction(data) {
    const inferredEntityType = data.actionType.includes("user")
      ? "user"
      : data.actionType.includes("seller")
      ? "user"
      : data.actionType.includes("product")
      ? "product"
      : data.actionType.includes("report")
      ? "report"
      : "booking";

    const log = await AuditLog.create({
      userId: normalizeId(data.adminId),
      action: data.actionType,
      entityType: data.entityType || inferredEntityType,
      entityId: normalizeId(
        data.targetUserId ||
          data.targetProductId ||
          data.targetBookingId ||
          data.targetReportId
      ),
      details: { reason: data.reason, notes: data.notes },
    });
    return log.toJSON();
  }

  async getReports() {
    return Report.find()
      .sort({ createdAt: -1 })
      .populate("reporterId", "id name email")
      .populate("reportedUserId", "id name email")
      .populate("reportedProductId", "id name slug status")
      .populate("reportedReviewId", "id rating title comment productId reviewerId createdAt")
      .populate("resolvedBy", "id name email")
      .lean({ virtuals: true });
  }

  async updateReportStatus(reportId, adminId, status, notes) {
    const update = {
      $set: {
        status,
        resolutionNotes: notes,
      },
    };

    if (status === "resolved" || status === "dismissed") {
      update.$set.resolvedBy = adminId;
      update.$set.resolvedAt = new Date();
    } else {
      update.$unset = {
        resolvedBy: 1,
        resolvedAt: 1,
      };
    }

    return Report.findOneAndUpdate(
      {
        _id: reportId,
        status: { $in: ["pending", "reviewed"] },
      },
      update,
      { new: true, runValidators: true }
    )
      .populate("reporterId", "id name email")
      .populate("reportedUserId", "id name email")
      .populate("reportedProductId", "id name slug status")
      .populate("reportedReviewId", "id rating title comment productId reviewerId createdAt")
      .populate("resolvedBy", "id name email")
      .lean({ virtuals: true });
  }

  async getDisputes() {
    return Booking.find({ status: "disputed" })
      .sort({ disputedAt: -1, createdAt: -1 })
      .populate("customer", "id name email")
      .populate("seller", "id name email")
      .populate("disputeRaisedBy", "id name email")
      .populate("disputeResolvedBy", "id name email")
      .populate("bookingItems.product", "id name slug images pricing")
      .lean({ virtuals: true });
  }
}

export const adminRepository = new AdminRepository();
