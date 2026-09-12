import { userService } from "./user.service.js";
import { sendSuccess, sendCreated } from "../../utils/response.js";

export class UserController {
  async getMe(req, res, next) {
    try {
      const user = await userService.getProfile(req.user.id);
      sendSuccess(res, user);
    } catch (error) {
      next(error);
    }
  }

  async updateProfile(req, res, next) {
    try {
      const updated = await userService.updateProfile(req.user.id, req.body);
      sendSuccess(res, updated, "Profile updated successfully");
    } catch (error) {
      next(error);
    }
  }

  async registerAsSeller(req, res, next) {
    try {
      const seller = await userService.registerAsSeller(req.user.id, req.body);
      sendCreated(res, seller, "Successfully registered as a seller");
    } catch (error) {
      next(error);
    }
  }

  async updateSellerSettings(req, res, next) {
    try {
      const updated = await userService.updateSellerSettings(req.user.id, req.body);
      sendSuccess(res, updated, "Seller settings updated");
    } catch (error) {
      next(error);
    }
  }

  async getSellerEarnings(req, res, next) {
    try {
      const data = await userService.getSellerEarnings(req.user.id);
      sendSuccess(res, data);
    } catch (error) {
      next(error);
    }
  }

  async getCustomerStats(req, res, next) {
    try {
      const data = await userService.getCustomerStats(req.user.id);
      sendSuccess(res, data);
    } catch (error) {
      next(error);
    }
  }
}

export const userController = new UserController();
