import { adminRepository } from "./admin.repository.js";
import { productRepository } from "../products/product.repository.js";
import { NotFoundError, ConflictError } from "../../middleware/errorHandler.js";

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
    if (!seller) throw new NotFoundError("Seller");

    if (seller.sellerProfile?.disbandRequested) {
      if (status === "approved") {
        const openBookings = await adminRepository.countOpenSellerBookings(sellerId);
        if (openBookings > 0) {
          throw new ConflictError(OPEN_SELLER_BOOKING_MESSAGE);
        }

        const customer = await adminRepository.disbandSeller(sellerId);
        if (!customer) throw new ConflictError("Seller disband request is no longer pending");
        await adminRepository.logAdminAction({
          adminId,
          actionType: "disband_seller",
          targetUserId: sellerId,
          reason,
        });
        return customer;
      }

      if (status === "rejected") {
        const restoredSeller = await adminRepository.rejectSellerDisband(sellerId);
        if (!restoredSeller) throw new ConflictError("Seller disband request is no longer pending");
        await adminRepository.logAdminAction({
          adminId,
          actionType: "reject_seller_disband",
          targetUserId: sellerId,
          reason,
        });
        return restoredSeller;
      }

      throw new ConflictError("Approve or reject the seller disband request before changing seller moderation status");
    }

    const updatedSeller = await adminRepository.updateSellerStatus(sellerId, status);
    if (!updatedSeller) throw new NotFoundError("Seller");
    await adminRepository.logAdminAction({
      adminId,
      actionType: status === "approved" ? "approve_seller" : "reject_seller",
      targetUserId: sellerId,
      reason,
    });
    return updatedSeller;
  }

  async toggleProductStatus(adminId, productId, status) {
    const product = await productRepository.findById(productId);
    if (!product) throw new NotFoundError("Product");
    await productRepository.update(productId, { status });
    await adminRepository.logAdminAction({
      adminId,
      actionType: status === "suspended" ? "disable_product" : "enable_product",
      targetProductId: productId,
    });
    return { id: productId, status };
  }

  async getReports() {
    return adminRepository.getReports();
  }

  async getDisputes() {
    return adminRepository.getDisputes();
  }
}

export const adminService = new AdminService();
