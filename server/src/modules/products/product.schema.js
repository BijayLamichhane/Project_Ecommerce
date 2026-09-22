import { z } from "zod";

const pricingSchema = z
  .object({
    hourlyRate: z.number().positive().optional(),
    dailyRate: z.number().positive().optional(),
    weeklyRate: z.number().positive().optional(),
    monthlyRate: z.number().positive().optional(),
    securityDeposit: z.number().min(0).default(0),
    serviceFeePercent: z.number().min(0).max(50).optional().default(10),
    deliveryFee: z.number().min(0).optional().default(0),
    minimumRentalDays: z.number().int().positive().optional().default(1),
    maximumRentalDays: z.number().int().positive().optional().default(365),
  })
  .refine(
    (data) => data.hourlyRate || data.dailyRate || data.weeklyRate || data.monthlyRate,
    { message: "At least one pricing rate (hourly, daily, weekly, or monthly) is required" }
  );

const rulesSchema = z.object({
  rules: z.array(z.string().max(200)).optional().default([]),
  restrictions: z.array(z.string().max(200)).optional().default([]),
  requirements: z.array(z.string().max(200)).optional().default([]),
  cancellationPolicy: z.enum(["flexible", "moderate", "strict"]).optional().default("flexible"),
  advanceBookingDays: z.number().int().min(0).optional().default(0),
  instantBook: z.boolean().optional().default(false),
});

export const createProductSchema = z.object({
  categoryId: z.string().min(1),
  name: z.string().min(3).max(255),
  description: z.string().min(20).max(5000),
  shortDescription: z.string().max(500).optional(),
  brand: z.string().max(100).optional(),
  model: z.string().max(100).optional(),
  condition: z.enum(["new", "like_new", "good", "fair", "poor"]).default("good"),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  totalQuantity: z.number().int().positive().default(1),
  specifications: z.record(z.string()).optional(),
  tags: z.array(z.string().max(50)).optional().default([]),
  pricing: pricingSchema,
  rules: rulesSchema.optional(),
});

export const updateProductSchema = createProductSchema.partial();

export const updateProductStatusSchema = z.object({
  status: z.enum(["active", "inactive"]),
});

export const productSearchSchema = z.object({
  q: z.string().max(200).optional(),
  category: z.string().optional(),
  categoryId: z.string().optional(),
  minPrice: z.string().optional().transform((v) => (v ? Number(v) : undefined)),
  maxPrice: z.string().optional().transform((v) => (v ? Number(v) : undefined)),
  city: z.string().optional(),
  rating: z.string().optional().transform((v) => (v ? Number(v) : undefined)),
  condition: z.enum(["new", "like_new", "good", "fair", "poor"]).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z.string().optional().transform((v) => Math.max(1, v ? Number(v) : 1)),
  limit: z.string().optional().transform((v) => Math.min(50, Math.max(1, v ? Number(v) : 12))),
  sortBy: z
    .enum(["relevance", "price_asc", "price_desc", "rating", "newest", "popular"])
    .optional()
    .default("newest"),
});
