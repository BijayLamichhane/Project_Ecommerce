import { Report } from "../../models/Moderation.js";
import { User } from "../../models/User.js";
import { Product } from "../../models/Product.js";
import { Review } from "../../models/Review.js";

const targetField = {
  product: "reportedProductId",
  user: "reportedUserId",
  review: "reportedReviewId",
};

export class ReportRepository {
  async targetExists(targetType, targetId) {
    const models = {
      product: Product,
      user: User,
      review: Review,
    };
    const model = models[targetType];
    return Boolean(await model.findById(targetId).select("_id").lean());
  }

  async findPendingDuplicate(reporterId, targetType, targetId) {
    return Report.findOne({
      reporterId,
      targetType,
      [targetField[targetType]]: targetId,
      status: { $in: ["pending", "reviewed"] },
    }).lean();
  }

  async create(data) {
    const report = await Report.create(data);
    return report.toJSON();
  }
}

export const reportRepository = new ReportRepository();
