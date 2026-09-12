import { z } from "zod";

export const processPaymentSchema = z.object({
  bookingId: z.string().min(1, "Booking ID is required"),
  paymentMethod: z
    .enum(["simulated_card", "khalti", "esewa", "cash_on_pickup"])
    .default("simulated_card"),
});

export const adjustDepositSchema = z.object({
  deductedAmount: z.number().min(0),
  deductionReason: z.string().min(5, "Reason for deduction is required"),
});
