import { adminRepository } from "./admin.repository.js";
import { productRepository } from "../products/product.repository.js";
import { bookingRepository } from "../bookings/booking.repository.js";
import { bookingInventoryRepository } from "../bookings/booking.inventory.repository.js";
import { NotFoundError, ConflictError, ValidationError } from "../../middleware/errorHandler.js";
import { getRedisClient, CacheKeys } from "../../config/redis.js";

const OPEN_SELLER_BOOKING_MESSAGE = "This seller has unresolved pending, confirmed, active, or return-requested rentals";

export class AdminService {
  async getDashboard() {
    return adminRepository.getDashboardAnalytics();
  }

  async getUsers() {
    return adminRepository.getAllUsers();
  }

  async getSellers() {
    return adminRepository.getAllSellers();
  }

  async getProducts(params) {
    return adminRepository.getProducts(params);
  }

  async setProductFeatured(adminId, productId, isFeatured) {
    const product = await productRepository.findById(productId);
    if (!product) throw new NotFoundError("Product");

    if (isFeatured && product.status !== "active") {
      throw new ValidationError("Only active products can be featured");
    }

    await productRepository.update(productId, { isFeatured });
    await this.invalidateProductCache(productId);

    await adminRepository.logAdminAction({
      adminId,
      actionType: isFeatured ? "feature_product" : "unfeature_product",
      targetProductId: productId,
    });

    return {
      id: productId,
      status: product.status,
      isFeatured,
    };
  }

  async suspendUser(adminId, userId, reason) {
    const user = await adminRepository.updateUserStatus(userId, "suspended");
    if (!user) throw new NotFoundError("User");
    await adminRepository.logAdminAction({
      adminId,
      actionType: "suspend_user",
      targetUserId: userId,
      reason,
    });
    return user;
  }

  async unsuspendUser(adminId, userId) {
    const user = await adminRepository.updateUserStatus(userId, "active");
    if (!user) throw new NotFoundError("User");
    await adminRepository.logAdminAction({
      adminId,
      actionType: "unsuspend_user",
      targetUserId: userId,
    });
    return user;
  }

  async moderateSeller(adminId, sellerId, status, reason) {
    const seller = await adminRepository.getSellerById(sellerId);
    if (!seller) throw new NotFoundError("Seller application");

    if (!["approved", "rejected"].includes(status)) {
      throw new ValidationError("Seller moderation status must be approved or rejected");
    }

    if (status === "rejected" && !reason?.trim()) {
      throw new ValidationError("A rejection reason is required");
    }

    const isPendingApplication = seller.role === "customer" && seller.sellerProfile?.status === "pending";

    if (isPendingApplication) {
      if (status === "approved") {
        const approvedSeller = await adminRepository.approveSellerApplication(sellerId);
        if (!approvedSeller) throw new ConflictError("Seller application is no longer pending");
        await adminRepository.logAdminAction({
          adminId,
          actionType: "approve_seller_application",
          targetUserId: sellerId,
        });
        return approvedSeller;
      }

      const rejectedApplication = await adminRepository.rejectSellerApplication(sellerId, reason.trim());
      if (!rejectedApplication) throw new ConflictError("Seller application is no longer pending");
      await adminRepository.logAdminAction({
        adminId,
        actionType: "reject_seller_application",
        targetUserId: sellerId,
        reason: reason.trim(),
      });
      return rejectedApplication;
    }

    if (seller.role !== "seller") {
      throw new ConflictError("Only pending seller applications or active sellers can be moderated");
    }

    if (status === "approved") {
      const updatedSeller = await adminRepository.updateSellerStatus(sellerId, "approved");
      if (!updatedSeller) throw new ConflictError("Seller is no longer available");
      await adminRepository.logAdminAction({
        adminId,
        actionType: "approve_seller",
        targetUserId: sellerId,
      });
      return updatedSeller;
    }

    const updatedSeller = await adminRepository.updateSellerStatus(sellerId, "rejected", reason.trim());
    if (!updatedSeller) throw new ConflictError("Seller is no longer available");
    await adminRepository.logAdminAction({
      adminId,
      actionType: "reject_seller",
      targetUserId: sellerId,
      reason: reason.trim(),
    });
    return updatedSeller;
  }

  async toggleProductStatus(adminId, productId, status) {
    const product = await productRepository.findById(productId);
    if (!product) throw new NotFoundError("Product");
    const update = { status };
    if (status !== "active") {
      update.isFeatured = false;
    }

    await productRepository.update(productId, update);
    await this.invalidateProductCache(productId);

    await adminRepository.logAdminAction({
      adminId,
      actionType: status === "active" ? "enable_product" : "disable_product",
      targetProductId: productId,
    });
    return { id: productId, status, isFeatured: status === "active" ? product.isFeatured : false };
  }

  async invalidateProductCache(productId) {
    const redis = getRedisClient();
    if (!redis) return;

    try {
      await redis.del(CacheKeys.product(productId));
    } catch {
      // Cache failures should not block administrative product updates.
    }
  }

  async getReports() {
    return adminRepository.getReports();
  }

  async updateReportStatus(adminId, reportId, status, notes) {
    const report = await adminRepository.updateReportStatus(
      reportId,
      adminId,
      status,
      notes
    );
    if (!report) throw new NotFoundError("Report");

    await adminRepository.logAdminAction({
      adminId,
      actionType: `update_report_${status}`,
      entityType: "report",
      targetReportId: reportId,
      notes,
    });

    return report;
  }

  async getDisputes() {
    return adminRepository.getDisputes();
  }

  async resolveDispute(adminId, bookingId, action, notes) {
    const booking = await adminRepository.getDisputes().then((items) =>
      items.find((item) => String(item.id || item._id) === String(bookingId))
    );

    if (!booking) throw new NotFoundError("Dispute");

    const updated = await (async () => {
      const result = await import("../bookings/booking.repository.js");
      return result.bookingRepository.resolveDispute(
        bookingId,
        adminId,
        action,
        notes
      );
    })();

    if (!updated) throw new ConflictError("Dispute is no longer open");

    if (action === "resolve") {
      await bookingInventoryRepository.releaseBooking(bookingId);
    }

    await adminRepository.logAdminAction({
      adminId,
      actionType: `${action}_booking_dispute`,
      entityType: "booking",
      targetBookingId: bookingId,
      notes,
    });

    return updated;
  }
}

export const adminService = new AdminService();
