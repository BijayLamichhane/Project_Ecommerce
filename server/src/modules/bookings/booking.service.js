import { bookingRepository } from "./booking.repository.js";
import { bookingInventoryRepository } from "./booking.inventory.repository.js";
import { productRepository } from "../products/product.repository.js";
import { cartRepository } from "../cart/cart.repository.js";
import { calculateRentalPrice } from "../../utils/pricing.js";
import { parseDateSafe, validateRentalDateRange } from "../../utils/availability.js";
import { env } from "../../config/env.js";
import { notificationService } from "../notifications/notification.service.js";
import {
  NotFoundError,
  ForbiddenError,
  ValidationError,
  BookingConflictError,
  BookingTransitionError,
} from "../../middleware/errorHandler.js";
import { isValidTransition } from "./booking.schema.js";
import { differenceInDays } from "date-fns";
import { emitProductAvailabilityChanged, emitToUser } from "../../sockets/index.js";
import { v4 as uuidv4 } from "uuid";
import { logger } from "../../utils/logger.js";

export class BookingService {
  async getById(id, userId, userRole) {
    const booking = await bookingRepository.findById(id);
    if (!booking) throw new NotFoundError("Booking");
    if (
      userRole !== "admin" &&
      String(booking.customerId) !== String(userId) &&
      String(booking.sellerId) !== String(userId)
    ) {
      throw new ForbiddenError("You do not have access to this booking");
    }
    return booking;
  }

  async getCustomerBookings(customerId, status) {
    return bookingRepository.findByCustomer(customerId, status);
  }

  async getSellerBookings(sellerId, status) {
    return bookingRepository.findBySeller(sellerId, status);
  }

  async createBooking(customerId, input) {
    if (input.items.length === 0) {
      throw new ValidationError("At least one item is required");
    }

    let sellerId = null;
    let totalRentalPrice = 0;
    let totalDeposit = 0;
    let totalServiceFee = 0;
    let totalDeliveryFee = 0;
    const processedItems = [];

    for (const item of input.items) {
      const startDate = parseDateSafe(item.startDate);
      const endDate = parseDateSafe(item.endDate);
      if (!startDate || !endDate) throw new ValidationError("Invalid date format");

      const dateValidation = validateRentalDateRange(startDate, endDate);
      if (!dateValidation.valid) throw new ValidationError(dateValidation.error);

      const product = await productRepository.findById(item.productId);
      if (!product) throw new NotFoundError(`Product ${item.productId}`);
      if (product.status !== "active") {
        throw new ValidationError(`Product "${product.name}" is not available for rental`);
      }
      if (!product.pricing) {
        throw new ValidationError(`Product "${product.name}" has no pricing configured`);
      }
      if (sellerId && String(product.sellerId) !== String(sellerId)) {
        throw new ValidationError("All items in a booking must be from the same seller");
      }
      if (String(product.sellerId) === String(customerId)) {
        throw new ValidationError("You cannot rent your own product");
      }

      sellerId = product.sellerId;

      const pricingData = {
        hourlyRate: product.pricing.hourlyRate ? Number(product.pricing.hourlyRate) : undefined,
        dailyRate: product.pricing.dailyRate ? Number(product.pricing.dailyRate) : undefined,
        weeklyRate: product.pricing.weeklyRate ? Number(product.pricing.weeklyRate) : undefined,
        monthlyRate: product.pricing.monthlyRate ? Number(product.pricing.monthlyRate) : undefined,
        securityDeposit: Number(product.pricing.securityDeposit),
        serviceFeePercent: Number(product.pricing.serviceFeePercent ?? 10),
        deliveryFee: Number(product.pricing.deliveryFee ?? 0),
      };

      const calculation = calculateRentalPrice(pricingData, startDate, endDate);
      const durationDays = differenceInDays(endDate, startDate);

      totalRentalPrice += calculation.baseRentalPrice * item.quantity;
      totalDeposit += calculation.securityDeposit * item.quantity;
      totalServiceFee += calculation.serviceFee * item.quantity;
      totalDeliveryFee += calculation.deliveryFee;

      processedItems.push({
        _id: uuidv4(),
        productId: item.productId,
        quantity: item.quantity,
        startDate,
        endDate,
        dailyRate: product.pricing.dailyRate,
        weeklyRate: product.pricing.weeklyRate,
        monthlyRate: product.pricing.monthlyRate,
        baseRentalPrice: String(calculation.baseRentalPrice * item.quantity),
        securityDeposit: String(calculation.securityDeposit * item.quantity),
        durationDays,
      });
    }

    if (!sellerId) throw new ValidationError("No valid seller found");

    const bookingId = uuidv4();
    const totalAmount = totalRentalPrice + totalServiceFee + totalDeliveryFee;
    const expiresAt = new Date(
      Date.now() + env.PENDING_BOOKING_TTL_MINUTES * 60 * 1000
    );

    try {
      await bookingRepository.createWithTransaction({
        bookingId,
        customerId,
        sellerId,
        items: processedItems,
        totalRentalPrice: String(totalRentalPrice),
        totalDeposit: String(totalDeposit),
        serviceFee: String(totalServiceFee),
        deliveryFee: String(totalDeliveryFee),
        totalAmount: String(totalAmount),
        specialRequests: input.specialRequests,
        expiresAt,
      });
    } catch (error) {
      if (String(error?.message || "").startsWith("PRODUCT_UNAVAILABLE:")) {
        const productId = String(error.message).split(":")[1];
        const product = await productRepository.findById(productId);
        throw new BookingConflictError(
          product
            ? `Product "${product.name}" is not available for the selected dates.`
            : "Product is not available for the selected dates."
        );
      }
      throw error;
    }

    await cartRepository.clearCart(customerId);
    return bookingRepository.findById(bookingId);
  }

  async cancelPendingForCustomer(bookingId, userId, reason = "Payment cancelled by customer") {
    const booking = await bookingRepository.findById(bookingId);
    if (!booking) throw new NotFoundError("Booking");
    if (String(booking.customerId) !== String(userId)) {
      throw new ForbiddenError("You can only cancel your own payment");
    }
    if (booking.status !== "pending") {
      throw new ValidationError("Only a pending payment can be cancelled");
    }

    const cancelled = await bookingRepository.cancelPending(bookingId, {
      cancellationReason: reason,
      actorId: userId,
    });

    if (!cancelled) {
      const latest = await bookingRepository.findById(bookingId);
      if (latest?.status === "cancelled") return latest;
      throw new ValidationError("This payment is already being processed and can no longer be cancelled");
    }

    await bookingInventoryRepository.releaseBooking(bookingId);
    await this.notifyBookingReleased(cancelled, "cancelled");
    await this.emitAvailabilityChanges(cancelled);

    return cancelled;
  }

  async updateStatus(bookingId, userId, userRole, newStatus, reason) {
    const booking = await bookingRepository.findById(bookingId);
    if (!booking) throw new NotFoundError("Booking");

    if (newStatus === "confirmed") {
      throw new ValidationError("Bookings are confirmed only after successful payment");
    }
    if (newStatus === "expired") {
      throw new ValidationError("Booking expiry is handled automatically");
    }

    const currentStatus = booking.status;

    const isCustomer = String(booking.customerId) === String(userId);
    const isSeller = String(booking.sellerId) === String(userId);

    if (newStatus === "disputed" && userRole !== "admin") {
      if (!isCustomer && !isSeller) throw new ForbiddenError();
      if (!reason?.trim()) {
        throw new ValidationError("A dispute reason is required");
      }
    }

    if (userRole !== "admin") {
      if (newStatus === "rejected" || newStatus === "active") {
        if (!isSeller) throw new ForbiddenError();
      } else if (newStatus === "cancelled") {
        if (!isCustomer && !isSeller) throw new ForbiddenError();
      } else if (newStatus === "return_requested") {
        if (!isCustomer) throw new ForbiddenError();
      } else if (newStatus === "returned" || newStatus === "completed") {
        if (!isSeller) throw new ForbiddenError();
      }
    }

    if (!isValidTransition(currentStatus, newStatus)) {
      throw new BookingTransitionError(currentStatus, newStatus);
    }

    const extra = {};
    if (newStatus === "cancelled") extra.cancellationReason = reason;
    if (newStatus === "rejected") extra.rejectionReason = reason;
    if (newStatus === "disputed") {
      extra.disputeReason = reason.trim();
      extra.disputeRaisedBy = userId;
      extra.disputePreviousStatus = currentStatus;
      extra.disputedAt = new Date();
    }
    extra.actorId = userId;

    const updated = await bookingRepository.updateStatus(bookingId, newStatus, extra);

    if (["rejected", "cancelled"].includes(newStatus)) {
      await bookingInventoryRepository.releaseBooking(bookingId);
      await this.notifyBookingReleased(updated, newStatus);
      await this.emitAvailabilityChanges(updated);
    }

    return updated;
  }

  async backfillPendingExpiry() {
    return bookingRepository.backfillPendingExpiry(env.PENDING_BOOKING_TTL_MINUTES);
  }

  async expirePendingBookings() {
    const candidates = await bookingRepository.findExpiredPendingBookings();

    for (const booking of candidates) {
      const expired = await bookingRepository.markExpired(booking.id || booking._id);
      if (!expired) continue;

      await bookingInventoryRepository.releasePendingBooking(booking.id || booking._id);
      await this.notifyBookingReleased(expired, "expired");
      await this.emitAvailabilityChanges(expired);
    }

    return candidates.length;
  }

  async notifyBookingReleased(booking, reason) {
    if (!booking?.customerId) return;

    const actionUrl = `/bookings/${encodeURIComponent(booking.id || booking._id)}`;
    const isExpired = reason === "expired";
    const isCancelled = reason === "cancelled";
    const title = isExpired
      ? "Booking hold expired"
      : isCancelled
        ? "Payment cancelled"
        : "Booking request declined";
    const message = isExpired
      ? "Your payment window expired, so the selected dates are available again. Please create a new booking if you still need them."
      : isCancelled
        ? "Your payment was cancelled and the selected dates are available again."
        : "The seller declined this booking request, so the selected dates are available again.";

    try {
      const notification = await notificationService.createNotification({
        userId: booking.customerId,
        type: isExpired ? "booking_expired" : "booking_rejected",
        title,
        message,
        actionUrl,
      });

      emitToUser(booking.customerId, "booking_notification", notification);
    } catch (error) {
      logger.warn({ error, bookingId: booking.id || booking._id }, "Failed to create booking release notification");
    }
  }

  async emitAvailabilityChanges(booking) {
    for (const item of booking?.bookingItems || []) {
      if (item?.productId) emitProductAvailabilityChanged(item.productId);
    }
  }

  async calculatePrice(productId, startDate, endDate) {
    const start = parseDateSafe(startDate);
    const end = parseDateSafe(endDate);
    if (!start || !end) throw new ValidationError("Invalid dates");

    const product = await productRepository.findById(productId);
    if (!product) throw new NotFoundError("Product");
    if (!product.pricing) throw new ValidationError("Product has no pricing");

    return calculateRentalPrice(
      {
        hourlyRate: product.pricing.hourlyRate ? Number(product.pricing.hourlyRate) : undefined,
        dailyRate: product.pricing.dailyRate ? Number(product.pricing.dailyRate) : undefined,
        weeklyRate: product.pricing.weeklyRate ? Number(product.pricing.weeklyRate) : undefined,
        monthlyRate: product.pricing.monthlyRate ? Number(product.pricing.monthlyRate) : undefined,
        securityDeposit: Number(product.pricing.securityDeposit),
        serviceFeePercent: Number(product.pricing.serviceFeePercent ?? 10),
        deliveryFee: Number(product.pricing.deliveryFee ?? 0),
      },
      start,
      end
    );
  }

  async getAvailability(productId, year, month) {
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59);
    return bookingRepository.findOverlappingBookings(productId, startOfMonth, endOfMonth);
  }
}

export const bookingService = new BookingService();
