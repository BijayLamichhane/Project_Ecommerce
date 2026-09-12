import { Review } from "../../models/Review.js";
import { Product } from "../../models/Product.js";
import { User } from "../../models/User.js";

export class ReviewRepository {
  async findByProductId(productId) {
    return Review.find({ productId })
      .populate("reviewer", "id name avatarUrl")
      .sort({ createdAt: -1 })
      .lean({ virtuals: true });
  }

  async findBySellerId(sellerId) {
    const products = await Product.find({ sellerId }).select("_id").lean();
    const productIds = products.map((p) => p._id);

    return Review.find({ productId: { $in: productIds } })
      .populate("reviewer", "id name avatarUrl")
      .populate({ path: "productId", model: "Product", select: "id name slug" })
      .sort({ createdAt: -1 })
      .lean({ virtuals: true });
  }

  async findById(id) {
    return Review.findById(id).lean({ virtuals: true });
  }

  async findByBookingAndReviewer(bookingId, reviewerId) {
    return Review.findOne({ bookingId, reviewerId }).lean({ virtuals: true });
  }

  async create(data) {
    const review = await Review.create(data);
    return review.toJSON();
  }

  async updateReply(id, response) {
    return Review.findByIdAndUpdate(
      id,
      {
        sellerResponse: response,
        sellerRespondedAt: new Date(),
      },
      { new: true }
    ).lean({ virtuals: true });
  }

  async updateProductRatingStats(productId) {
    const reviews = await Review.find({ productId }).lean();
    const totalRatings = reviews.length;
    const averageRating =
      totalRatings > 0
        ? (reviews.reduce((sum, r) => sum + r.rating, 0) / totalRatings).toFixed(2)
        : "0";

    await Product.findByIdAndUpdate(productId, {
      averageRating,
      totalRatings,
    });
  }

  async updateSellerRatingStats(sellerId) {
    const products = await Product.find({ sellerId }).select("_id").lean();
    const productIds = products.map((p) => p._id);

    const reviews = await Review.find({ productId: { $in: productIds } }).lean();
    const totalRatings = reviews.length;
    const averageRating =
      totalRatings > 0
        ? (reviews.reduce((sum, r) => sum + r.rating, 0) / totalRatings).toFixed(2)
        : "0";

    await User.findByIdAndUpdate(sellerId, {
      "sellerProfile.averageRating": averageRating,
      "sellerProfile.totalRatings": totalRatings,
    });
  }
}

export const reviewRepository = new ReviewRepository();
