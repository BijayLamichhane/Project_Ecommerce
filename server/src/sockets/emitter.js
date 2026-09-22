let ioInstance = null;

export function setSocketIO(io) {
  ioInstance = io;
}

export function emitToUser(userId, event, payload) {
  ioInstance?.to(`user:${userId}`).emit(event, payload);
}

export function emitProductAvailabilityChanged(productId) {
  if (!productId) return;
  ioInstance?.to(`product:${productId}`).emit("availability_changed", {
    productId: String(productId),
  });
}
