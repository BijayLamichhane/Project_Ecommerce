export function normalizeIds(obj) {
  if (!obj || typeof obj !== "object") return obj;
  if (obj instanceof Date || obj instanceof RegExp) return obj;
  if (Array.isArray(obj)) return obj.map(normalizeIds);

  const res = {};
  for (const key of Object.keys(obj)) {
    res[key] = normalizeIds(obj[key]);
  }
  if (res._id !== undefined && res.id === undefined) {
    res.id = String(res._id);
  } else if (res.id !== undefined && res._id === undefined) {
    res._id = String(res.id);
  }
  return res;
}

export function sendSuccess(res, data, message, statusCode = 200, meta) {
  const normalizedData = normalizeIds(data);
  const response = {
    success: true,
    data: normalizedData,
    ...(message && { message }),
    ...(meta && { meta }),
  };
  return res.status(statusCode).json(response);
}

export function sendCreated(res, data, message) {
  return sendSuccess(res, data, message, 201);
}

export function sendNoContent(res) {
  return res.status(204).send();
}

export function sendError(res, code, message, statusCode = 400, details) {
  const response = {
    success: false,
    error: {
      code,
      message,
      ...(details !== undefined && { details }),
    },
  };
  return res.status(statusCode).json(response);
}

export function sendPaginated(res, data, page, limit, total, message) {
  const totalPages = Math.ceil(total / limit);
  return sendSuccess(res, data, message, 200, {
    page,
    limit,
    total,
    totalPages,
  });
}
