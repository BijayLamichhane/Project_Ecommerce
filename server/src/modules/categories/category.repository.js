import { Category } from "../../models/Category.js";

export class CategoryRepository {
  async findAll() {
    return Category.find({ isActive: true })
      .sort({ sortOrder: 1, name: 1 })
      .lean({ virtuals: true });
  }

  async findById(id) {
    return Category.findById(id).lean({ virtuals: true });
  }

  async findBySlug(slug) {
    return Category.findOne({ slug }).lean({ virtuals: true });
  }

  async findRootCategories() {
    return Category.find({ isActive: true, parentId: { $exists: false } })
      .sort({ sortOrder: 1 })
      .lean({ virtuals: true });
  }

  async create(data) {
    const created = await Category.create(data);
    return created.toJSON();
  }

  async update(id, data) {
    const updated = await Category.findByIdAndUpdate(
      id,
      { ...data },
      { new: true, runValidators: true }
    ).lean({ virtuals: true });
    return updated;
  }

  async delete(id) {
    const deleted = await Category.findByIdAndDelete(id).lean({ virtuals: true });
    return deleted;
  }
}

export const categoryRepository = new CategoryRepository();
