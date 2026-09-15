import { z } from "zod";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.string().default("5000").transform(Number),
  MONGODB_URI: z.string().default("mongodb://127.0.0.1:27017/renthub_db"),
  REDIS_ENABLED: z.string().default("false").transform((v) => v === "true"),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  BETTER_AUTH_SECRET: z.string().min(32, "BETTER_AUTH_SECRET must be at least 32 characters").default("dev_secret_must_be_at_least_32_characters_long_12345"),
  BETTER_AUTH_URL: z.string().default("http://localhost:5000"),
  CLIENT_URL: z.string().default("http://localhost:3000"),
  CLOUDINARY_CLOUD_NAME: z.string().optional().default(""),
  CLOUDINARY_API_KEY: z.string().optional().default(""),
  CLOUDINARY_API_SECRET: z.string().optional().default(""),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().optional().transform((v) => (v ? Number(v) : 587)),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().optional().default("RentHub <noreply@renthub.app>"),
  PAYMENT_SECRET: z.string().optional().default("dev_payment_secret_key_12345"),
  PAYMENT_WEBHOOK_SECRET: z.string().optional().default("dev_webhook_secret_key_12345"),
  ESEWA_PRODUCT_CODE: z.string().optional().default("EPAYTEST"),
  ESEWA_SECRET_KEY: z.string().optional().default("8gBm/:&EnhH.1/q"),
  ESEWA_CHECKOUT_URL: z.string().optional().default("https://rc-epay.esewa.com.np/api/epay/main/v2/form"),
  ESEWA_STATUS_URL: z.string().optional().default("https://rc.esewa.com.np/api/epay/transaction/status/"),
  BOOKING_LOCK_TTL_SECONDS: z.string().default("60").transform(Number),
  RATE_LIMIT_WINDOW_MS: z.string().default("900000").transform(Number),
  RATE_LIMIT_MAX: z.string().default("100").transform(Number),
});

const _parsed = envSchema.safeParse(process.env);
if (!_parsed.success) {
  console.error("❌ Invalid environment variables:");
  console.error(_parsed.error.format());
  process.exit(1);
}

export const env = _parsed.data;
