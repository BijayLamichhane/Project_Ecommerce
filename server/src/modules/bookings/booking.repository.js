import { Booking } from "../../models/Booking.js";

export class BookingRepository {
  async findById(id) {
    return Booking.findById(id)
      .populate("customer", "id name email avatarUrl")
      .populate("seller", "id name email avatarUrl")
      .populate("bookingItems.product")
      .lean({ virtuals: true });
  }

  async findByCustomer(customerId, status) {
    const filter = { customerId };
    if (status) filter.status = status;

    return Booking.find(filter)
      .populate("customer", "id name email avatarUrl")
      .populate("seller", "id name email avatarUrl")
      .populate("bookingItems.product")
      .sort({ createdAt: -1 })
      .lean({ virtuals: true });
  }

  async findBySeller(sellerId, status) {
    const filter = { sellerId };
    if (status) filter.status = status;

    return Booking.find(filter)
      .populate("customer", "id name email avatarUrl")
      .populate("seller", "id name email avatarUrl")
      .populate("bookingItems.product")
      .sort({ createdAt: -1 })
      .lean({ virtuals: true });
  }

  async findOverlappingBookings(productId, startDate, endDate, excludeBookingId) {
    const filter = {
      // "returned" items are back in stock — only active or in-progress bookings count
      status: { $in: ["pending", "confirmed", "active", "return_requested"] },
      bookingItems: {
        $elemMatch: {
          productId,
          startDate: { $lt: endDate },
          endDate: { $gt: startDate },
        },
      },
    };

    if (excludeBookingId) {
      filter._id = { $ne: excludeBookingId };
    }

    const bookings = await Booking.find(filter).lean({ virtuals: true });
    const results = [];
    for (const b of bookings) {
      for (const item of b.bookingItems || []) {
        if (
          item.productId === productId &&
          new Date(item.startDate) < new Date(endDate) &&
          new Date(item.endDate) > new Date(startDate)
        ) {
          results.push({
            bookingId: b.id,
            status: b.status,
            startDate: item.startDate,
            endDate: item.endDate,
            quantity: item.quantity,
          });
        }
      }
    }
    return results;
  }

  async createWithTransaction(data) {
    for (const item of data.items) {
      const overlaps = await this.findOverlappingBookings(
        item.productId,
        item.startDate,
        item.endDate
      );
      const bookedQty = overlaps.reduce((sum, o) => sum + (o.quantity || 1), 0);
      if (bookedQty + (item.quantity || 1) > (item.totalQuantity || 1)) {
        throw new Error(`PRODUCT_UNAVAILABLE:${item.productId}`);
      }
    }

    const booking = await Booking.create({
      _id: data.bookingId,
      customerId: data.customerId,
      sellerId: data.sellerId,
      status: "pending",
      totalRentalPrice: data.totalRentalPrice,
      totalDeposit: data.totalDeposit,
      serviceFee: data.serviceFee,
      deliveryFee: data.deliveryFee,
      totalAmount: data.totalAmount,
      specialRequests: data.specialRequests,
      bookingItems: data.items,
      timeline: [
        {
          status: "pending",
          timestamp: new Date(),
          actorId: data.customerId,
          note: "Booking request submitted",
        },
      ],
    });

    return booking.toJSON();
  }

  async updateStatus(id, status, extra = {}) {
    const statusTimestamps = {};
    if (status === "confirmed") statusTimestamps.confirmedAt = new Date();
    if (status === "active") statusTimestamps.activatedAt = new Date();
    if (status === "return_requested") statusTimestamps.returnRequestedAt = new Date();
    if (status === "returned") statusTimestamps.returnedAt = new Date();
    if (status === "completed") statusTimestamps.completedAt = new Date();
    if (status === "cancelled") statusTimestamps.cancelledAt = new Date();

    const updated = await Booking.findByIdAndUpdate(
      id,
      {
        $set: {
          status,
          ...statusTimestamps,
          ...extra,
        },
        $push: {
          timeline: {
            status,
            timestamp: new Date(),
            note: extra.rejectionReason || extra.cancellationReason || `Status changed to ${status}`,
          },
        },
      },
      { new: true }
    )
      .populate("customer", "id name email avatarUrl")
      .populate("seller", "id name email avatarUrl")
      .populate("bookingItems.product")
      .lean({ virtuals: true });

    return updated;
  }
}

export const bookingRepository = new BookingRepository();
