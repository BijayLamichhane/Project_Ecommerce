import { userRepository } from "./user.repository.js";
import { NotFoundError, ConflictError } from "../../middleware/errorHandler.js";
import { notificationService } from "../notifications/notification.service.js";

const OPEN_SELLER_BOOKING_MESSAGE = "Resolve all pending, confirmed, active, or return-requested rentals before disbanding your seller account";

export class UserService {
  async getProfile(userId) {
    const user = await userRepository.findById(userId);
    if (!user) throw new NotFoundError("User");
    return user;
  }

  async updateProfile(userId, input) {
    return userRepository.updateProfile(userId, input);
  }

  async registerAsSeller(userId, input) {
    const user = await userRepository.findById(userId);
    if (!user) throw new NotFoundError("User");
    if (user.role === "seller") {
      throw new ConflictError("You are already registered as a seller");
    }
    if (user.sellerProfile?.status === "pending") {
      throw new ConflictError("Your seller application is already pending admin approval");
    }

    const sellerProfile = await userRepository.createSellerProfile(userId, input);
    if (!sellerProfile) {
      throw new ConflictError("You cannot submit a seller application in your current account state");
    }

    try {
      await notificationService.notifyAdmins({
        type: "seller_application_submitted",
        title: "New seller application",
        message: `${user.name || "A customer"} submitted a seller application for review.`,
        actionUrl: `/admin?section=sellers&user=${encodeURIComponent(userId)}`,
      });
    } catch {
      // Notification delivery must not block a successful seller application.
    }

    return sellerProfile;
  }

  async disbandSeller(userId) {
    const user = await userRepository.findById(userId);
    if (!user) throw new NotFoundError("User");
    if (user.role !== "seller") {
      throw new ConflictError("Only active sellers can disband their seller account");
    }

    const openBookings = await userRepository.countOpenSellerBookings(userId);
    if (openBookings > 0) {
      throw new ConflictError(OPEN_SELLER_BOOKING_MESSAGE);
    }

    const customer = await userRepository.disbandSeller(userId);
    if (!customer) throw new ConflictError("Unable to disband the seller account");
    return customer;
  }

  async updateSellerSettings(userId, input) {
    return userRepository.updateSellerSettings(userId, input);
  }

  async getSellerEarnings(sellerId) {
    return userRepository.getSellerEarnings(sellerId);
  }

  async getCustomerStats(customerId) {
    return userRepository.getCustomerStats(customerId);
  }
}

export const userService = new UserService();
