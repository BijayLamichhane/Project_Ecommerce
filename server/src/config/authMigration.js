import { User } from "../models/User.js";
import { authDb } from "./auth.js";
import { v4 as uuidv4 } from "uuid";
import { logger } from "../utils/logger.js";

const CREDENTIAL_PROVIDER = "credential";
const CREDENTIAL_ISSUER = "local:credential";

export async function migrateLegacyCredentials() {
  const legacyUsers = await User.find({ password: { $exists: true, $type: "string", $ne: "" } })
    .select("+password email")
    .lean();

  if (legacyUsers.length === 0) return;

  const accounts = authDb.collection("account");
  let migrated = 0;

  for (const user of legacyUsers) {
    const userId = String(user._id);
    const existing = await accounts.findOne({
      providerId: CREDENTIAL_PROVIDER,
      issuer: CREDENTIAL_ISSUER,
      accountId: userId,
    });

    const now = new Date();
    if (!existing) {
      await accounts.insertOne({
        _id: uuidv4(),
        accountId: userId,
        providerId: CREDENTIAL_PROVIDER,
        issuer: CREDENTIAL_ISSUER,
        userId,
        password: user.password,
        createdAt: now,
        updatedAt: now,
      });
      migrated += 1;
    } else if (!existing.password) {
      await accounts.updateOne({ _id: existing._id }, { $set: { password: user.password, updatedAt: now } });
      migrated += 1;
    }

    await User.updateOne({ _id: user._id }, { $unset: { password: "" } });
  }

  if (migrated > 0) {
    logger.info({ migrated }, "Migrated legacy user passwords into Better Auth credential accounts");
  }
}
