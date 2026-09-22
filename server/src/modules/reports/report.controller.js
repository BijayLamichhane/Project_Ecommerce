import { reportService } from "./report.service.js";
import { sendCreated } from "../../utils/response.js";

export class ReportController {
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
