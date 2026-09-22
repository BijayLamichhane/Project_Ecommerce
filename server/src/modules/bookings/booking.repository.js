import { Booking } from "../../models/Booking.js";
import { bookingInventoryRepository } from "./booking.inventory.repository.js";

const BLOCKING_STATUSES = [
  "pending",
  "confirmed",
  "active",
  "return_requested",
  "disputed",
];

function populateBooking(query) {
  return query
    .populate("customer", "id name email avatarUrl")
    .populate("seller", "id name email avatarUrl")
    .populate("bookingItems.product")
    .lean({ virtuals: true });
}

function bookingIdOf(booking) {
  return booking?.id || booking?._id;
}

export class BookingRepository {
  async selfHealExpiredBooking(booking, now = new Date()) {
    if (
      !booking ||
      booking.status !== "pending" ||
      !booking.expiresAt ||
      new Date(booking.expiresAt) > now
    ) {
      return booking;
    }

    const id = bookingIdOf(booking);
    const updated = await Booking.findOneAndUpdate(
      { _id: id, status: "pending", expiresAt: { $lte: now } },
      {
        $set: { status: "expired" },
        $push: {
          timeline: {
            status: "expired",
            timestamp: now,
            note: "Payment hold expired",
          },
        },
      },
      { new: true }
    ).lean({ virtuals: true });

    return {
      ...booking,
      status: "expired",
      timeline:
        updated?.timeline ||
        [
          ...(booking.timeline || []),
          { status: "expired", timestamp: now, note: "Payment hold expired" },
        ],
    };
  }

  async findById(id) {
    const booking = await populateBooking(Booking.findById(id));
    return this.selfHealExpiredBooking(booking);
  }

  async findByCustomer(customerId, status) {
    const filter = { customerId };
    if (status) filter.status = status;

    const bookings = await populateBooking(
      Booking.find(filter).sort({ createdAt: -1 })
    );
    const healed = await Promise.all(bookings.map((booking) => this.selfHealExpiredBooking(booking)));
    return status === "pending"
      ? healed.filter((booking) => booking.status === "pending")
      : healed;
  }

  async findBySeller(sellerId, status) {
    const filter = { sellerId };
    if (status) filter.status = status;

    const bookings = await populateBooking(
      Booking.find(filter).sort({ createdAt: -1 })
    );
    const healed = await Promise.all(bookings.map((booking) => this.selfHealExpiredBooking(booking)));
    return status === "pending"
      ? healed.filter((booking) => booking.status === "pending")
      : healed;
  }

  async findExpiredPendingBookings(now = new Date()) {
    return Booking.find({
      status: "pending",
      expiresAt: { $lte: now, $ne: null },
    })
      .sort({ expiresAt: 1 })
      .limit(100)
      .lean({ virtuals: true });
  }

  async backfillPendingExpiry(ttlMinutes) {
    const legacyBookings = await Booking.find({
      status: "pending",
      $or: [{ expiresAt: { $exists: false } }, { expiresAt: null }],
    })
      .select("_id createdAt")
      .lean();

    const ttlMs = ttlMinutes * 60 * 1000;
    for (const booking of legacyBookings) {
      const createdAt = new Date(booking.createdAt || Date.now());
      await Booking.updateOne(
        {
          _id: booking._id,
          status: "pending",
          $or: [{ expiresAt: { $exists: false } }, { expiresAt: null }],
        },
        { $set: { expiresAt: new Date(createdAt.getTime() + ttlMs) } }
      );
    }

    return legacyBookings.length;
  }

  async markExpired(id, now = new Date()) {
    return populateBooking(
      Booking.findOneAndUpdate(
        { _id: id, status: "pending", expiresAt: { $lte: now, $ne: null } },
        {
          $set: { status: "expired" },
          $push: {
            timeline: {
              status: "expired",
              timestamp: now,
              note: "Payment hold expired",
            },
          },
        },
        { new: true }
      )
    );
  }

  async findOverlappingBookings(productId, startDate, endDate, excludeBookingId) {
    const now = new Date();
    const filter = {
      status: { $in: BLOCKING_STATUSES },
      $or: [
        { status: { $ne: "pending" } },
        { status: "pending", expiresAt: { $gt: now } },
      ],
      bookingItems: {
        $elemMatch: {
          productId,
          startDate: { $lt: endDate },
          endDate: { $gt: startDate },
        },
      },
    };

    if (excludeBookingId) filter._id = { $ne: excludeBookingId };

    const bookings = await Booking.find(filter).lean({ virtuals: true });
    const results = [];

    for (const booking of bookings) {
      for (const item of booking.bookingItems || []) {
        if (
          String(item.productId) === String(productId) &&
          new Date(item.startDate) < new Date(endDate) &&
          new Date(item.endDate) > new Date(startDate)
        ) {
          results.push({
            bookingId: booking.id || booking._id,
            status: booking.status,
            startDate: item.startDate,
            endDate: item.endDate,
            quantity: Number(item.quantity || 0),
          });
        }
      }
    }

    return results;
  }

  async createWithTransaction(data) {
    try {
      await bookingInventoryRepository.reserveItems(
        data.bookingId,
        data.items,
        "pending",
        data.expiresAt
      );

      const booking = await Booking.create({
        _id: data.bookingId,
        customerId: data.customerId,
        sellerId: data.sellerId,
        status: "pending",
        expiresAt: data.expiresAt,
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
            note: "Booking request submitted; awaiting customer payment",
          },
        ],
      });

      return booking.toJSON();
    } catch (error) {
      await bookingInventoryRepository.releaseBooking(data.bookingId);
      throw error;
    }
  }

  async cancelPending(id, extra = {}) {
    const now = new Date();

    return populateBooking(
      Booking.findOneAndUpdate(
        { _id: id, status: "pending" },
        {
          $set: {
            status: "cancelled",
            cancelledAt: now,
            ...extra,
          },
          $push: {
            timeline: {
              status: "cancelled",
              timestamp: now,
              note: extra.cancellationReason || "Payment cancelled by customer",
              actorId: extra.actorId,
            },
          },
        },
        { new: true }
      )
    );
  }

  async updateStatus(id, status, extra = {}) {
    const statusTimestamps = {};
    if (status === "confirmed") statusTimestamps.confirmedAt = new Date();
    if (status === "active") statusTimestamps.activatedAt = new Date();
    if (status === "return_requested") statusTimestamps.returnRequestedAt = new Date();
    if (status === "returned") statusTimestamps.returnedAt = new Date();
    if (status === "completed") statusTimestamps.completedAt = new Date();
    if (status === "cancelled") statusTimestamps.cancelledAt = new Date();

    return populateBooking(
      Booking.findByIdAndUpdate(
        id,
        {
          $set: { status, ...statusTimestamps, ...extra },
          $push: {
            timeline: {
              status,
              timestamp: new Date(),
              note:
                extra.rejectionReason ||
                extra.cancellationReason ||
                extra.note ||
                `Status changed to ${status}`,
              actorId: extra.actorId,
            },
          },
        },
        { new: true }
      )
    );
  }


  async resolveDispute(id, adminId, action, notes) {
    if (!["resolve", "dismiss"].includes(action)) return null;

    const booking = await Booking.findOne({
      _id: id,
      status: "disputed",
    }).lean();

    if (!booking) return null;

    const targetStatus =
      action === "resolve" ? "completed" : booking.disputePreviousStatus;

    if (!["active", "return_requested", "returned", "completed"].includes(targetStatus)) {
      return null;
    }

    return populateBooking(
      Booking.findOneAndUpdate(
        {
          _id: id,
          status: "disputed",
          ...(action === "dismiss"
            ? { disputePreviousStatus: targetStatus }
            : {}),
        },
        {
          $set: {
            status: targetStatus,
            disputeResolutionNotes: notes,
            disputeResolvedBy: adminId,
            disputeResolvedAt: new Date(),
            ...(targetStatus === "completed"
              ? { completedAt: new Date() }
              : {}),
          },
          $push: {
            timeline: {
              status: targetStatus,
              timestamp: new Date(),
              note:
                action === "resolve"
                  ? `Dispute resolved by admin: ${notes}`
                  : `Dispute dismissed by admin: ${notes}`,
              actorId: adminId,
            },
          },
        },
        { new: true }
      )
    );
  }

  async confirmPendingAfterPayment(id) {
    return populateBooking(
      Booking.findOneAndUpdate(
        { _id: id, status: "pending" },
        {
          $set: { status: "confirmed", confirmedAt: new Date() },
          $push: {
            timeline: {
              status: "confirmed",
              timestamp: new Date(),
              note: "Payment received; booking confirmed",
            },
          },
        },
        { new: true }
      )
    );
  }

  async confirmExpiredAfterPayment(id) {
    return populateBooking(
      Booking.findOneAndUpdate(
        { _id: id, status: "expired" },
        {
          $set: { status: "confirmed", confirmedAt: new Date() },
          $push: {
            timeline: {
              status: "confirmed",
              timestamp: new Date(),
              note: "Late payment received while dates were still available; booking confirmed",
            },
          },
        },
        { new: true }
      )
    );
  }
}

export const bookingRepository = new BookingRepository();
