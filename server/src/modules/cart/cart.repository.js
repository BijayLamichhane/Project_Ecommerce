import { CartItem } from "../../models/CartItem.js";

export class CartRepository {
  async findByUserId(userId) {
    return CartItem.find({ userId })
      .populate({
        path: "product",
        populate: [
          { path: "category" },
          { path: "seller", select: "id name email" },
        ],
      })
      .sort({ createdAt: -1 })
      .lean({ virtuals: true });
  }

  async findById(id) {
    return CartItem.findById(id).lean({ virtuals: true });
  }

  async findByUserAndProduct(userId, productId) {
    return CartItem.findOne({ userId, productId }).lean({ virtuals: true });
  }

  async addItem(userId, data) {
    const item = await CartItem.create({
      userId,
      productId: data.productId,
      quantity: data.quantity,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
    });
    return item.toJSON();
  }

  async updateItem(id, data) {
    const updateData = {};
    if (data.quantity !== undefined) updateData.quantity = data.quantity;
    if (data.startDate) updateData.startDate = new Date(data.startDate);
    if (data.endDate) updateData.endDate = new Date(data.endDate);

    return CartItem.findByIdAndUpdate(id, updateData, { new: true }).lean({
      virtuals: true,
    });
  }

  async removeItem(id) {
    return CartItem.findByIdAndDelete(id).lean({ virtuals: true });
  }

  async clearCart(userId) {
    await CartItem.deleteMany({ userId });
  }
}

export const cartRepository = new CartRepository();
