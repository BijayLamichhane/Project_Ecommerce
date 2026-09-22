import { Wishlist } from "../../models/Wishlist.js";

export class WishlistRepository {
  async findByUserId(userId) {
    const items = await Wishlist.find({ userId })
      .populate({
        path: "product",
        populate: [
          { path: "category" },
        ],
      })
      .sort({ createdAt: -1 })
      .lean({ virtuals: true });
    // A wishlisted product can be deleted later, leaving the populate empty —
    // drop those rather than send the client an item with no product to show.
    return items.filter((item) => !!item.product);
  }

  async findUserIdsByProductId(productId) {
    const items = await Wishlist.find({ productId }).select("userId").lean();
    return items.map((item) => String(item.userId));
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
