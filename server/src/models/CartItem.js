import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

const cartItemSchema = new mongoose.Schema(
  {
    _id: { type: String, default: () => uuidv4() },
    userId: { type: String, required: true, ref: "User" },
    productId: { type: String, required: true, ref: "Product" },
    quantity: { type: Number, default: 1, min: 1 },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        ret.id = ret._id;
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform: (doc, ret) => {
        ret.id = ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

cartItemSchema.virtual("id").get(function () {
  return this._id;
});

cartItemSchema.virtual("product", {
  ref: "Product",
  localField: "productId",
  foreignField: "_id",
  justOne: true,
});

export const CartItem = mongoose.models.CartItem || mongoose.model("CartItem", cartItemSchema);
