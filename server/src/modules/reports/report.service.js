import { reportRepository } from "./report.repository.js";
import { ConflictError, NotFoundError, ValidationError } from "../../middleware/errorHandler.js";

const targetField = {
  product: "reportedProductId",
  user: "reportedUserId",
  review: "reportedReviewId",
};

export class ReportService {
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

    return reportRepository.create({
      reporterId,
      targetType: input.targetType,
      [targetField[input.targetType]]: input.targetId,
      reason: input.reason,
      details: input.details,
    });
  }
}

export const reportService = new ReportService();
