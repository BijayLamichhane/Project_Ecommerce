import { Wishlist } from "../../models/Wishlist.js";

export class WishlistRepository {
  async findByUserId(userId) {
    return Wishlist.find({ userId })
      .populate({
        path: "product",
        populate: [
          { path: "category" },
        ],
      })
      .sort({ createdAt: -1 })
      .lean({ virtuals: true });
  }

  async findByUserAndProduct(userId, productId) {
    return Wishlist.findOne({ userId, productId }).lean({ virtuals: true });
  }

  async add(userId, productId) {
    const item = await Wishlist.create({ userId, productId });
    return item.toJSON();
  }

  async remove(userId, productId) {
    return Wishlist.findOneAndDelete({ userId, productId }).lean({ virtuals: true });
  }
}

export const wishlistRepository = new WishlistRepository();
