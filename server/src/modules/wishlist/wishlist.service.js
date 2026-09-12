import { wishlistRepository } from "./wishlist.repository.js";
import { productRepository } from "../products/product.repository.js";
import { NotFoundError } from "../../middleware/errorHandler.js";

export class WishlistService {
  async getWishlist(userId) {
    return wishlistRepository.findByUserId(userId);
  }

  async toggleWishlist(userId, productId) {
    const product = await productRepository.findById(productId);
    if (!product) throw new NotFoundError("Product");

    const existing = await wishlistRepository.findByUserAndProduct(userId, productId);
    if (existing) {
      await wishlistRepository.remove(userId, productId);
      return { isInWishlist: false };
    } else {
      await wishlistRepository.add(userId, productId);
      return { isInWishlist: true };
    }
  }

  async isInWishlist(userId, productId) {
    const item = await wishlistRepository.findByUserAndProduct(userId, productId);
    return { isInWishlist: !!item };
  }
}

export const wishlistService = new WishlistService();
