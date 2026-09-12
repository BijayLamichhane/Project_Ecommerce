import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

const wishlistSchema = new mongoose.Schema(
  {
    _id: { type: String, default: () => uuidv4() },
    userId: { type: String, required: true, ref: "User" },
    productId: { type: String, required: true, ref: "Product" },
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

wishlistSchema.index({ userId: 1, productId: 1 }, { unique: true });

wishlistSchema.virtual("id").get(function () {
  return this._id;
});

wishlistSchema.virtual("product", {
  ref: "Product",
  localField: "productId",
  foreignField: "_id",
  justOne: true,
});

export const Wishlist = mongoose.models.Wishlist || mongoose.model("Wishlist", wishlistSchema);
