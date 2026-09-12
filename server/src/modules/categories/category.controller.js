import { categoryService } from "./category.service.js";
import { sendSuccess, sendCreated, sendNoContent } from "../../utils/response.js";

export class CategoryController {
  async getAll(req, res, next) {
    try {
      const categories = await categoryService.getAll();
      sendSuccess(res, categories);
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const category = await categoryService.getById(req.params.id);
      sendSuccess(res, category);
    } catch (error) {
      next(error);
    }
  }

  async getBySlug(req, res, next) {
    try {
      const category = await categoryService.getBySlug(req.params.slug);
      sendSuccess(res, category);
    } catch (error) {
      next(error);
    }
  }

  async create(req, res, next) {
    try {
      const category = await categoryService.create(req.body);
      sendCreated(res, category, "Category created successfully");
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const category = await categoryService.update(req.params.id, req.body);
      sendSuccess(res, category, "Category updated successfully");
    } catch (error) {
      next(error);
    }
  }

  async delete(req, res, next) {
    try {
      await categoryService.delete(req.params.id);
      sendNoContent(res);
    } catch (error) {
      next(error);
    }
  }
}

export const categoryController = new CategoryController();
