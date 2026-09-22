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

  async getProducts(req, res, next) {
    try {
      const products = await adminService.getProducts(req.query);
      sendSuccess(res, products);
    } catch (error) {
      next(error);
    }
  }

  async setProductFeatured(req, res, next) {
    try {
      const result = await adminService.setProductFeatured(
        req.user.id,
        req.params.productId,
        req.body.isFeatured
      );
      sendSuccess(
        res,
        result,
        result.isFeatured ? "Product featured successfully" : "Product removed from featured products"
      );
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

  async updateReportStatus(req, res, next) {
    try {
      const report = await adminService.updateReportStatus(
        req.user.id,
        req.params.reportId,
        req.body.status,
        req.body.notes
      );
      sendSuccess(res, report, `Report marked as ${req.body.status}`);
    } catch (error) {
      next(error);
    }
  }

  async resolveDispute(req, res, next) {
    try {
      const dispute = await adminService.resolveDispute(
        req.user.id,
        req.params.bookingId,
        req.body.action,
        req.body.notes
      );
      sendSuccess(
        res,
        dispute,
        req.body.action === "resolve"
          ? "Dispute resolved and booking completed"
          : "Dispute dismissed and booking restored"
      );
    } catch (error) {
      next(error);
    }
  }
}

export const adminController = new AdminController();
