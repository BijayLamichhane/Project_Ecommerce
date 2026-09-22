import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

const paymentSchema = new mongoose.Schema(
  {
    _id: { type: String, default: () => uuidv4() },
    bookingId: { type: String, required: true, ref: "Booking" },
    userId: { type: String, required: true, ref: "User" },
    amount: { type: String, required: true },
    currency: { type: String, default: "NPR" },
    status: {
      type: String,
      enum: ["pending", "completed", "failed", "refunded", "cancelled"],
      default: "pending",
    },
    paymentMethod: { type: String, enum: ["esewa", "card"], default: "esewa" },
    transactionId: { type: String },
    paymentGatewayResponse: { type: mongoose.Schema.Types.Mixed },
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

paymentSchema.virtual("id").get(function () {
  return this._id;
});

export const Payment = mongoose.models.Payment || mongoose.model("Payment", paymentSchema);
