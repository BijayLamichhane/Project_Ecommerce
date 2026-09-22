import { Booking } from "../../models/Booking.js";
import { Product } from "../../models/Product.js";
import { Wishlist } from "../../models/Wishlist.js";

const PREFERENCE_BOOKING_STATUSES = [
  "confirmed",
  "active",
  "return_requested",
  "returned",
  "completed",
];

const productProjection =
  "_id categoryId name slug description shortDescription brand model condition status city state totalQuantity totalRentals totalRatings averageRating isFeatured images pricing createdAt";

const uniqueStrings = (values) => [...new Set(values.filter(Boolean).map(String))];

export class RecommendationRepository {
  async getUserSignals(userId) {
    const [wishlistItems, bookings] = await Promise.all([
      Wishlist.find({ userId })
        .sort({ createdAt: -1 })
        .limit(30)
        .select("productId")
        .lean(),
      Booking.find({
        customerId: userId,
        status: { $in: PREFERENCE_BOOKING_STATUSES },
      })
        .sort({ createdAt: -1 })
        .limit(30)
        .select("bookingItems")
        .lean(),
    ]);

    const bookedProductIds = uniqueStrings(
      bookings.flatMap((booking) =>
        (booking.bookingItems || []).map((item) => item.productId)
      )
    );
    const wishlistedProductIds = uniqueStrings(
      wishlistItems.map((item) => item.productId)
    );
    const signalProductIds = uniqueStrings([
      ...bookedProductIds,
      ...wishlistedProductIds,
    ]);

    if (signalProductIds.length === 0) {
      return {
        excludedProductIds: [],
        categoryWeights: new Map(),
        brandWeights: new Map(),
        cityWeights: new Map(),
      };
    }

    const products = await Product.find({
      _id: { $in: signalProductIds },
      status: { $ne: "deleted" },
    })
      .select("_id categoryId brand city")
      .lean();

    const categoryWeights = new Map();
    const brandWeights = new Map();
    const cityWeights = new Map();

    for (const product of products) {
      const weight = wishlistedProductIds.includes(String(product._id)) ? 1.5 : 1;

      if (product.categoryId) {
        const key = String(product.categoryId);
        categoryWeights.set(key, (categoryWeights.get(key) || 0) + weight);
      }

      if (product.brand?.trim()) {
        const key = product.brand.trim().toLowerCase();
        brandWeights.set(key, (brandWeights.get(key) || 0) + weight);
      }

      if (product.city?.trim()) {
        const key = product.city.trim().toLowerCase();
        cityWeights.set(key, (cityWeights.get(key) || 0) + weight);
      }
    }

    return {
      excludedProductIds: signalProductIds,
      categoryWeights,
      brandWeights,
      cityWeights,
    };
  }

  async findPersonalizedCandidates({
    categoryIds = [],
    brands = [],
    cities = [],
    excludedProductIds = [],
    limit = 120,
  }) {
    const or = [];

    if (categoryIds.length) {
      or.push({ categoryId: { $in: categoryIds } });
    }
    if (brands.length) {
      or.push({ brand: { $in: brands } });
    }
    if (cities.length) {
      or.push({ city: { $in: cities } });
    }

    const filter = {
      status: "active",
      ...(excludedProductIds.length
        ? { _id: { $nin: excludedProductIds } }
        : {}),
      ...(or.length ? { $or: or } : {}),
    };

    return Product.find(filter)
      .select(productProjection)
      .limit(limit)
      .lean({ virtuals: true });
  }

  async findPopular({ excludedProductIds = [], limit = 12 } = {}) {
    return Product.find({
      status: "active",
      ...(excludedProductIds.length
        ? { _id: { $nin: excludedProductIds } }
        : {}),
    })
      .select(productProjection)
      .sort({
        isFeatured: -1,
        totalRentals: -1,
        averageRating: -1,
        createdAt: -1,
      })
      .limit(limit)
      .lean({ virtuals: true });
  }

  async findProduct(productId) {
    return Product.findOne({
      _id: productId,
      status: "active",
    })
      .select(productProjection)
      .lean({ virtuals: true });
  }

  async findSimilarCandidates({
    productId,
    categoryId,
    excludedProductIds = [],
    limit = 120,
  }) {
    const sameCategoryFilter = {
      _id: {
        $nin: uniqueStrings([productId, ...excludedProductIds]),
      },
      status: "active",
      categoryId,
    };

    const sameCategory = await Product.find(sameCategoryFilter)
      .select(productProjection)
      .limit(limit)
      .lean({ virtuals: true });

    if (sameCategory.length >= Math.min(limit, 4)) {
      return sameCategory;
    }

    const broader = await Product.find({
      _id: {
        $nin: uniqueStrings([
          productId,
          ...excludedProductIds,
          ...sameCategory.map((product) => product._id),
        ]),
      },
      status: "active",
    })
      .select(productProjection)
      .limit(limit)
      .lean({ virtuals: true });

    return [...sameCategory, ...broader].slice(0, limit);
  }
}

export const recommendationRepository = new RecommendationRepository();
