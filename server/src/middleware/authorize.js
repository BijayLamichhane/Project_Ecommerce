import { sendError } from "../utils/response.js";

export function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      sendError(res, "UNAUTHORIZED", "Authentication required", 401);
      return;
    }
    const userRole = req.user.role;
    if (!roles.includes(userRole)) {
      sendError(
        res,
        "FORBIDDEN",
        `Access denied. Required role: ${roles.join(" or ")}`,
        403
      );
      return;
    }
    next();
  };
}

export const requireAdmin = authorize("admin");
export const requireSeller = authorize("seller", "admin");
export const requireCustomer = authorize("customer", "seller", "admin");
