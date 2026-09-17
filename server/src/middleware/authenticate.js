import { sendError } from "../utils/response.js";
import { logger } from "../utils/logger.js";
import { auth } from "../config/auth.js";
import { getAccountStatus, ACCOUNT_SUSPENDED_CODE, ACCOUNT_SUSPENDED_MESSAGE } from "./accountStatus.js";

export async function authenticate(req, res, next) {
  try {
    const session = await auth.api.getSession({
      headers: req.headers,
    });
    if (!session || !session.user) {
      sendError(res, "UNAUTHORIZED", "Authentication required", 401);
      return;
    }

    req.user = session.user;
    if (req.user) {
      if (!req.user.id && req.user._id) req.user.id = String(req.user._id);
      if (!req.user._id && req.user.id) req.user._id = String(req.user.id);
    }

    const accountStatus = await getAccountStatus(req.user.id);
    if (!accountStatus) {
      sendError(res, "UNAUTHORIZED", "Account not found", 401);
      return;
    }
    if (accountStatus === "suspended") {
      sendError(res, ACCOUNT_SUSPENDED_CODE, ACCOUNT_SUSPENDED_MESSAGE, 403);
      return;
    }

    req.user.status = accountStatus;
    req.session = session.session;
    next();
  } catch (error) {
    logger.error({ error }, "Authentication error");
    sendError(res, "UNAUTHORIZED", "Authentication failed", 401);
  }
}

export async function optionalAuth(req, res, next) {
  try {
    const session = await auth.api.getSession({
      headers: req.headers,
    });
    if (session?.user) {
      req.user = session.user;
      if (!req.user.id && req.user._id) req.user.id = String(req.user._id);
      if (!req.user._id && req.user.id) req.user._id = String(req.user.id);
      req.session = session.session;
    }
  } catch {
    // optional, ignore
  }
  next();
}
