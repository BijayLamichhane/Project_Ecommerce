import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

const bookingItemSchema = new mongoose.Schema(
  {
    _id: { type: String, default: () => uuidv4() },
    productId: { type: String, required: true, ref: "Product" },
    quantity: { type: Number, default: 1 },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    dailyRate: { type: String },
    baseRentalPrice: { type: String, required: true },
    securityDeposit: { type: String, required: true },
    durationDays: { type: Number, required: true },
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

bookingItemSchema.virtual("id").get(function () {
  return this._id;
});

bookingItemSchema.virtual("product", {
  ref: "Product",
  localField: "productId",
  foreignField: "_id",
  justOne: true,
});

const bookingTimelineSchema = new mongoose.Schema(
  {
    status: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    note: { type: String },
    actorId: { type: String },
  },
  { _id: false }
);

const bookingSchema = new mongoose.Schema(
  {
    _id: { type: String, default: () => uuidv4() },
    customerId: { type: String, required: true, ref: "User" },
    sellerId: { type: String, required: true, ref: "User" },
    status: {
      type: String,
      enum: [
        "pending",
        "confirmed",
        "rejected",
        "cancelled",
        "active",
        "return_requested",
        "returned",
        "completed",
        "disputed",
        "expired",
      ],
      default: "pending",
    },
    totalRentalPrice: { type: String, required: true },
    totalDeposit: { type: String, required: true },
    serviceFee: { type: String, required: true },
    deliveryFee: { type: String, default: "0" },
    totalAmount: { type: String, required: true },
    specialRequests: { type: String },
    bookingItems: [bookingItemSchema],
    timeline: [bookingTimelineSchema],
    expiresAt: { type: Date },
    confirmedAt: { type: Date },
    activatedAt: { type: Date },
    returnRequestedAt: { type: Date },
    returnedAt: { type: Date },
    completedAt: { type: Date },
    cancelledAt: { type: Date },
    cancellationReason: { type: String },
    disputeReason: { type: String },
    disputeRaisedBy: { type: String, ref: "User" },
    disputePreviousStatus: {
      type: String,
      enum: ["active", "return_requested", "returned"],
    },
    disputedAt: { type: Date },
    disputeResolutionNotes: { type: String },
    disputeResolvedBy: { type: String, ref: "User" },
    disputeResolvedAt: { type: Date },
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

bookingSchema.index({ status: 1, expiresAt: 1 });

bookingSchema.virtual("id").get(function () {
  return this._id;
});

bookingSchema.virtual("customer", {
  ref: "User",
  localField: "customerId",
  foreignField: "_id",
  justOne: true,
});

bookingSchema.virtual("seller", {
  ref: "User",
  localField: "sellerId",
  foreignField: "_id",
  justOne: true,
});

export const Booking = mongoose.models.Booking || mongoose.model("Booking", bookingSchema);
