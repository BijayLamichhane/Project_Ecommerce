import { z } from "zod";

export const addToCartSchema = z.object({
  productId: z.string().min(1, "Product ID is required"),
  quantity: z.number().int().positive().default(1),
  startDate: z.string().datetime({ message: "Valid start date is required" }),
  endDate: z.string().datetime({ message: "Valid end date is required" }),
});

export const updateCartItemSchema = z.object({
  quantity: z.number().int().positive().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});
