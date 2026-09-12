export function sendSuccess(res, data, message, statusCode = 200, meta) {
  const response = {
    success: true,
    data,
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
