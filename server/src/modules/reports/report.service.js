import { reportRepository } from "./report.repository.js";
import { ConflictError, NotFoundError, ValidationError } from "../../middleware/errorHandler.js";
import { notificationService } from "../notifications/notification.service.js";

const targetField = {
  product: "reportedProductId",
  user: "reportedUserId",
  review: "reportedReviewId",
};

export class ReportService {
  async getMyReports(reporterId) {
    return reportRepository.findByReporterId(reporterId);
  }

  async create(reporterId, input) {
    if (input.targetType === "user" && String(input.targetId) === String(reporterId)) {
      throw new ValidationError("You cannot report your own account");
    }

    const target = await reportRepository.getTarget(input.targetType, input.targetId);
    if (!target) throw new NotFoundError("Report target");

    if (
      input.targetType === "product" &&
      String(target.sellerId) === String(reporterId)
    ) {
      throw new ValidationError("You cannot report your own listing");
    }

    if (
      input.targetType === "review" &&
      String(target.reviewerId) === String(reporterId)
    ) {
      throw new ValidationError("You cannot report your own review");
    }

    const duplicate = await reportRepository.findPendingDuplicate(
      reporterId,
      input.targetType,
      input.targetId
    );
    if (duplicate) {
      throw new ConflictError("You already have an open report for this item");
    }

    const report = await reportRepository.create({
      reporterId,
      targetType: input.targetType,
      [targetField[input.targetType]]: input.targetId,
      reason: input.reason,
      details: input.details,
    });

    await Promise.all([
      notificationService.notifyUser(reporterId, {
        type: "report_submitted",
        title: "Report submitted",
        message: "Your report has been submitted and is now in the moderation queue.",
        actionUrl: "/reports",
      }),
      notificationService.notifyAdmins({
        type: "report_submitted",
        title: "New report requires review",
        message: "A new marketplace report has been submitted for moderation.",
        actionUrl: "/admin?section=reports",
      }),
    ]);

    return report;
  }
}

export const reportService = new ReportService();
