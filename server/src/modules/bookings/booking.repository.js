import { Booking } from "../../models/Booking.js";
import { Product } from "../../models/Product.js";

export class BookingRepository {
  async findById(id) { return Booking.findById(id).populate("customer", "id name email avatarUrl").populate("seller", "id name email avatarUrl").populate("bookingItems.product").lean({ virtuals: true }); }
  async findByCustomer(customerId, status) { const filter = { customerId }; if (status) filter.status = status; return Booking.find(filter).populate("customer", "id name email avatarUrl").populate("seller", "id name email avatarUrl").populate("bookingItems.product").sort({ createdAt: -1 }).lean({ virtuals: true }); }
  async findBySeller(sellerId, status) { const filter = { sellerId }; if (status) filter.status = status; return Booking.find(filter).populate("customer", "id name email avatarUrl").populate("seller", "id name email avatarUrl").populate("bookingItems.product").sort({ createdAt: -1 }).lean({ virtuals: true }); }

  async findOverlappingBookings(productId, startDate, endDate, excludeBookingId) {
    const filter = { status: { $in: ["pending", "confirmed", "active", "return_requested"] }, bookingItems: { $elemMatch: { productId, startDate: { $lt: endDate }, endDate: { $gt: startDate } } } };
    if (excludeBookingId) filter._id = { $ne: excludeBookingId };
    const bookings = await Booking.find(filter).lean({ virtuals: true }); const results = [];
    for (const b of bookings) for (const item of b.bookingItems || []) if (String(item.productId) === String(productId) && new Date(item.startDate) < new Date(endDate) && new Date(item.endDate) > new Date(startDate)) results.push({ bookingId: b.id || b._id, status: b.status, startDate: item.startDate, endDate: item.endDate, quantity: Number(item.quantity || 0) });
    return results;
  }

  async createWithTransaction(data) {
    for (const item of data.items) {
      const overlaps = await this.findOverlappingBookings(item.productId, item.startDate, item.endDate);
      const bookedQty = overlaps.reduce((sum, overlap) => sum + Number(overlap.quantity || 0), 0);
      const product = await Product.findById(item.productId).select("totalQuantity").lean();
      const totalQuantity = Number(product?.totalQuantity || 1);
      if (Number(item.quantity) > totalQuantity - bookedQty) throw new Error(`PRODUCT_UNAVAILABLE:${item.productId}`);
    }
    const booking = await Booking.create({ _id: data.bookingId, customerId: data.customerId, sellerId: data.sellerId, status: "pending", totalRentalPrice: data.totalRentalPrice, totalDeposit: data.totalDeposit, serviceFee: data.serviceFee, deliveryFee: data.deliveryFee, totalAmount: data.totalAmount, specialRequests: data.specialRequests, bookingItems: data.items, timeline: [{ status: "pending", timestamp: new Date(), actorId: data.customerId, note: "Booking request submitted" }] });
    return booking.toJSON();
  }

  async updateStatus(id, status, extra = {}) {
    const statusTimestamps = {}; if (status === "confirmed") statusTimestamps.confirmedAt = new Date(); if (status === "active") statusTimestamps.activatedAt = new Date(); if (status === "return_requested") statusTimestamps.returnRequestedAt = new Date(); if (status === "returned") statusTimestamps.returnedAt = new Date(); if (status === "completed") statusTimestamps.completedAt = new Date(); if (status === "cancelled") statusTimestamps.cancelledAt = new Date();
    return Booking.findByIdAndUpdate(id, { $set: { status, ...statusTimestamps, ...extra }, $push: { timeline: { status, timestamp: new Date(), note: extra.rejectionReason || extra.cancellationReason || `Status changed to ${status}` } } }, { new: true }).populate("customer", "id name email avatarUrl").populate("seller", "id name email avatarUrl").populate("bookingItems.product").lean({ virtuals: true });
  }
}
export const bookingRepository = new BookingRepository();
