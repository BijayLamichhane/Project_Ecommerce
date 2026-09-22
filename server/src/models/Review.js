import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

const reviewSchema = new mongoose.Schema(
  {
    _id: { type: String, default: () => uuidv4() },
    productId: { type: String, required: true, ref: "Product" },
    bookingId: { type: String, required: false, ref: "Booking" },
    sellerId: { type: String, required: false, ref: "User" },
    reviewerId: { type: String, required: true, ref: "User" },
    rating: { type: Number, required: true, min: 1, max: 5 },
    title: { type: String },
    comment: { type: String, required: true },
    sellerResponse: { type: String },
    sellerRespondedAt: { type: Date },
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

reviewSchema.index({ productId: 1, reviewerId: 1 }, { unique: true });

reviewSchema.virtual("id").get(function () {
  return this._id;
});

reviewSchema.virtual("reviewer", {
  ref: "User",
  localField: "reviewerId",
  foreignField: "_id",
  justOne: true,
});

export const Review = mongoose.models.Review || mongoose.model("Review", reviewSchema);
