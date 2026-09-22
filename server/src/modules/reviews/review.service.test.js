import { beforeEach, describe, expect, it, vi } from "vitest";

const productFindById = vi.fn();
const reviewFindByProductAndReviewer = vi.fn();
const reviewCreate = vi.fn();
const reviewUpdate = vi.fn();
const reviewFindById = vi.fn();
const bookingFindById = vi.fn();
const updateProductRatingStats = vi.fn();
const updateSellerRatingStats = vi.fn();

vi.mock("./review.repository.js", () => ({
  reviewRepository: {
    findByProductAndReviewer: reviewFindByProductAndReviewer,
    create: reviewCreate,
    update: reviewUpdate,
    findById: reviewFindById,
    updateReply: vi.fn(),
    updateProductRatingStats,
    updateSellerRatingStats,
    findByProductId: vi.fn(),
    findBySellerId: vi.fn(),
  },
}));

vi.mock("../bookings/booking.repository.js", () => ({
  bookingRepository: {
    findById: bookingFindById,
  },
}));

vi.mock("../products/product.repository.js", () => ({
  productRepository: {
    findById: productFindById,
  },
}));

const { ReviewService } = await import("./review.service.js");

describe("ReviewService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    productFindById.mockResolvedValue({
      id: "product-1",
      sellerId: "seller-1",
    });
    updateProductRatingStats.mockResolvedValue(undefined);
    updateSellerRatingStats.mockResolvedValue(undefined);
  });

  it("allows a user to review a product only when no review already exists", async () => {
    reviewFindByProductAndReviewer.mockResolvedValue(null);
    reviewCreate.mockResolvedValue({
      id: "review-1",
      productId: "product-1",
      reviewerId: "customer-1",
    });

    const service = new ReviewService();

    const result = await service.createReview("customer-1", {
      productId: "product-1",
      rating: 5,
      comment: "Excellent rental.",
    });

    expect(result.id).toBe("review-1");
    expect(reviewFindByProductAndReviewer).toHaveBeenCalledWith(
      "product-1",
      "customer-1"
    );
    expect(reviewCreate).toHaveBeenCalledTimes(1);
  });

  it("rejects a second review for the same product even when it uses another booking", async () => {
    reviewFindByProductAndReviewer.mockResolvedValue({
      id: "review-existing",
    });

    const service = new ReviewService();

    await expect(
      service.createReview("customer-1", {
        productId: "product-1",
        bookingId: "booking-2",
        rating: 4,
        comment: "Another review attempt.",
      })
    ).rejects.toMatchObject({
      code: "CONFLICT",
      statusCode: 409,
      message: "You have already reviewed this product",
    });

    expect(bookingFindById).not.toHaveBeenCalled();
    expect(reviewCreate).not.toHaveBeenCalled();
  });

  it("allows the review owner to update their existing product review", async () => {
    reviewFindById.mockResolvedValue({
      id: "review-1",
      productId: "product-1",
      reviewerId: "customer-1",
      sellerId: "seller-1",
    });
    reviewUpdate.mockResolvedValue({
      id: "review-1",
      productId: "product-1",
      reviewerId: "customer-1",
      rating: 4,
      title: "Updated review",
      comment: "Updated rental experience.",
    });

    const service = new ReviewService();

    const result = await service.updateReview("customer-1", "review-1", {
      rating: 4,
      title: "Updated review",
      comment: "Updated rental experience.",
    });

    expect(result.rating).toBe(4);
    expect(reviewUpdate).toHaveBeenCalledWith("review-1", {
      rating: 4,
      title: "Updated review",
      comment: "Updated rental experience.",
    });
    expect(updateProductRatingStats).toHaveBeenCalledWith("product-1");
    expect(updateSellerRatingStats).toHaveBeenCalledWith("seller-1");
  });

  it("blocks a user from updating another user's review", async () => {
    reviewFindById.mockResolvedValue({
      id: "review-1",
      productId: "product-1",
      reviewerId: "customer-2",
      sellerId: "seller-1",
    });

    const service = new ReviewService();

    await expect(
      service.updateReview("customer-1", "review-1", {
        rating: 4,
        comment: "Unauthorized update.",
      })
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
      statusCode: 403,
    });

    expect(reviewUpdate).not.toHaveBeenCalled();
  });

  it("converts a database unique-index race into a conflict response", async () => {
    reviewFindByProductAndReviewer.mockResolvedValue(null);
    reviewCreate.mockRejectedValue({
      code: 11000,
      keyPattern: { productId: 1, reviewerId: 1 },
    });

    const service = new ReviewService();

    await expect(
      service.createReview("customer-1", {
        productId: "product-1",
        rating: 5,
        comment: "Concurrent review.",
      })
    ).rejects.toMatchObject({
      code: "CONFLICT",
      statusCode: 409,
      message: "You have already reviewed this product",
    });
  });
});
