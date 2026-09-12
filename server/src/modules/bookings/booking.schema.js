import { z } from "zod";

export const BOOKING_STATUSES = [
  "pending",
  "confirmed",
  "rejected",
  "cancelled",
  "active",
  "return_requested",
  "returned",
  "completed",
  "disputed",
];

const VALID_TRANSITIONS = {
  pending: ["confirmed", "rejected", "cancelled"],
  confirmed: ["active", "cancelled"],
  rejected: [],
  cancelled: [],
  active: ["return_requested", "disputed"],
  return_requested: ["returned", "disputed"],
  returned: ["completed", "disputed"],
  completed: [],
  disputed: ["completed"],
};

export function isValidTransition(from, to) {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

export const createBookingSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantity: z.number().int().positive().default(1),
        startDate: z.string().datetime({ message: "Invalid start date" }),
        endDate: z.string().datetime({ message: "Invalid end date" }),
      })
    )
    .min(1, "At least one item is required"),
  specialRequests: z.string().max(1000).optional(),
});

export const updateBookingStatusSchema = z.object({
  status: z.enum(BOOKING_STATUSES),
  reason: z.string().max(1000).optional(),
});

export const cancelBookingSchema = z.object({
  reason: z.string().max(1000).optional(),
});

export const returnRequestSchema = z.object({
  condition: z.enum(["new", "like_new", "good", "fair", "poor"]).optional(),
  notes: z.string().max(1000).optional(),
  imageUrls: z.array(z.string().url()).optional(),
});
