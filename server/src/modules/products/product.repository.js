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

    // Product pricing is stored as strings for backward compatibility with
    // existing booking/payment data. Normalize the daily rate to a number
    // for filtering and sorting so values such as 2,000 are never compared
    // lexicographically against 200 or 300.
    const dailyRateExpression = {
      $convert: {
        input: {
          $replaceAll: {
            input: { $ifNull: ["$pricing.dailyRate", ""] },
            find: ",",
            replacement: "",
          },
        },
        to: "double",
        onError: null,
        onNull: null,
      },
    };

    if (minPrice !== undefined || maxPrice !== undefined) {
      const priceConditions = [];
      if (minPrice !== undefined) {
        priceConditions.push({ $gte: [dailyRateExpression, Number(minPrice)] });
      }
      if (maxPrice !== undefined) {
        priceConditions.push({ $lte: [dailyRateExpression, Number(maxPrice)] });
      }

      filter.$expr = priceConditions.length === 1
        ? priceConditions[0]
        : { $and: priceConditions };
    }

    const skip = (page - 1) * limit;
    const numericPriceSort =
      sortBy === "price_asc" ? 1 : sortBy === "price_desc" ? -1 : null;

    let itemsQuery;
    if (numericPriceSort) {
      itemsQuery = Product.aggregate([
        { $match: filter },
        { $addFields: { _numericDailyRate: dailyRateExpression } },
        { $sort: { _numericDailyRate: numericPriceSort, createdAt: -1 } },
        { $skip: skip },
        { $limit: limit },
        { $project: { _numericDailyRate: 0 } },
      ]);
    } else {
      let sort = { createdAt: -1 };
      switch (sortBy) {
        case "rating":
          sort = { averageRating: -1, createdAt: -1 };
          break;
        case "popular":
          sort = { totalRentals: -1, createdAt: -1 };
          break;
        case "newest":
        default:
          sort = { createdAt: -1 };
      }

      itemsQuery = Product.find(filter)
        .populate("category")
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean({ virtuals: true });
    }

    const [items, total] = await Promise.all([
      itemsQuery,
      Product.countDocuments(filter),
    ]);

    if (numericPriceSort) {
      await Product.populate(items, { path: "category" });
    }

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
