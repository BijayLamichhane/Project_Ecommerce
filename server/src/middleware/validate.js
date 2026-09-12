import { sendError } from "../utils/response.js";

export function validate(schema, target = "body") {
  return (req, res, next) => {
    const result = schema.safeParse(req[target]);
    if (!result.success) {
      const formatted = result.error.format();
      sendError(res, "VALIDATION_ERROR", "Invalid request data", 400, formatted);
      return;
    }
    req[target] = result.data;
    next();
  };
}

export function validateBody(schema) {
  return validate(schema, "body");
}

export function validateQuery(schema) {
  return validate(schema, "query");
}

export function validateParams(schema) {
  return validate(schema, "params");
}
