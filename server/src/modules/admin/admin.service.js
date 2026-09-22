import { adminRepository } from "./admin.repository.js";
import { productRepository } from "../products/product.repository.js";
import { bookingRepository } from "../bookings/booking.repository.js";
import { bookingInventoryRepository } from "../bookings/booking.inventory.repository.js";
import { NotFoundError, ConflictError, ValidationError } from "../../middleware/errorHandler.js";
import { getRedisClient, CacheKeys } from "../../config/redis.js";
import { notificationService } from "../notifications/notification.service.js";
import { logger } from "../../utils/logger.js";
import { wishlistRepository } from "../wishlist/wishlist.repository.js";

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

    try {
      await notificationService.notifyUser(product.sellerId, {
        type: isFeatured ? "product_featured" : "product_unfeatured",
        title: isFeatured ? "Your listing was featured" : "Your listing was unfeatured",
        message: isFeatured
          ? `Your listing "${product.name}" is now featured in marketplace discovery.`
          : `Your listing "${product.name}" is no longer featured in marketplace discovery.`,
        actionUrl: `/products/${encodeURIComponent(productId)}`,
      });
    } catch (error) {
      logger.warn({ error, productId }, "Failed to notify seller about featured status");
    }

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
    try {
      await notificationService.notifyUser(userId, {
        type: "account_suspended",
        title: "Account suspended",
        message: reason?.trim()
          ? `Your account has been suspended. Reason: ${reason.trim()}`
          : "Your account has been suspended by an administrator.",
        actionUrl: "/dashboard",
      });
    } catch (error) {
      logger.warn({ error, userId }, "Failed to notify suspended user");
    }
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
    try {
      await notificationService.notifyUser(userId, {
        type: "account_reactivated",
        title: "Account reactivated",
        message: "Your account has been reactivated and access is available again.",
        actionUrl: "/profile",
      });
    } catch (error) {
      logger.warn({ error, userId }, "Failed to notify reactivated user");
    }
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
        await notificationService.notifyUser(sellerId, {
          type: "seller_application_approved",
          title: "Seller application approved",
          message: "Your seller application has been approved. You can now manage rental listings from your seller account.",
          actionUrl: "/seller",
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
      await notificationService.notifyUser(sellerId, {
        type: "seller_application_rejected",
        title: "Seller application needs revision",
        message: `Your seller application was not approved. Reason: ${reason.trim()}`,
        actionUrl: "/become-seller",
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
      await notificationService.notifyUser(sellerId, {
        type: "seller_status_approved",
        title: "Seller status approved",
        message: "Your seller account has been approved.",
        actionUrl: "/seller/dashboard",
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
    await notificationService.notifyUser(sellerId, {
      type: "seller_status_rejected",
      title: "Seller status changed",
      message: `Your seller status was rejected. Reason: ${reason.trim()}`,
      actionUrl: "/seller/dashboard",
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

    try {
      await notificationService.notifyUser(product.sellerId, {
        type: status === "active" ? "product_activated" : "product_suspended",
        title: status === "active" ? "Listing activated" : "Listing suspended",
        message: status === "active"
          ? `Your listing "${product.name}" is active again.`
          : `Your listing "${product.name}" has been suspended by an administrator.`,
        actionUrl: `/seller/products/${encodeURIComponent(productId)}/edit`,
      });
    } catch (error) {
      logger.warn({ error, productId }, "Failed to notify seller about product status");
    }

    try {
      const subscriberIds = await wishlistRepository.findUserIdsByProductId(productId);
      await Promise.all(subscriberIds
        .filter((userId) => String(userId) !== String(product.sellerId))
        .map((userId) => notificationService.notifyUser(userId, {
          type: status === "active" ? "wishlisted_product_available" : "wishlisted_product_unavailable",
          title: status === "active" ? "Wishlisted listing is available" : "Wishlisted listing is unavailable",
          message: status === "active"
            ? `Your wishlisted listing "${product.name}" is available again.`
            : `Your wishlisted listing "${product.name}" is currently unavailable.`,
          actionUrl: `/products/${encodeURIComponent(productId)}`,
        })));
    } catch (error) {
      logger.warn({ error, productId }, "Failed to notify wishlist subscribers");
    }

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

    const reporterId =
      typeof report.reporterId === "object"
        ? report.reporterId?.id || report.reporterId?._id
        : report.reporterId;

    if (reporterId && ["reviewed", "resolved", "dismissed"].includes(status)) {
      const targetName =
        report.reportedProductId?.name ||
        report.reportedUserId?.name ||
        (report.reportedReviewId ? "the reported review" : "the reported item");

      const notification =
        status === "reviewed"
          ? {
              userId: String(reporterId),
              type: "report_reviewed",
              title: "Your report is under review",
              message: `Your report about ${targetName} is now being reviewed by moderation.`,
              actionUrl: "/reports",
            }
          : status === "resolved"
            ? {
                userId: String(reporterId),
                type: "report_resolved",
                title: "Your report was resolved",
                message: `We reviewed your report about ${targetName} and took action. Moderator note: ${notes}`,
                actionUrl: "/reports",
              }
            : {
                userId: String(reporterId),
                type: "report_dismissed",
                title: "Your report was dismissed",
                message: `We reviewed your report about ${targetName} and did not take further action. Moderator note: ${notes}`,
                actionUrl: "/reports",
              };

      try {
        await notificationService.notifyUser(String(reporterId), notification);
      } catch (error) {
        logger.error(
          { error, reportId, reporterId },
          "Failed to notify report issuer about moderation decision"
        );
      }
    }

    return report;
  }

  async getDisputes() {
    return adminRepository.getDisputes();
  }

  async resolveDispute(adminId, bookingId, action, notes) {
    const booking = await bookingRepository.findById(bookingId);
    if (!booking || booking.status !== "disputed") {
      throw new NotFoundError("Dispute");
    }

    const updated = await bookingRepository.resolveDispute(
      bookingId,
      adminId,
      action,
      notes
    );

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

    const customerId = String(updated.customerId);
    const sellerId = String(updated.sellerId);
    const resolutionMessage = action === "resolve"
      ? "The administrator resolved the dispute and completed the booking."
      : "The administrator dismissed the dispute and restored the booking to its previous state.";

    try {
      await Promise.all([
        notificationService.notifyUser(customerId, {
          type: action === "resolve" ? "booking_dispute_resolved" : "booking_dispute_dismissed",
          title: action === "resolve" ? "Dispute resolved" : "Dispute dismissed",
          message: notes?.trim() ? `${resolutionMessage} Admin note: ${notes.trim()}` : resolutionMessage,
          actionUrl: `/bookings/${encodeURIComponent(bookingId)}`,
        }),
        notificationService.notifyUser(sellerId, {
          type: action === "resolve" ? "booking_dispute_resolved" : "booking_dispute_dismissed",
          title: action === "resolve" ? "Dispute resolved" : "Dispute dismissed",
          message: notes?.trim() ? `${resolutionMessage} Admin note: ${notes.trim()}` : resolutionMessage,
          actionUrl: `/bookings/${encodeURIComponent(bookingId)}`,
        }),
      ]);
    } catch (error) {
      logger.error({ error, bookingId }, "Failed to notify booking participants about dispute resolution");
    }

    return updated;
  }
}

export const adminService = new AdminService();
