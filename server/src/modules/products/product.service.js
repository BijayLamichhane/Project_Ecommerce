import { productRepository } from "./product.repository.js";
import { getRedisClient, CacheKeys, CacheTTL } from "../../config/redis.js";
import { uploadImage as cloudUploadImage, deleteImage as cloudDeleteImage, CLOUDINARY_FOLDERS } from "../../config/cloudinary.js";
import { NotFoundError, ForbiddenError } from "../../middleware/errorHandler.js";
import { logger } from "../../utils/logger.js";
import { notificationService } from "../notifications/notification.service.js";
import { wishlistRepository } from "../wishlist/wishlist.repository.js";
import { env } from "../../config/env.js";
import { v4 as uuidv4 } from "uuid";
import fs from "node:fs/promises";
import path from "node:path";

function generateSlug(name, id) {
  const base = name.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").substring(0, 60);
  return `${base}-${id.substring(0, 8)}`;
}

export class ProductService {
  async getById(id, incrementView = false) {
    const redis = getRedisClient(); const cacheKey = CacheKeys.product(id);
    if (redis) { try { const cached = await redis.get(cacheKey); if (cached) { if (incrementView) await productRepository.incrementViewCount(id); return JSON.parse(cached); } } catch {} }
    const product = await productRepository.findById(id); if (!product) throw new NotFoundError("Product");
    if (redis) { try { await redis.setex(cacheKey, CacheTTL.product, JSON.stringify(product)); } catch {} }
    if (incrementView) await productRepository.incrementViewCount(id); return product;
  }
  async getBySlug(slug, incrementView = false) { const product = await productRepository.findBySlug(slug); if (!product) throw new NotFoundError("Product"); if (incrementView) await productRepository.incrementViewCount(product.id); return product; }
  async search(params) { return productRepository.search(params); }
  async getFeatured(limit) { return productRepository.getFeatured(limit); }
  async getBySeller(sellerId) { return productRepository.findBySeller(sellerId); }

  async create(sellerId, input) {
    const id = uuidv4(); const slug = generateSlug(input.name, id);
    const productData = { _id: id, sellerId, categoryId: input.categoryId, name: input.name, slug, description: input.description, shortDescription: input.shortDescription, brand: input.brand, model: input.model, condition: input.condition, city: input.city, state: input.state, totalQuantity: input.totalQuantity, specifications: input.specifications, tags: input.tags, pricing: { hourlyRate: input.pricing.hourlyRate ? String(input.pricing.hourlyRate) : null, dailyRate: input.pricing.dailyRate ? String(input.pricing.dailyRate) : null, weeklyRate: input.pricing.weeklyRate ? String(input.pricing.weeklyRate) : null, monthlyRate: input.pricing.monthlyRate ? String(input.pricing.monthlyRate) : null, securityDeposit: String(input.pricing.securityDeposit), serviceFeePercent: String(input.pricing.serviceFeePercent ?? 10), deliveryFee: String(input.pricing.deliveryFee ?? 0), minimumRentalDays: input.pricing.minimumRentalDays, maximumRentalDays: input.pricing.maximumRentalDays }, rules: input.rules || {} };
    const product = await productRepository.create(productData); return this.getById(product.id);
  }

  async update(productId, sellerId, input, isAdmin = false) {
    const existing = await productRepository.findById(productId); if (!existing) throw new NotFoundError("Product"); if (!isAdmin && String(existing.sellerId) !== String(sellerId)) throw new ForbiddenError();
    const updateData = {}; for (const field of ["categoryId","name","description","shortDescription","brand","model","condition","city","state","totalQuantity","specifications","tags"]) if (input[field] !== undefined) updateData[field] = input[field];
    if (input.pricing) updateData.pricing = { hourlyRate: input.pricing.hourlyRate ? String(input.pricing.hourlyRate) : null, dailyRate: input.pricing.dailyRate ? String(input.pricing.dailyRate) : null, weeklyRate: input.pricing.weeklyRate ? String(input.pricing.weeklyRate) : null, monthlyRate: input.pricing.monthlyRate ? String(input.pricing.monthlyRate) : null, securityDeposit: String(input.pricing.securityDeposit ?? 0), serviceFeePercent: String(input.pricing.serviceFeePercent ?? 10), deliveryFee: String(input.pricing.deliveryFee ?? 0), minimumRentalDays: input.pricing.minimumRentalDays, maximumRentalDays: input.pricing.maximumRentalDays };
    if (input.rules) updateData.rules = input.rules;
    await productRepository.update(productId, updateData); await this.invalidateProductCache(productId); return this.getById(productId);
  }

  async uploadImages(productId, sellerId, files) {
    const product = await productRepository.findById(productId); if (!product) throw new NotFoundError("Product"); if (String(product.sellerId) !== String(sellerId)) throw new ForbiddenError();
    const uploadedImages = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i]; const publicId = `product-${productId}-${Date.now()}-${i}`; let url = ""; let cloudPublicId = publicId;
      const hasCloudinary = Boolean(env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET);
      if (hasCloudinary) {
        try { const dataUri = `data:${file.mimetype};base64,${file.buffer.toString("base64")}`; const result = await cloudUploadImage(dataUri, CLOUDINARY_FOLDERS.products, publicId); url = result.url; cloudPublicId = result.publicId; }
        catch (err) { logger.warn({ err }, "Cloudinary upload failed, falling back to local storage"); }
      }
      if (!url) {
        const mimeSub = file.mimetype.split("/")[1] || "jpg"; const ext = mimeSub === "jpeg" ? "jpg" : mimeSub; const filename = `${publicId}.${ext}`; const uploadsDir = path.join(process.cwd(), "uploads", "products");
        try { await fs.mkdir(uploadsDir, { recursive: true }); await fs.writeFile(path.join(uploadsDir, filename), file.buffer); url = `/uploads/products/${filename}`; cloudPublicId = ""; }
        catch (err) { logger.error({ err }, "Local image storage failed"); throw err; }
      }
      uploadedImages.push(await productRepository.addImage({ productId, url, publicId: cloudPublicId, altText: product.name, sortOrder: (product.images?.length ?? 0) + i, isPrimary: i === 0 && (!product.images || product.images.length === 0) }));
    }
    await this.invalidateProductCache(productId); return uploadedImages;
  }

  async deleteImage(productId, imageId, sellerId) {
    const product = await productRepository.findById(productId); if (!product) throw new NotFoundError("Product"); if (String(product.sellerId) !== String(sellerId)) throw new ForbiddenError();
    const image = product.images?.find((img) => img.id === imageId || img._id === imageId); if (!image) throw new NotFoundError("Image");
    if (image.publicId && !image.url?.startsWith("/uploads/")) { try { await cloudDeleteImage(image.publicId); } catch (err) { logger.warn({ err }, "Failed to delete image from Cloudinary"); } }
    else if (image.url?.startsWith("/uploads/")) { const localPath = path.join(process.cwd(), image.url.replace(/^\//, "")); await fs.unlink(localPath).catch(() => {}); }
    await productRepository.deleteImage(imageId); await this.invalidateProductCache(productId);
  }
  async updateStatus(productId, sellerId, status) {
    const product = await productRepository.findById(productId);
    if (!product) throw new NotFoundError("Product");
    if (String(product.sellerId) !== String(sellerId)) throw new ForbiddenError();

    const update = { status };
    if (status === "inactive") {
      update.isFeatured = false;
    }

    const updated = await productRepository.update(productId, update);
    await this.invalidateProductCache(productId);

    try {
      const subscriberIds = await wishlistRepository.findUserIdsByProductId(productId);
      await Promise.all(subscriberIds
        .filter((userId) => String(userId) !== String(sellerId))
        .map((userId) => notificationService.notifyUser(userId, {
          type: status === "active" ? "wishlisted_product_available" : "wishlisted_product_unavailable",
          title: status === "active" ? "Wishlisted listing is available" : "Wishlisted listing is unavailable",
          message: status === "active"
            ? `Your wishlisted listing "${product.name}" is available again.`
            : `Your wishlisted listing "${product.name}" is currently unavailable.`,
          actionUrl: `/products/${encodeURIComponent(productId)}`,
        })));
    } catch (error) {
      logger.warn({ error, productId }, "Failed to notify wishlist subscribers");
    }

    return updated;
  }
  async delete(productId, sellerId, isAdmin = false) { const product = await productRepository.findById(productId); if (!product) throw new NotFoundError("Product"); if (!isAdmin && String(product.sellerId) !== String(sellerId)) throw new ForbiddenError(); await productRepository.delete(productId); await this.invalidateProductCache(productId); }
  async invalidateProductCache(productId) { const redis = getRedisClient(); if (!redis) return; try { await redis.del(CacheKeys.product(productId)); } catch {} }
}
export const productService = new ProductService();
