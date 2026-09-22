import { sendSuccess } from "../../utils/response.js";
import { recommendationService } from "./recommendation.service.js";

export class RecommendationController {
  async getPersonalized(req, res, next) {
    try {
      const recommendations = await recommendationService.getPersonalized(
        req.user.id,
        req.query.limit
      );
      sendSuccess(res, recommendations);
    } catch (error) {
      next(error);
    }
  }

  async getSimilar(req, res, next) {
    try {
      const recommendations = await recommendationService.getSimilar(
        req.params.productId,
        req.query.limit
      );
      sendSuccess(res, recommendations);
    } catch (error) {
      next(error);
    }
  }
}

export const recommendationController = new RecommendationController();
