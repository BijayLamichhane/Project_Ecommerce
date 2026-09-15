import { z } from "zod";

export const createReviewSchema = z.object({
  productId: z.string().min(1, "Product ID is required"),
  bookingId: z.string().min(1).optional(),
  rating: z.number().int().min(1).max(5),
  title: z.string().max(255).optional(),
  comment: z.string().min(5, "Comment must be at least 5 characters").max(2000),
  conditionRating: z.number().int().min(1).max(5).optional(),
  sellerRating: z.number().int().min(1).max(5).optional(),
});

export const replyReviewSchema = z.object({
  response: z.string().min(3).max(1000),
});
