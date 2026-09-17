import { userRepository } from "./user.repository.js";
import { NotFoundError, ConflictError } from "../../middleware/errorHandler.js";

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
    if (user.role === "seller" && !user.sellerProfile?.disbandedAt) {
      throw new ConflictError("You are already registered as a seller");
    }
    return userRepository.createSellerProfile(userId, input);
  }

  async requestSellerDisband(userId) {
    const user = await userRepository.findById(userId);
    if (!user) throw new NotFoundError("User");
    if (user.role !== "seller") {
      throw new ConflictError("Only active sellers can request seller disbandment");
    }
    if (user.sellerProfile?.disbandRequested) {
      throw new ConflictError("Your seller disband request is already pending admin approval");
    }

    const openBookings = await userRepository.countOpenSellerBookings(userId);
    if (openBookings > 0) {
      throw new ConflictError(OPEN_SELLER_BOOKING_MESSAGE);
    }

    const sellerProfile = await userRepository.requestSellerDisband(userId);
    if (!sellerProfile) throw new ConflictError("Unable to create seller disband request");
    return sellerProfile;
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
