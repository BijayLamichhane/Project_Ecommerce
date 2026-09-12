import { z } from "zod";

export const updateProfileSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  phone: z.string().max(20).optional(),
  avatarUrl: z.string().url().optional(),
  bio: z.string().max(500).optional(),
  address: z.string().max(255).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  postalCode: z.string().max(20).optional(),
});

export const sellerOnboardingSchema = z.object({
  businessName: z.string().min(2, "Business name is required").max(255),
  businessDescription: z.string().max(2000).default("").optional().or(z.literal("")),
  businessAddress: z.string().max(255).default("").optional().or(z.literal("")),
  businessCity: z.string().min(2, "City is required").max(100),
  panNumber: z.string().min(3, "PAN/VAT number is required").max(50),
  bankAccountName: z.string().min(2, "Account holder name is required").max(255),
  bankAccountNumber: z.string().min(3, "Account number is required").max(50),
  bankName: z.string().min(2, "Bank name is required").max(255),
});

export const updateSellerSettingsSchema = sellerOnboardingSchema.partial();
