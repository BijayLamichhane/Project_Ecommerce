import { z } from "zod";

export const sendMessageSchema = z.object({
  conversationId: z.string().optional(),
  recipientId: z.string().min(1, "Recipient ID is required"),
  productId: z.string().optional(),
  bookingId: z.string().optional(),
  content: z.string().min(1, "Message content is required").max(3000),
  imageUrl: z.string().url().optional(),
});

export const startConversationSchema = z.object({
  recipientId: z.string().min(1, "Recipient ID is required"),
  productId: z.string().optional(),
  bookingId: z.string().optional(),
  initialMessage: z.string().min(1, "Initial message is required").max(3000),
});
