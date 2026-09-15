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

const sellerPayoutFields = {
  bankAccountName: z.string().max(255).optional().or(z.literal("")),
  bankAccountNumber: z.string().max(50).optional().or(z.literal("")),
  bankName: z.string().max(255).optional().or(z.literal("")),
  cardHolderName: z.string().max(255).optional().or(z.literal("")),
  cardNumber: z.string().regex(/^\d{12,19}$/, "Enter a valid card number").optional().or(z.literal("")),
  cardExpiry: z.string().regex(/^(0[1-9]|1[0-2])\/\d{2}$/, "Use MM/YY format").optional().or(z.literal("")),
  cardCvv: z.string().regex(/^\d{3,4}$/, "Enter a valid CVV").optional().or(z.literal("")),
};

export const sellerOnboardingSchema = z
  .object({
    businessName: z.string().min(2, "Business name is required").max(255),
    businessDescription: z.string().max(2000).default("").optional().or(z.literal("")),
    businessAddress: z.string().max(255).default("").optional().or(z.literal("")),
    businessCity: z.string().min(2, "City is required").max(100),
    panNumber: z.string().min(3, "PAN/VAT number is required").max(50),
    payoutMethod: z.enum(["bank_account", "debit_credit_card"]).default("bank_account"),
    ...sellerPayoutFields,
  })
  .superRefine((data, ctx) => {
    if (data.payoutMethod === "bank_account") {
      if (!data.bankAccountName?.trim()) {
        ctx.addIssue({ code: "custom", path: ["bankAccountName"], message: "Account holder name is required" });
      }
      if (!data.bankAccountNumber?.trim()) {
        ctx.addIssue({ code: "custom", path: ["bankAccountNumber"], message: "Account number is required" });
      }
      if (!data.bankName?.trim()) {
        ctx.addIssue({ code: "custom", path: ["bankName"], message: "Bank name is required" });
      }
    }

    if (data.payoutMethod === "debit_credit_card") {
      if (!data.cardHolderName?.trim()) {
        ctx.addIssue({ code: "custom", path: ["cardHolderName"], message: "Cardholder name is required" });
      }
      if (!data.cardNumber?.trim()) {
        ctx.addIssue({ code: "custom", path: ["cardNumber"], message: "Card number is required" });
      }
      if (!data.cardExpiry?.trim()) {
        ctx.addIssue({ code: "custom", path: ["cardExpiry"], message: "Card expiry is required" });
      }
      if (!data.cardCvv?.trim()) {
        ctx.addIssue({ code: "custom", path: ["cardCvv"], message: "CVV is required" });
      }
    }
  });

export const updateSellerSettingsSchema = sellerOnboardingSchema.partial();
