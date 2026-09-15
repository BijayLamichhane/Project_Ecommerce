import { productService } from "./product.service.js";
import { sendSuccess, sendCreated, sendPaginated } from "../../utils/response.js";

export class ProductController {
  async search(req, res, next) {
    try {
      const result = await productService.search(req.query);
      sendPaginated(res, result.items, result.page, result.limit, result.total);
    } catch (error) {
      next(error);
    }
  }

  async getFeatured(req, res, next) {
    try {
      const products = await productService.getFeatured();
      sendSuccess(res, products);
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const product = await productService.getById(req.params.id, true);
      sendSuccess(res, product);
    } catch (error) {
      next(error);
    }
  }

  async getBySlug(req, res, next) {
    try {
      const product = await productService.getBySlug(req.params.slug, true);
      sendSuccess(res, product);
    } catch (error) {
      next(error);
    }
  }

  async getSellerProducts(req, res, next) {
    try {
      const sellerId = req.params.sellerId ?? req.user.id;
      const products = await productService.getBySeller(sellerId);
      sendSuccess(res, products);
    } catch (error) {
      next(error);
    }
  }

  async create(req, res, next) {
    try {
      const product = await productService.create(req.user.id, req.body);
      sendCreated(res, product, "Product created successfully");
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const isAdmin = req.user.role === "admin";
      const product = await productService.update(
        req.params.id,
        req.user.id,
        req.body,
        isAdmin
      );
      sendSuccess(res, product, "Product updated successfully");
    } catch (error) {
      next(error);
    }
  }

  async uploadImages(req, res, next) {
    try {
      const files = req.files;
      if (!files || files.length === 0) {
        return sendError(res, "VALIDATION_ERROR", "Please select at least one image file", 400);
      }
      const images = await productService.uploadImages(
        req.params.id,
        req.user.id,
        files
      );
      sendSuccess(res, images, "Images uploaded successfully");
    } catch (error) {
      next(error);
    }
  }

  async deleteImage(req, res, next) {
    try {
      await productService.deleteImage(
        req.params.id,
        req.params.imageId,
        req.user.id
      );
      sendSuccess(res, null, "Image deleted successfully");
    } catch (error) {
      next(error);
    }
  }

  async delete(req, res, next) {
    try {
      const isAdmin = req.user.role === "admin";
      await productService.delete(req.params.id, req.user.id, isAdmin);
      sendSuccess(res, null, "Product deleted successfully");
    } catch (error) {
      next(error);
    }
  }
}

export const productController = new ProductController();
