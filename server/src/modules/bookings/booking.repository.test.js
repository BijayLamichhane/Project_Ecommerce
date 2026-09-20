import { beforeEach, describe, expect, it, vi } from "vitest";

const bookingFind = vi.fn();
const bookingFindOneAndUpdate = vi.fn();

vi.mock("../../models/Booking.js", () => ({
  Booking: {
    find: bookingFind,
    findOneAndUpdate: bookingFindOneAndUpdate,
  },
}));

vi.mock("./booking.inventory.repository.js", () => ({
  bookingInventoryRepository: {},
}));

const { BookingRepository } = await import("./booking.repository.js");

function overlap(item, productId, startDate, endDate) {
  return (
    String(item.productId) === String(productId) &&
    new Date(item.startDate) < new Date(endDate) &&
    new Date(item.endDate) > new Date(startDate)
  );
}

describe("Booking availability repository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not treat an expired pending booking as blocking availability", async () => {
    const now = Date.now();
    const startDate = new Date(now + 2 * 24 * 60 * 60 * 1000);
    const endDate = new Date(now + 4 * 24 * 60 * 60 * 1000);

    const rows = [
      {
        id: "expired-pending",
        status: "pending",
        expiresAt: new Date(now - 60_000),
        bookingItems: [
          {
            productId: "product-1",
            quantity: 1,
            startDate,
            endDate,
          },
        ],
      },
      {
        id: "active-pending",
        status: "pending",
        expiresAt: new Date(now + 60_000),
        bookingItems: [
          {
            productId: "product-1",
            quantity: 1,
            startDate,
            endDate,
          },
        ],
      },
      {
        id: "confirmed",
        status: "confirmed",
        bookingItems: [
          {
            productId: "product-1",
            quantity: 1,
            startDate,
            endDate,
          },
        ],
      },
    ];

    bookingFind.mockImplementation((filter) => ({
      lean: vi.fn().mockResolvedValue(
        rows.filter((booking) => {
          const statusAllowed = filter.status.$in.includes(booking.status);
          const pendingAllowed =
            booking.status !== "pending" ||
            new Date(booking.expiresAt) > filter.$or[1].expiresAt.$gt;
          const item = booking.bookingItems[0];
          return (
            statusAllowed &&
            pendingAllowed &&
            overlap(item, "product-1", startDate, endDate)
          );
        })
      ),
    }));

    const repository = new BookingRepository();
    const result = await repository.findOverlappingBookings(
      "product-1",
      startDate,
      endDate
    );

    expect(result).toHaveLength(2);
    expect(result.map((entry) => entry.bookingId)).toEqual(
      expect.arrayContaining(["active-pending", "confirmed"])
    );
    expect(result.map((entry) => entry.bookingId)).not.toContain("expired-pending");

    const filter = bookingFind.mock.calls[0][0];
    expect(filter.$or).toEqual([
      { status: { $ne: "pending" } },
      { status: "pending", expiresAt: { $gt: expect.any(Date) } },
    ]);
  });
});
