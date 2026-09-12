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
    const booking = await bookingRepository.findById(input.bookingId);
    if (!booking) throw new NotFoundError("Booking");
    if (booking.customerId !== reviewerId) {
      throw new ForbiddenError("You can only review bookings you made");
    }
    if (booking.status !== "completed" && booking.status !== "returned") {
      throw new ValidationError("You can only review after completing or returning your rental");
    }

    const existingReview = await reviewRepository.findByBookingAndReviewer(
      input.bookingId,
      reviewerId
    );
    if (existingReview) {
      throw new ConflictError("You have already reviewed this rental booking");
    }

    const product = await productRepository.findById(input.productId);
    if (!product) throw new NotFoundError("Product");

    const reviewId = uuidv4();
    const review = await reviewRepository.create({
      _id: reviewId,
      productId: input.productId,
      bookingId: input.bookingId,
      reviewerId,
      rating: input.rating,
      title: input.title,
      comment: input.comment,
    });

    await Promise.all([
      reviewRepository.updateProductRatingStats(input.productId),
      reviewRepository.updateSellerRatingStats(product.sellerId),
    ]);

    return review;
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
