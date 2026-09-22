import { reviewRepository } from "./review.repository.js";
import { bookingRepository } from "../bookings/booking.repository.js";
import { productRepository } from "../products/product.repository.js";
import { NotFoundError, ForbiddenError, ValidationError, ConflictError } from "../../middleware/errorHandler.js";
import { v4 as uuidv4 } from "uuid";

export class ReviewService {
  async getByProductId(productId) {
    return reviewRepository.findByProductId(productId);
  }

  async getBySellerId(sellerId) {
    return reviewRepository.findBySellerId(sellerId);
  }

  async createReview(reviewerId, input) {
    const product = await productRepository.findById(input.productId);
    if (!product) throw new NotFoundError("Product");

    // Prevent sellers from reviewing their own products
    if (String(product.sellerId) === String(reviewerId)) {
      throw new ForbiddenError("You cannot review your own product");
    }

    const existingReview = await reviewRepository.findByProductAndReviewer(
      input.productId,
      reviewerId
    );
    if (existingReview) {
      throw new ConflictError("You have already reviewed this product");
    }

    if (input.bookingId) {
      const booking = await bookingRepository.findById(input.bookingId);
      if (!booking) throw new NotFoundError("Booking");
      if (String(booking.customerId) !== String(reviewerId)) {
        throw new ForbiddenError("You can only review bookings you made");
      }
      if (booking.status !== "completed" && booking.status !== "returned") {
        throw new ValidationError("You can only review after completing or returning your rental");
      }
    }

    const reviewId = uuidv4();
    let review;
    try {
      review = await reviewRepository.create({
        _id: reviewId,
        productId: input.productId,
        bookingId: input.bookingId || undefined,
        reviewerId,
        sellerId: product.sellerId,
        rating: input.rating,
        title: input.title,
        comment: input.comment,
      });
    } catch (error) {
      if (error?.code === 11000 && error?.keyPattern?.productId && error?.keyPattern?.reviewerId) {
        throw new ConflictError("You have already reviewed this product");
      }
      throw error;
    }

    await Promise.all([
      reviewRepository.updateProductRatingStats(input.productId),
      reviewRepository.updateSellerRatingStats(product.sellerId),
    ]);

    return review;
  }

  async updateReview(reviewerId, reviewId, input) {
    const review = await reviewRepository.findById(reviewId);
    if (!review) throw new NotFoundError("Review");
    if (String(review.reviewerId) !== String(reviewerId)) {
      throw new ForbiddenError("You can only update your own review");
    }

    const updated = await reviewRepository.update(reviewId, {
      rating: input.rating,
      title: input.title,
      comment: input.comment,
    });
    if (!updated) throw new NotFoundError("Review");

    await Promise.all([
      reviewRepository.updateProductRatingStats(review.productId),
      review.sellerId
        ? reviewRepository.updateSellerRatingStats(review.sellerId)
        : Promise.resolve(),
    ]);

    return updated;
  }

  async replyToReview(sellerId, reviewId, input) {
    const review = await reviewRepository.findById(reviewId);
    if (!review) throw new NotFoundError("Review");

    const product = await productRepository.findById(review.productId);
    if (!product || product.sellerId !== sellerId) {
      throw new ForbiddenError("Only the seller can reply to this review");
    }

    return reviewRepository.updateReply(reviewId, input.response);
  }
}

export const reviewService = new ReviewService();
