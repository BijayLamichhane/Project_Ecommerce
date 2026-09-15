import { z } from "zod";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

const DEV_AUTH_SECRET = "dev_secret_must_be_at_least_32_characters_long_12345";
const DEV_PAYMENT_SECRET = "dev_payment_secret_key_12345";
const DEV_WEBHOOK_SECRET = "dev_webhook_secret_key_12345";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(5000),
  MONGODB_URI: z.string().min(1).default("mongodb://127.0.0.1:27017/renthub_db"),
  REDIS_ENABLED: z.string().default("false").transform((v) => v === "true"),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  BETTER_AUTH_SECRET: z.string().min(32, "BETTER_AUTH_SECRET must be at least 32 characters").default(DEV_AUTH_SECRET),
  BETTER_AUTH_URL: z.string().url().default("http://localhost:5000"),
  CLIENT_URL: z.string().url().default("http://localhost:3000"),
  CLOUDINARY_CLOUD_NAME: z.string().optional().default(""),
  CLOUDINARY_API_KEY: z.string().optional().default(""),
  CLOUDINARY_API_SECRET: z.string().optional().default(""),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().optional().transform((v) => (v ? Number(v) : 587)),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().optional().default("RentHub <noreply@renthub.app>"),
  PAYMENT_SECRET: z.string().optional().default(DEV_PAYMENT_SECRET),
  PAYMENT_WEBHOOK_SECRET: z.string().optional().default(DEV_WEBHOOK_SECRET),
  ESEWA_PRODUCT_CODE: z.string().optional().default("EPAYTEST"),
  ESEWA_SECRET_KEY: z.string().optional().default("8gBm/:&EnhH.1/q"),
  ESEWA_CHECKOUT_URL: z.string().url().optional().default("https://rc-epay.esewa.com.np/api/epay/main/v2/form"),
  ESEWA_STATUS_URL: z.string().url().optional().default("https://rc.esewa.com.np/api/epay/transaction/status/"),
  CARD_GATEWAY_ENABLED: z.string().default("false").transform((v) => v === "true"),
  CARD_GATEWAY_CHECKOUT_URL: z.string().url().optional(),
  CARD_GATEWAY_MERCHANT_ID: z.string().optional().default(""),
  CARD_GATEWAY_SECRET: z.string().optional().default(""),
  BOOKING_LOCK_TTL_SECONDS: z.coerce.number().int().positive().default(60),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
});

const _parsed = envSchema.safeParse(process.env);
if (!_parsed.success) {
  console.error("❌ Invalid environment variables:");
  console.error(_parsed.error.format());
  process.exit(1);
}

const parsedEnv = _parsed.data;
if (parsedEnv.NODE_ENV === "production") {
  const unsafeDefaults = [];
  if (parsedEnv.BETTER_AUTH_SECRET === DEV_AUTH_SECRET) unsafeDefaults.push("BETTER_AUTH_SECRET");
  if (parsedEnv.PAYMENT_SECRET === DEV_PAYMENT_SECRET) unsafeDefaults.push("PAYMENT_SECRET");
  if (parsedEnv.PAYMENT_WEBHOOK_SECRET === DEV_WEBHOOK_SECRET) unsafeDefaults.push("PAYMENT_WEBHOOK_SECRET");

  if (unsafeDefaults.length > 0) {
    console.error(`❌ Refusing to start production with development secrets: ${unsafeDefaults.join(", ")}`);
    process.exit(1);
  }
}

export const env = parsedEnv;
