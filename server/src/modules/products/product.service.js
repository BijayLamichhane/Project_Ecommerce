import { productRepository } from "./product.repository.js";
import { getRedisClient, CacheKeys, CacheTTL } from "../../config/redis.js";
import { uploadImage as cloudUploadImage, deleteImage as cloudDeleteImage, CLOUDINARY_FOLDERS } from "../../config/cloudinary.js";
import { NotFoundError, ForbiddenError } from "../../middleware/errorHandler.js";
import { logger } from "../../utils/logger.js";
import { v4 as uuidv4 } from "uuid";

function generateSlug(name, id) {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .substring(0, 60);
  return `${base}-${id.substring(0, 8)}`;
}

export class ProductService {
  async getById(id, incrementView = false) {
    const redis = getRedisClient();
    const cacheKey = CacheKeys.product(id);
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        if (incrementView) await productRepository.incrementViewCount(id);
        return JSON.parse(cached);
      }
    } catch {
      // Redis optional
    }

    const product = await productRepository.findById(id);
    if (!product) throw new NotFoundError("Product");

    try {
      await redis.setex(cacheKey, CacheTTL.product, JSON.stringify(product));
    } catch {
      // Redis optional
    }

    if (incrementView) await productRepository.incrementViewCount(id);
    return product;
  }

  async getBySlug(slug, incrementView = false) {
    const product = await productRepository.findBySlug(slug);
    if (!product) throw new NotFoundError("Product");
    if (incrementView) await productRepository.incrementViewCount(product.id);
    return product;
  }

  async search(params) {
    return productRepository.search(params);
  }

  async getFeatured(limit) {
    return productRepository.getFeatured(limit);
  }

  async getBySeller(sellerId) {
    return productRepository.findBySeller(sellerId);
  }

  async create(sellerId, input) {
    const id = uuidv4();
    const slug = generateSlug(input.name, id);

    const productData = {
      _id: id,
      sellerId,
      categoryId: input.categoryId,
      name: input.name,
      slug,
      description: input.description,
      shortDescription: input.shortDescription,
      brand: input.brand,
      model: input.model,
      condition: input.condition,
      city: input.city,
      state: input.state,
      totalQuantity: input.totalQuantity,
      specifications: input.specifications,
      tags: input.tags,
      pricing: {
        hourlyRate: input.pricing.hourlyRate ? String(input.pricing.hourlyRate) : null,
        dailyRate: input.pricing.dailyRate ? String(input.pricing.dailyRate) : null,
        weeklyRate: input.pricing.weeklyRate ? String(input.pricing.weeklyRate) : null,
        monthlyRate: input.pricing.monthlyRate ? String(input.pricing.monthlyRate) : null,
        securityDeposit: String(input.pricing.securityDeposit),
        serviceFeePercent: String(input.pricing.serviceFeePercent ?? 10),
        deliveryFee: String(input.pricing.deliveryFee ?? 0),
        minimumRentalDays: input.pricing.minimumRentalDays,
        maximumRentalDays: input.pricing.maximumRentalDays,
      },
      rules: input.rules || {},
    };

    const product = await productRepository.create(productData);
    return this.getById(product.id);
  }

  async update(productId, sellerId, input, isAdmin = false) {
    const existing = await productRepository.findById(productId);
    if (!existing) throw new NotFoundError("Product");
    if (!isAdmin && existing.sellerId !== sellerId) throw new ForbiddenError();

    const updateData = {};
    if (input.categoryId !== undefined) updateData.categoryId = input.categoryId;
    if (input.name !== undefined) updateData.name = input.name;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.shortDescription !== undefined) updateData.shortDescription = input.shortDescription;
    if (input.brand !== undefined) updateData.brand = input.brand;
    if (input.model !== undefined) updateData.model = input.model;
    if (input.condition !== undefined) updateData.condition = input.condition;
    if (input.city !== undefined) updateData.city = input.city;
    if (input.state !== undefined) updateData.state = input.state;
    if (input.totalQuantity !== undefined) updateData.totalQuantity = input.totalQuantity;
    if (input.specifications !== undefined) updateData.specifications = input.specifications;
    if (input.tags !== undefined) updateData.tags = input.tags;

    if (input.pricing) {
      updateData.pricing = {
        hourlyRate: input.pricing.hourlyRate ? String(input.pricing.hourlyRate) : null,
        dailyRate: input.pricing.dailyRate ? String(input.pricing.dailyRate) : null,
        weeklyRate: input.pricing.weeklyRate ? String(input.pricing.weeklyRate) : null,
        monthlyRate: input.pricing.monthlyRate ? String(input.pricing.monthlyRate) : null,
        securityDeposit: String(input.pricing.securityDeposit ?? 0),
        serviceFeePercent: String(input.pricing.serviceFeePercent ?? 10),
        deliveryFee: String(input.pricing.deliveryFee ?? 0),
        minimumRentalDays: input.pricing.minimumRentalDays,
        maximumRentalDays: input.pricing.maximumRentalDays,
      };
    }

    if (input.rules) {
      updateData.rules = input.rules;
    }

    await productRepository.update(productId, updateData);
    await this.invalidateProductCache(productId);
    return this.getById(productId);
  }

  async uploadImages(productId, sellerId, files) {
    const product = await productRepository.findById(productId);
    if (!product) throw new NotFoundError("Product");
    if (product.sellerId !== sellerId) throw new ForbiddenError();

    const uploadedImages = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const publicId = `product-${productId}-${Date.now()}-${i}`;
      let url = "";
      let cloudPublicId = publicId;

      try {
        const dataUri = `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;
        const result = await cloudUploadImage(dataUri, CLOUDINARY_FOLDERS.products, publicId);
        url = result.url;
        cloudPublicId = result.publicId;
      } catch (err) {
        logger.warn({ err }, "Cloudinary upload failed, using placeholder");
        url = `https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800`;
      }

      const image = await productRepository.addImage({
        productId,
        url,
        publicId: cloudPublicId,
        altText: product.name,
        sortOrder: (product.images?.length ?? 0) + i,
        isPrimary: i === 0 && (!product.images || product.images.length === 0),
      });
      uploadedImages.push(image);
    }

    await this.invalidateProductCache(productId);
    return uploadedImages;
  }

  async deleteImage(productId, imageId, sellerId) {
    const product = await productRepository.findById(productId);
    if (!product) throw new NotFoundError("Product");
    if (product.sellerId !== sellerId) throw new ForbiddenError();

    const image = product.images?.find((img) => img.id === imageId || img._id === imageId);
    if (!image) throw new NotFoundError("Image");

    if (image.publicId) {
      try {
        await cloudDeleteImage(image.publicId);
      } catch (err) {
        logger.warn({ err }, "Failed to delete image from Cloudinary");
      }
    }

    await productRepository.deleteImage(imageId);
    await this.invalidateProductCache(productId);
  }

  async updateStatus(productId, status) {
    await productRepository.update(productId, { status });
    await this.invalidateProductCache(productId);
  }

  async delete(productId, sellerId, isAdmin = false) {
    const product = await productRepository.findById(productId);
    if (!product) throw new NotFoundError("Product");
    if (!isAdmin && product.sellerId !== sellerId) throw new ForbiddenError();

    await productRepository.delete(productId);
    await this.invalidateProductCache(productId);
  }

  async invalidateProductCache(productId) {
    try {
      const redis = getRedisClient();
      await redis.del(CacheKeys.product(productId));
    } catch {
      // Redis optional
    }
  }
}

export const productService = new ProductService();
