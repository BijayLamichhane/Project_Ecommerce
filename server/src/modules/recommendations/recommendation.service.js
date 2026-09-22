import { recommendationRepository } from "./recommendation.repository.js";

const toNumber = (value, fallback = 0) => {
  const number = Number.parseFloat(value);
  return Number.isFinite(number) ? number : fallback;
};

const normalize = (value) => (value == null ? "" : String(value).trim().toLowerCase());

const normalizedWeights = (weights) => {
  const max = Math.max(...weights.values(), 0);
  return { max, values: weights };
};

const scorePersonalizedCandidate = (product, signals) => {
  const categoryWeights = normalizedWeights(signals.categoryWeights);
  const brandWeights = normalizedWeights(signals.brandWeights);
  const cityWeights = normalizedWeights(signals.cityWeights);

  const categoryScore =
    categoryWeights.max > 0
      ? ((categoryWeights.values.get(normalize(product.categoryId)) || 0) /
          categoryWeights.max) *
        50
      : 0;

  const brandScore =
    brandWeights.max > 0
      ? ((brandWeights.values.get(normalize(product.brand)) || 0) /
          brandWeights.max) *
        25
      : 0;

  const cityScore =
    cityWeights.max > 0
      ? ((cityWeights.values.get(normalize(product.city)) || 0) /
          cityWeights.max) *
        10
      : 0;

  const ratingScore = Math.min(5, Math.max(0, toNumber(product.averageRating))) * 2;
  const popularityScore = Math.log1p(Math.max(0, toNumber(product.totalRentals)));
  const featuredScore = product.isFeatured ? 2 : 0;

  return (
    categoryScore +
    brandScore +
    cityScore +
    ratingScore +
    popularityScore +
    featuredScore
  );
};

const scoreSimilarCandidate = (product, target) => {
  let score = 0;

  if (String(product.categoryId) === String(target.categoryId)) score += 50;
  if (
    target.brand &&
    normalize(product.brand) &&
    normalize(product.brand) === normalize(target.brand)
  ) {
    score += 20;
  }
  if (
    target.city &&
    normalize(product.city) &&
    normalize(product.city) === normalize(target.city)
  ) {
    score += 8;
  }
  if (product.condition && product.condition === target.condition) score += 5;

  const targetPrice = toNumber(target.pricing?.dailyRate);
  const productPrice = toNumber(product.pricing?.dailyRate);
  if (targetPrice > 0 && productPrice > 0) {
    const difference = Math.abs(productPrice - targetPrice);
    score += Math.max(0, 7 * (1 - difference / targetPrice));
  }

  score += Math.min(5, Math.max(0, toNumber(product.averageRating)));
  score += Math.log1p(Math.max(0, toNumber(product.totalRentals)));

  return score;
};

const rank = (products, scoreFn, limit) =>
  products
    .map((product) => ({
      product,
      score: scoreFn(product),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ product }) => product);

export class RecommendationService {
  async getPersonalized(userId, limit = 8) {
    const safeLimit = Math.min(20, Math.max(1, Number(limit) || 8));
    const signals = await recommendationRepository.getUserSignals(userId);

    if (
      signals.categoryWeights.size === 0 &&
      signals.brandWeights.size === 0 &&
      signals.cityWeights.size === 0
    ) {
      return recommendationRepository.findPopular({
        excludedProductIds: signals.excludedProductIds,
        limit: safeLimit,
      });
    }

    const candidates = await recommendationRepository.findPersonalizedCandidates({
      categoryIds: [...signals.categoryWeights.keys()],
      brands: [...signals.brandWeights.keys()],
      cities: [...signals.cityWeights.keys()],
      excludedProductIds: signals.excludedProductIds,
    });

    if (candidates.length === 0) {
      return recommendationRepository.findPopular({
        excludedProductIds: signals.excludedProductIds,
        limit: safeLimit,
      });
    }

    return rank(
      candidates,
      (product) => scorePersonalizedCandidate(product, signals),
      safeLimit
    );
  }

  async getSimilar(productId, limit = 8) {
    const safeLimit = Math.min(20, Math.max(1, Number(limit) || 8));
    const target = await recommendationRepository.findProduct(productId);

    if (!target) return [];

    const candidates = await recommendationRepository.findSimilarCandidates({
      productId,
      categoryId: target.categoryId,
      limit: 120,
    });

    return rank(
      candidates,
      (product) => scoreSimilarCandidate(product, target),
      safeLimit
    );
  }
}

export {
  scorePersonalizedCandidate,
  scoreSimilarCandidate,
};

export const recommendationService = new RecommendationService();
