import { sendError } from "../utils/response.js";
import { logger } from "../utils/logger.js";
import { auth } from "../config/auth.js";

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
      req.session = session.session;
    }
  } catch {
    // optional, ignore
  }
  next();
}
