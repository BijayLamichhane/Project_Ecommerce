import { cartService } from "./cart.service.js";
import {
  sendSuccess,
  sendCreated,
  sendNoContent,
} from "../../utils/response.js";

export class CartController {
  async getCart(req, res, next) {
    try {
      const cart = await cartService.getCart(req.user.id);
      sendSuccess(res, cart);
    } catch (error) {
      next(error);
    }
  }

  async addItem(req, res, next) {
    try {
      const item = await cartService.addToCart(req.user.id, req.body);
      sendCreated(res, item, "Item added to cart");
    } catch (error) {
      next(error);
    }
  }

  async updateItem(req, res, next) {
    try {
      const item = await cartService.updateCartItem(
        req.user.id,
        req.params.id,
        req.body
      );
      sendSuccess(res, item, "Cart item updated");
    } catch (error) {
      next(error);
    }
  }

  async removeItem(req, res, next) {
    try {
      await cartService.removeItem(req.user.id, req.params.id);
      sendSuccess(res, null, "Item removed from cart");
    } catch (error) {
      next(error);
    }
  }

  async clearCart(req, res, next) {
    try {
      await cartService.clearCart(req.user.id);
      sendNoContent(res);
    } catch (error) {
      next(error);
    }
  }
}

export const cartController = new CartController();
