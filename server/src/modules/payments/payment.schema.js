import { z } from "zod";

export const processPaymentSchema = z.object({
  bookingId: z.string().min(1, "Booking ID is required"),
  paymentMethod: z.enum(["esewa", "simulated_card", "khalti", "cash_on_pickup"]).default("esewa"),
});

export const adjustDepositSchema = z.object({
  deductedAmount: z.number().min(0),
  deductionReason: z.string().min(5, "Reason for deduction is required"),
});
