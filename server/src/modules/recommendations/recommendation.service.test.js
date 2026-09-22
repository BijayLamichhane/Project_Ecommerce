import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("./recommendation.repository.js", () => ({
  recommendationRepository: {
    getUserSignals: vi.fn(),
    findPersonalizedCandidates: vi.fn(),
    findPopular: vi.fn(),
    findProduct: vi.fn(),
    findSimilarCandidates: vi.fn(),
  },
}));

const { recommendationRepository } = await import("./recommendation.repository.js");
const {
  recommendationService,
  scorePersonalizedCandidate,
  scoreSimilarCandidate,
} = await import("./recommendation.service.js");

describe("Recommendation service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("ranks products using the customer's existing marketplace signals", async () => {
    recommendationRepository.getUserSignals.mockResolvedValue({
      excludedProductIds: [],
      categoryWeights: new Map([["camera", 2]]),
      brandWeights: new Map([["sony", 1]]),
      cityWeights: new Map([["pokhara", 1]]),
    });

    const candidates = [
      {
        _id: "1",
        categoryId: "camera",
        brand: "Sony",
        city: "Pokhara",
        averageRating: "4.5",
        totalRentals: 12,
        isFeatured: false,
      },
      {
        _id: "2",
        categoryId: "laptop",
        brand: "Dell",
        city: "Kathmandu",
        averageRating: "5",
        totalRentals: 30,
        isFeatured: true,
      },
    ];

    recommendationRepository.findPersonalizedCandidates.mockResolvedValue(candidates);

    const recommendations = await recommendationService.getPersonalized("user-1", 2);

    expect(recommendations[0]._id).toBe("1");
    expect(recommendationRepository.findPopular).not.toHaveBeenCalled();
  });

  it("falls back to popular products for a customer without history", async () => {
    recommendationRepository.getUserSignals.mockResolvedValue({
      excludedProductIds: [],
      categoryWeights: new Map(),
      brandWeights: new Map(),
      cityWeights: new Map(),
    });
    recommendationRepository.findPopular.mockResolvedValue([{ _id: "popular-1" }]);

    const recommendations = await recommendationService.getPersonalized("user-1", 4);

    expect(recommendations).toEqual([{ _id: "popular-1" }]);
    expect(recommendationRepository.findPopular).toHaveBeenCalledWith({
      excludedProductIds: [],
      limit: 4,
    });
  });

  it("ranks a similar product by category and product attributes", () => {
    const target = {
      categoryId: "camera",
      brand: "Sony",
      city: "Pokhara",
      condition: "like_new",
      pricing: { dailyRate: "2500" },
    };

    const sameProduct = {
      categoryId: "camera",
      brand: "Sony",
      city: "Pokhara",
      condition: "like_new",
      pricing: { dailyRate: "2600" },
      averageRating: "4.6",
      totalRentals: 8,
    };

    const differentProduct = {
      categoryId: "laptop",
      brand: "Dell",
      city: "Kathmandu",
      condition: "good",
      pricing: { dailyRate: "2200" },
      averageRating: "4.9",
      totalRentals: 20,
    };

    expect(scoreSimilarCandidate(sameProduct, target)).toBeGreaterThan(
      scoreSimilarCandidate(differentProduct, target)
    );
  });

  it("scores a personalized candidate without requiring new tracking data", () => {
    const signals = {
      categoryWeights: new Map([["camera", 2]]),
      brandWeights: new Map([["sony", 1]]),
      cityWeights: new Map([["pokhara", 1]]),
    };

    const candidate = {
      categoryId: "camera",
      brand: "Sony",
      city: "Pokhara",
      averageRating: "4",
      totalRentals: 5,
      isFeatured: true,
    };

    expect(scorePersonalizedCandidate(candidate, signals)).toBeGreaterThan(50);
  });
});
