import { betterAuth } from "better-auth/minimal";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { MongoClient } from "mongodb";
import bcrypt from "bcryptjs";
import { env } from "./env.js";

export const authClient = new MongoClient(env.MONGODB_URI);
export const authDb = authClient.db();

const trustedOrigins = Array.from(
  new Set([
    env.CLIENT_URL,
    ...(env.NODE_ENV === "development"
      ? ["http://localhost:3000", "http://localhost:5173"]
      : []),
  ])
);

export const auth = betterAuth({
  database: mongodbAdapter(authDb, { client: authClient }),
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    minPasswordLength: 8,
    password: {
      hash: (password) => bcrypt.hash(password, 12),
      verify: ({ password, hash }) => bcrypt.compare(password, hash),
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5,
    },
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        defaultValue: "customer",
        input: false,
      },
      status: {
        type: "string",
        defaultValue: "active",
        input: false,
      },
      phone: {
        type: "string",
        required: false,
      },
      avatarUrl: {
        type: "string",
        required: false,
      },
    },
  },
  trustedOrigins,
  advanced: {
    database: {
      joins: true,
    },
    crossSubDomainCookies: { enabled: false },
    useSecureCookies: env.NODE_ENV === "production",
    defaultCookieAttributes: {
      sameSite: env.NODE_ENV === "production" ? "strict" : "lax",
    },
  },
});
