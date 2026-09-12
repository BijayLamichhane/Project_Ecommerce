import { reviewService } from "./review.service.js";
import { sendSuccess, sendCreated } from "../../utils/response.js";

export class ReviewController {
  async getProductReviews(req, res, next) {
    try {
      const reviews = await reviewService.getByProductId(req.params.productId);
      sendSuccess(res, reviews);
    } catch (error) {
      next(error);
    }
  }

  async getSellerReviews(req, res, next) {
    try {
      const reviews = await reviewService.getBySellerId(req.params.sellerId);
      sendSuccess(res, reviews);
    } catch (error) {
      next(error);
    }
  }

  async createReview(req, res, next) {
    try {
      const review = await reviewService.createReview(req.user.id, req.body);
      sendCreated(res, review, "Review posted successfully");
    } catch (error) {
      next(error);
    }
  }

  async replyToReview(req, res, next) {
    try {
      const updated = await reviewService.replyToReview(
        req.user.id,
        req.params.reviewId,
        req.body
      );
      sendSuccess(res, updated, "Reply posted successfully");
    } catch (error) {
      next(error);
    }
  }
}

export const reviewController = new ReviewController();
