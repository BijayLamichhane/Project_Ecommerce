import { userRepository } from "./user.repository.js";
import { NotFoundError, ConflictError } from "../../middleware/errorHandler.js";

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
    if (user.sellerProfile?.businessName) {
      throw new ConflictError("You are already registered as a seller");
    }
    return userRepository.createSellerProfile(userId, input);
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
