import { adminRepository } from "./admin.repository.js";
import { productRepository } from "../products/product.repository.js";
import { NotFoundError } from "../../middleware/errorHandler.js";

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
    const seller = await adminRepository.updateSellerStatus(sellerId, status);
    if (!seller) throw new NotFoundError("Seller");
    await adminRepository.logAdminAction({
      adminId,
      actionType: status === "approved" ? "approve_seller" : "reject_seller",
      targetUserId: sellerId,
      reason,
    });
    return seller;
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
