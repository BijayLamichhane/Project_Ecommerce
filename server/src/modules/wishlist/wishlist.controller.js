import { wishlistService } from "./wishlist.service.js";
import { sendSuccess } from "../../utils/response.js";

export class WishlistController {
  async getWishlist(req, res, next) {
    try {
      const items = await wishlistService.getWishlist(req.user.id);
      sendSuccess(res, items);
    } catch (error) {
      next(error);
    }
  }

  async toggleWishlist(req, res, next) {
    try {
      const { productId } = req.body;
      const result = await wishlistService.toggleWishlist(req.user.id, productId);
      sendSuccess(res, result, result.isInWishlist ? "Added to wishlist" : "Removed from wishlist");
    } catch (error) {
      next(error);
    }
  }

  async checkStatus(req, res, next) {
    try {
      const { productId } = req.params;
      const result = await wishlistService.isInWishlist(req.user.id, productId);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }
}

export const wishlistController = new WishlistController();
