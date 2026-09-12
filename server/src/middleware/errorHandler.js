import { sendError } from "../utils/response.js";
import { logger } from "../utils/logger.js";

export class AppError extends Error {
  constructor(statusCode, code, message, details) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.name = "AppError";
  }
}

export class NotFoundError extends AppError {
  constructor(resource) {
    super(404, "NOT_FOUND", `${resource} not found`);
  }
}

export class ConflictError extends AppError {
  constructor(message) {
    super(409, "CONFLICT", message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Access denied") {
    super(403, "FORBIDDEN", message);
  }
}

export class ValidationError extends AppError {
  constructor(message, details) {
    super(400, "VALIDATION_ERROR", message, details);
  }
}

export class BookingConflictError extends AppError {
  constructor(message = "Product is not available for the selected dates") {
    super(409, "PRODUCT_UNAVAILABLE", message);
  }
}

export class BookingTransitionError extends AppError {
  constructor(from, to) {
    super(400, "INVALID_BOOKING_TRANSITION", `Cannot transition booking from ${from} to ${to}`);
  }
}

export function errorHandler(err, req, res, _next) {
  if (err instanceof AppError) {
    sendError(res, err.code, err.message, err.statusCode, err.details);
    return;
  }
  logger.error({ err, path: req.path, method: req.method }, "Unhandled error");
  const message = process.env.NODE_ENV === "production" ? "An unexpected error occurred" : err.message;
  sendError(res, "INTERNAL_ERROR", message, 500);
}
