import { User } from "../models/User.js";

export async function getAccountStatus(userId) {
  const user = await User.findById(userId).select("status").lean();
  return user?.status || null;
}

export const ACCOUNT_SUSPENDED_CODE = "ACCOUNT_SUSPENDED";
export const ACCOUNT_SUSPENDED_MESSAGE = "Your account is suspended. You cannot perform account actions until an administrator restores access.";
