import { Product } from "../../models/Product.js";

export class ProductRepository {
  async findById(id) {
    return Product.findById(id)
      .populate("category")
      .populate("seller", "id name email avatarUrl")
      .lean({ virtuals: true });
  }

  async findBySlug(slug) {
    return Product.findOne({ slug })
      .populate("category")
      .populate("seller", "id name email avatarUrl")
      .lean({ virtuals: true });
  }

  async findBySeller(sellerId) {
    return Product.find({ sellerId, status: { $ne: "deleted" } })
      .populate("category")
      .sort({ createdAt: -1 })
      .lean({ virtuals: true });
  }

  async search(params) {
    const {
      q,
      categoryId,
      category: categorySlug,
      minPrice,
      maxPrice,
      city,
      rating,
      condition,
      page = 1,
      limit = 12,
      sortBy = "newest",
      unavailableProductIds = [],
    } = params;

    const filter = { status: "active" };

    if (q) {
      const regex = new RegExp(q, "i");
      filter.$or = [{ name: regex }, { description: regex }, { brand: regex }];
    }

    if (categoryId) {
      filter.categoryId = categoryId;
    }

    if (city) {
      filter.city = new RegExp(city, "i");
    }

    if (condition) {
      filter.condition = condition;
    }

    if (rating) {
      filter.averageRating = { $gte: String(rating) };
    }

    if (unavailableProductIds.length > 0) {
      filter._id = { $nin: unavailableProductIds };
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      filter["pricing.dailyRate"] = {};
      if (minPrice !== undefined) filter["pricing.dailyRate"].$gte = String(minPrice);
      if (maxPrice !== undefined) filter["pricing.dailyRate"].$lte = String(maxPrice);
    }

    let sort = { createdAt: -1 };
    switch (sortBy) {
      case "price_asc":
        sort = { "pricing.dailyRate": 1 };
        break;
      case "price_desc":
        sort = { "pricing.dailyRate": -1 };
        break;
      case "rating":
        sort = { averageRating: -1 };
        break;
      case "popular":
        sort = { totalRentals: -1 };
        break;
      case "newest":
      default:
        sort = { createdAt: -1 };
    }

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      Product.find(filter)
        .populate("category")
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean({ virtuals: true }),
      Product.countDocuments(filter),
    ]);

    return {
      items,
      total,
      page,
      limit,
    };
  }

  async create(data) {
    const product = await Product.create(data);
    return product.toJSON();
  }

  async update(id, data) {
    const updated = await Product.findByIdAndUpdate(
      id,
      { ...data },
      { new: true, runValidators: true }
    )
      .populate("category")
      .lean({ virtuals: true });
    return updated;
  }

  async delete(id) {
    await Product.findByIdAndUpdate(id, { status: "deleted" });
  }

  async addImage(data) {
    const { productId, ...imgData } = data;
    const updated = await Product.findByIdAndUpdate(
      productId,
      { $push: { images: imgData } },
      { new: true }
    ).lean({ virtuals: true });
    return updated?.images?.[updated.images.length - 1];
  }

  async deleteImage(imageId) {
    const updated = await Product.findOneAndUpdate(
      { "images._id": imageId },
      { $pull: { images: { _id: imageId } } },
      { new: true }
    ).lean({ virtuals: true });
    return updated;
  }

  async upsertPricing(data) {
    const { productId, ...pricingData } = data;
    return Product.findByIdAndUpdate(
      productId,
      { pricing: pricingData },
      { new: true }
    ).lean({ virtuals: true });
  }

  async upsertRules(data) {
    const { productId, ...rulesData } = data;
    return Product.findByIdAndUpdate(
      productId,
      { rules: rulesData },
      { new: true }
    ).lean({ virtuals: true });
  }

  async incrementViewCount(id) {
    await Product.findByIdAndUpdate(id, { $inc: { viewCount: 1 } });
  }

  async getFeatured(limit = 8) {
    return Product.find({ status: "active", isFeatured: true })
      .populate("category")
      .sort({ averageRating: -1 })
      .limit(limit)
      .lean({ virtuals: true });
  }
}

export const productRepository = new ProductRepository();
