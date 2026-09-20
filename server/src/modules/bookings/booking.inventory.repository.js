import { BookingInventory } from "../../models/BookingInventory.js";
import { Booking } from "../../models/Booking.js";
import { Product } from "../../models/Product.js";

function getReservationDates(startDate, endDate) {
  const dates = [];
  const current = new Date(startDate);
  const end = new Date(endDate);

  current.setUTCHours(0, 0, 0, 0);
  end.setUTCHours(0, 0, 0, 0);

  while (current < end) {
    dates.push(new Date(current));
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return dates;
}

async function ensureLedgerDay(productId, date, totalQuantity) {
  try {
    return await BookingInventory.findOneAndUpdate(
      { productId, date },
      {
        $setOnInsert: {
          productId,
          date,
          totalQuantity,
          reservedCount: 0,
          reservations: [],
        },
      },
      { upsert: true, new: true }
    );
  } catch (error) {
    if (error?.code !== 11000) throw error;
    return BookingInventory.findOne({ productId, date });
  }
}

async function removeExpiredPendingReservations(productId, date, now) {
  await BookingInventory.updateOne(
    { productId, date },
    [
      {
        $set: {
          reservations: {
            $filter: {
              input: "$reservations",
              as: "reservation",
              cond: {
                $or: [
                  { $ne: ["$$reservation.status", "pending"] },
                  { $gt: ["$$reservation.expiresAt", now] },
                ],
              },
            },
          },
        },
      },
      {
        $set: {
          reservedCount: { $sum: "$reservations.quantity" },
        },
      },
    ]
  );
}

export class BookingInventoryRepository {
  async reserveItems(bookingId, items, status = "pending", expiresAt = null) {
    const reservedKeys = [];

    try {
      for (const item of items) {
        const product = await Product.findById(item.productId).select("totalQuantity").lean();
        const totalQuantity = Number(product?.totalQuantity || 1);
        const quantity = Number(item.quantity || 1);
        if (quantity > totalQuantity) {
          throw new Error(`PRODUCT_UNAVAILABLE:${item.productId}`);
        }

        const dates = getReservationDates(item.startDate, item.endDate);

        for (const date of dates) {
          await removeExpiredPendingReservations(item.productId, date, new Date());
          await ensureLedgerDay(item.productId, date, totalQuantity);

          const result = await BookingInventory.findOneAndUpdate(
            {
              productId: item.productId,
              date,
              $expr: {
                $lte: [
                  { $add: [{ $ifNull: ["$reservedCount", 0] }, quantity] },
                  { $ifNull: ["$totalQuantity", totalQuantity] },
                ],
              },
              reservations: { $not: { $elemMatch: { bookingId } } },
            },
            {
              $set: { totalQuantity },
              $inc: { reservedCount: quantity },
              $push: {
                reservations: {
                  bookingId,
                  quantity,
                  status,
                  expiresAt,
                },
              },
            },
            { new: true }
          );

          if (!result) {
            const existing = await BookingInventory.findOne({
              productId: item.productId,
              date,
              reservations: { $elemMatch: { bookingId } },
            }).lean();

            if (!existing) {
              throw new Error(`PRODUCT_UNAVAILABLE:${item.productId}`);
            }
          } else {
            reservedKeys.push({ productId: item.productId, date });
          }
        }
      }

      return { success: true };
    } catch (error) {
      await this.releaseReservations(bookingId, reservedKeys);
      throw error;
    }
  }

  async reconcileFromBookings(now = new Date()) {
    const bookings = await Booking.find({
      status: { $in: ["pending", "confirmed", "active", "return_requested"] },
      $or: [
        { status: { $ne: "pending" } },
        { status: "pending", expiresAt: { $gt: now } },
      ],
    })
      .select("_id status expiresAt bookingItems")
      .sort({ createdAt: 1 })
      .lean();

    const liveBookingIds = new Set(bookings.map((booking) => String(booking._id)));
    const ledgerBookingIds = await BookingInventory.distinct("reservations.bookingId");

    for (const bookingId of ledgerBookingIds) {
      if (!liveBookingIds.has(String(bookingId))) {
        await this.releaseBooking(bookingId);
      }
    }

    for (const booking of bookings) {
      await this.reserveItems(
        booking._id,
        booking.bookingItems || [],
        booking.status === "pending" ? "pending" : "confirmed",
        booking.status === "pending" ? booking.expiresAt : null
      );

      if (booking.status !== "pending") {
        await this.confirmBooking(booking._id);
      }
    }

    return bookings.length;
  }

  async confirmBooking(bookingId) {
    await BookingInventory.updateMany(
      { "reservations.bookingId": bookingId },
      {
        $set: {
          "reservations.$[reservation].status": "confirmed",
          "reservations.$[reservation].expiresAt": null,
        },
      },
      { arrayFilters: [{ "reservation.bookingId": bookingId }] }
    );
  }

  async releaseBooking(bookingId) {
    const ledgers = await BookingInventory.find({
      "reservations.bookingId": bookingId,
    }).lean();

    for (const ledger of ledgers) {
      const reservation = ledger.reservations.find((entry) => entry.bookingId === bookingId);
      if (!reservation) continue;

      await BookingInventory.updateOne(
        {
          _id: ledger._id,
          "reservations.bookingId": bookingId,
        },
        {
          $inc: { reservedCount: -Number(reservation.quantity || 0) },
          $pull: { reservations: { bookingId } },
        }
      );
    }
  }

  async releasePendingBooking(bookingId) {
    const ledgers = await BookingInventory.find({
      reservations: { $elemMatch: { bookingId, status: "pending" } },
    }).lean();

    for (const ledger of ledgers) {
      const reservation = ledger.reservations.find(
        (entry) => entry.bookingId === bookingId && entry.status === "pending"
      );
      if (!reservation) continue;

      await BookingInventory.updateOne(
        {
          _id: ledger._id,
          reservations: {
            $elemMatch: { bookingId, status: "pending" },
          },
        },
        {
          $inc: { reservedCount: -Number(reservation.quantity || 0) },
          $pull: { reservations: { bookingId, status: "pending" } },
        }
      );
    }
  }

  async releaseReservations(bookingId, keys) {
    for (const key of keys) {
      const ledger = await BookingInventory.findOne({
        productId: key.productId,
        date: key.date,
        "reservations.bookingId": bookingId,
      }).lean();

      const reservation = ledger?.reservations?.find((entry) => entry.bookingId === bookingId);
      if (!reservation) continue;

      await BookingInventory.updateOne(
        {
          _id: ledger._id,
          "reservations.bookingId": bookingId,
        },
        {
          $inc: { reservedCount: -Number(reservation.quantity || 0) },
          $pull: { reservations: { bookingId } },
        }
      );
    }
  }
}

export const bookingInventoryRepository = new BookingInventoryRepository();
