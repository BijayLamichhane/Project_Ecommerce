import { reportService } from "./report.service.js";
import { sendCreated, sendSuccess } from "../../utils/response.js";

export class ReportController {
  async getMine(req, res, next) {
    try {
      const reports = await reportService.getMyReports(req.user.id);
      sendSuccess(res, reports);
    } catch (error) {
      next(error);
    }
  }

  async create(req, res, next) {
    try {
      const report = await reportService.create(req.user.id, req.body);
      sendCreated(res, report, "Report submitted successfully");
    } catch (error) {
      next(error);
    }
  }
}

export const reportController = new ReportController();
