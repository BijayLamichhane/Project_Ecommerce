import { adminService } from "./admin.service.js";
import { sendSuccess } from "../../utils/response.js";

export class AdminController {
  async getDashboard(req, res, next) {
    try {
      const data = await adminService.getDashboard();
      sendSuccess(res, data);
    } catch (error) {
      next(error);
    }
  }

  async getUsers(req, res, next) {
    try {
      const users = await adminService.getUsers();
      sendSuccess(res, users);
    } catch (error) {
      next(error);
    }
  }

  async getSellers(req, res, next) {
    try {
      const sellers = await adminService.getSellers();
      sendSuccess(res, sellers);
    } catch (error) {
      next(error);
    }
  }

  async suspendUser(req, res, next) {
    try {
      const result = await adminService.suspendUser(
        req.user.id,
        req.params.userId,
        req.body.reason
      );
      sendSuccess(res, result, "User suspended");
    } catch (error) {
      next(error);
    }
  }

  async unsuspendUser(req, res, next) {
    try {
      const result = await adminService.unsuspendUser(
        req.user.id,
        req.params.userId
      );
      sendSuccess(res, result, "User unsuspended");
    } catch (error) {
      next(error);
    }
  }

  async moderateSeller(req, res, next) {
    try {
      const result = await adminService.moderateSeller(
        req.user.id,
        req.params.sellerId,
        req.body.status,
        req.body.reason
      );
      sendSuccess(res, result, `Seller status updated to ${req.body.status}`);
    } catch (error) {
      next(error);
    }
  }

  async toggleProduct(req, res, next) {
    try {
      const result = await adminService.toggleProductStatus(
        req.user.id,
        req.params.productId,
        req.body.status
      );
      sendSuccess(res, result, `Product status updated to ${req.body.status}`);
    } catch (error) {
      next(error);
    }
  }

  async getReports(req, res, next) {
    try {
      const reports = await adminService.getReports();
      sendSuccess(res, reports);
    } catch (error) {
      next(error);
    }
  }

  async getDisputes(req, res, next) {
    try {
      const disputes = await adminService.getDisputes();
      sendSuccess(res, disputes);
    } catch (error) {
      next(error);
    }
  }
}

export const adminController = new AdminController();
