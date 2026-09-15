import { productService } from "./product.service.js";
import { sendSuccess, sendCreated, sendPaginated, sendError } from "../../utils/response.js";

export class ProductController {
  async search(req, res, next) { try { const result = await productService.search(req.query); sendPaginated(res, result.items, result.page, result.limit, result.total); } catch (error) { next(error); } }
  async getFeatured(req, res, next) { try { sendSuccess(res, await productService.getFeatured(), undefined); } catch (error) { next(error); } }
  async getById(req, res, next) { try { sendSuccess(res, await productService.getById(req.params.id, true)); } catch (error) { next(error); } }
  async getBySlug(req, res, next) { try { sendSuccess(res, await productService.getBySlug(req.params.slug, true)); } catch (error) { next(error); } }
  async getSellerProducts(req, res, next) { try { sendSuccess(res, await productService.getBySeller(req.params.sellerId ?? req.user.id)); } catch (error) { next(error); } }
  async create(req, res, next) { try { sendCreated(res, await productService.create(req.user.id, req.body), "Product created successfully"); } catch (error) { next(error); } }
  async update(req, res, next) { try { sendSuccess(res, await productService.update(req.params.id, req.user.id, req.body, req.user.role === "admin"), "Product updated successfully"); } catch (error) { next(error); } }
  async uploadImages(req, res, next) {
    try {
      if (!req.files || req.files.length === 0) return sendError(res, "VALIDATION_ERROR", "Please select at least one image file", 400);
      sendSuccess(res, await productService.uploadImages(req.params.id, req.user.id, req.files), "Images uploaded successfully");
    } catch (error) { next(error); }
  }
  async deleteImage(req, res, next) { try { await productService.deleteImage(req.params.id, req.params.imageId, req.user.id); sendSuccess(res, null, "Image deleted successfully"); } catch (error) { next(error); } }
  async delete(req, res, next) { try { await productService.delete(req.params.id, req.user.id, req.user.role === "admin"); sendSuccess(res, null, "Product deleted successfully"); } catch (error) { next(error); } }
}
export const productController = new ProductController();
