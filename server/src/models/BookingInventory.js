import mongoose from "mongoose";

const reservationSchema = new mongoose.Schema(
  {
    bookingId: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    status: { type: String, enum: ["pending", "confirmed"], required: true },
    expiresAt: { type: Date, default: null },
  },
  { _id: false }
);

const bookingInventorySchema = new mongoose.Schema(
  {
    productId: { type: String, required: true, ref: "Product" },
    date: { type: Date, required: true },
    totalQuantity: { type: Number, required: true, min: 1 },
    reservedCount: { type: Number, required: true, min: 0, default: 0 },
    reservations: { type: [reservationSchema], default: [] },
  },
  { timestamps: true }
);

bookingInventorySchema.index({ productId: 1, date: 1 }, { unique: true });

export const BookingInventory =
  mongoose.models.BookingInventory ||
  mongoose.model("BookingInventory", bookingInventorySchema);
