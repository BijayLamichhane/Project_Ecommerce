import { z } from "zod";

export const createReportSchema = z.object({
  targetType: z.enum(["product", "user", "review"]),
  targetId: z.string().min(1),
  reason: z.string().trim().min(3).max(255),
  details: z.string().trim().max(2000).optional(),
});
