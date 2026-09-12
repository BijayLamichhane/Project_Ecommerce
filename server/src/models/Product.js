import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

const productImageSchema = new mongoose.Schema(
  {
    _id: { type: String, default: () => uuidv4() },
    url: { type: String, required: true },
    altText: { type: String },
    isPrimary: { type: Boolean, default: false },
    sortOrder: { type: Number, default: 0 },
    publicId: { type: String },
  },
  {
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        ret.id = ret._id;
        return ret;
      },
    },
  }
);

productImageSchema.virtual("id").get(function () {
  return this._id;
});

const productPricingSchema = new mongoose.Schema(
  {
    hourlyRate: { type: String, default: null },
    dailyRate: { type: String, default: null },
    weeklyRate: { type: String, default: null },
    monthlyRate: { type: String, default: null },
    securityDeposit: { type: String, required: true, default: "0" },
    serviceFeePercent: { type: String, default: "10" },
    deliveryFee: { type: String, default: "0" },
    minimumRentalDays: { type: Number, default: 1 },
    maximumRentalDays: { type: Number, default: 365 },
  },
  { _id: false }
);

const productRulesSchema = new mongoose.Schema(
  {
    rules: [{ type: String }],
    restrictions: [{ type: String }],
    requirements: [{ type: String }],
    cancellationPolicy: { type: String, default: "flexible" },
    advanceBookingDays: { type: Number, default: 0 },
    instantBook: { type: Boolean, default: false },
  },
  { _id: false }
);

const productSchema = new mongoose.Schema(
  {
    _id: { type: String, default: () => uuidv4() },
    sellerId: { type: String, required: true, ref: "User" },
    categoryId: { type: String, required: true, ref: "Category" },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, required: true },
    shortDescription: { type: String },
    brand: { type: String },
    model: { type: String },
    condition: {
      type: String,
      enum: ["new", "like_new", "good", "fair", "poor"],
      default: "good",
    },
    status: {
      type: String,
      enum: ["active", "inactive", "suspended", "draft", "deleted"],
      default: "active",
    },
    city: { type: String },
    state: { type: String },
    totalQuantity: { type: Number, default: 1 },
    totalRentals: { type: Number, default: 0 },
    totalRatings: { type: Number, default: 0 },
    averageRating: { type: String, default: "0" },
    viewCount: { type: Number, default: 0 },
    isFeatured: { type: Boolean, default: false },
    images: [productImageSchema],
    pricing: { type: productPricingSchema, default: () => ({}) },
    rules: { type: productRulesSchema, default: () => ({}) },
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

productSchema.virtual("id").get(function () {
  return this._id;
});

productSchema.virtual("category", {
  ref: "Category",
  localField: "categoryId",
  foreignField: "_id",
  justOne: true,
});

productSchema.virtual("seller", {
  ref: "User",
  localField: "sellerId",
  foreignField: "_id",
  justOne: true,
});

export const Product = mongoose.models.Product || mongoose.model("Product", productSchema);
