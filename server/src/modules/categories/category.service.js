import { categoryRepository } from "./category.repository.js";
import { getRedisClient, CacheKeys, CacheTTL } from "../../config/redis.js";
import { NotFoundError, ConflictError } from "../../middleware/errorHandler.js";

export class CategoryService {
  async getAll() {
    const redis = getRedisClient();
    const cacheKey = CacheKeys.categoryList();
    try {
      const cached = await redis.get(cacheKey);
      if (cached) return JSON.parse(cached);
    } catch {
      // Redis optional
    }

    const cats = await categoryRepository.findAll();
    try {
      await redis.setex(cacheKey, CacheTTL.categoryList, JSON.stringify(cats));
    } catch {
      // Redis optional
    }
    return cats;
  }

  async getById(id) {
    const cat = await categoryRepository.findById(id);
    if (!cat) throw new NotFoundError("Category");
    return cat;
  }

  async getBySlug(slug) {
    const cat = await categoryRepository.findBySlug(slug);
    if (!cat) throw new NotFoundError("Category");
    return cat;
  }

  async create(data) {
    const existing = await categoryRepository.findBySlug(data.slug);
    if (existing) throw new ConflictError("A category with this slug already exists");
    const created = await categoryRepository.create(data);
    if (!created) throw new NotFoundError("Category");
    await this.invalidateCache();
    return created;
  }

  async update(id, data) {
    await this.getById(id);
    if (data.slug) {
      const existing = await categoryRepository.findBySlug(data.slug);
      if (existing && existing.id !== id) {
        throw new ConflictError("A category with this slug already exists");
      }
    }
    const updated = await categoryRepository.update(id, data);
    if (!updated) throw new NotFoundError("Category");
    await this.invalidateCache();
    return updated;
  }

  async delete(id) {
    await this.getById(id);
    await categoryRepository.delete(id);
    await this.invalidateCache();
  }

  async invalidateCache() {
    try {
      const redis = getRedisClient();
      await redis.del(CacheKeys.categoryList());
    } catch {
      // Redis optional
    }
  }
}

export const categoryService = new CategoryService();
