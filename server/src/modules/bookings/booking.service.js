import { bookingRepository } from "./booking.repository.js";
import { productRepository } from "../products/product.repository.js";
import { calculateRentalPrice } from "../../utils/pricing.js";
import { parseDateSafe, validateRentalDateRange } from "../../utils/availability.js";
import { getRedisClient, CacheKeys } from "../../config/redis.js";
import { env } from "../../config/env.js";
import {
  NotFoundError,
  ForbiddenError,
  ValidationError,
  BookingConflictError,
  BookingTransitionError,
} from "../../middleware/errorHandler.js";
import { isValidTransition } from "./booking.schema.js";
import { differenceInDays, addHours } from "date-fns";
import { logger } from "../../utils/logger.js";
import { v4 as uuidv4 } from "uuid";

export class BookingService {
  async getById(id, userId, userRole) {
    const booking = await bookingRepository.findById(id);
    if (!booking) throw new NotFoundError("Booking");
    if (userRole !== "admin" && booking.customerId !== userId && booking.sellerId !== userId) {
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
    const acquiredLocks = [];
    const redis = getRedisClient();

    try {
      for (const item of input.items) {
        const startDate = parseDateSafe(item.startDate);
        const endDate = parseDateSafe(item.endDate);
        if (!startDate || !endDate) {
          throw new ValidationError("Invalid date format");
        }

        const dateValidation = validateRentalDateRange(startDate, endDate);
        if (!dateValidation.valid) {
          throw new ValidationError(dateValidation.error);
        }

        const product = await productRepository.findById(item.productId);
        if (!product) throw new NotFoundError(`Product ${item.productId}`);
        if (product.status !== "active") {
          throw new ValidationError(`Product "${product.name}" is not available for rental`);
        }
        if (!product.pricing) {
          throw new ValidationError(`Product "${product.name}" has no pricing configured`);
        }

        if (sellerId && product.sellerId !== sellerId) {
          throw new ValidationError("All items in a booking must be from the same seller");
        }
        if (product.sellerId === customerId) {
          throw new ValidationError("You cannot rent your own product");
        }
        sellerId = product.sellerId;

        const lockKey = CacheKeys.bookingLock(
          item.productId,
          item.startDate,
          item.endDate
        );
        let lockAcquired = true;
        if (redis) {
          try {
            const res = await redis.set(lockKey, customerId, "EX", env.BOOKING_LOCK_TTL_SECONDS, "NX");
            if (!res) lockAcquired = false;
          } catch (err) {
            // Redis is optional — fall back to the database-level overlap
            // check below — but log it so an unreachable Redis in production
            // doesn't silently disable the distributed lock with no trace.
            logger.warn({ err, lockKey }, "Booking lock unavailable (Redis unreachable); relying on database overlap check only");
          }
        }

        if (!lockAcquired) {
          throw new BookingConflictError(
            `Product "${product.name}" is currently being booked. Please try again.`
          );
        }
        acquiredLocks.push(lockKey);

        const overlaps = await bookingRepository.findOverlappingBookings(
          item.productId,
          startDate,
          endDate
        );
        const alreadyBookedQuantity = overlaps.reduce((sum, o) => sum + (o.quantity || 1), 0);
        const totalQuantity = product.totalQuantity || 1;
        if (alreadyBookedQuantity + item.quantity > totalQuantity) {
          throw new BookingConflictError(
            `Product "${product.name}" is not available for the selected dates`
          );
        }

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
      const expiresAt = addHours(new Date(), 24);

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

      return bookingRepository.findById(bookingId);
    } finally {
      if (redis) {
        for (const lockKey of acquiredLocks) {
          try {
            await redis.del(lockKey);
          } catch (err) {
            logger.warn({ err, lockKey }, "Failed to release booking lock");
          }
        }
      }
    }
  }

  async updateStatus(bookingId, userId, userRole, newStatus, reason) {
    const booking = await bookingRepository.findById(bookingId);
    if (!booking) throw new NotFoundError("Booking");

    const currentStatus = booking.status;
    if (userRole !== "admin") {
      if (newStatus === "confirmed" || newStatus === "rejected") {
        if (booking.sellerId !== userId) throw new ForbiddenError();
      } else if (newStatus === "cancelled") {
        if (booking.customerId !== userId && booking.sellerId !== userId) {
          throw new ForbiddenError();
        }
      } else if (newStatus === "return_requested") {
        if (booking.customerId !== userId) throw new ForbiddenError();
      } else if (newStatus === "returned" || newStatus === "completed") {
        if (booking.sellerId !== userId) throw new ForbiddenError();
      }
    }

    if (!isValidTransition(currentStatus, newStatus)) {
      throw new BookingTransitionError(currentStatus, newStatus);
    }

    const extra = {};
    if (newStatus === "cancelled") extra.cancellationReason = reason;
    if (newStatus === "rejected") extra.rejectionReason = reason;

    return bookingRepository.updateStatus(bookingId, newStatus, extra);
  }

  async calculatePrice(productId, startDate, endDate) {
    const start = parseDateSafe(startDate);
    const end = parseDateSafe(endDate);
    if (!start || !end) throw new ValidationError("Invalid dates");

    const product = await productRepository.findById(productId);
    if (!product) throw new NotFoundError("Product");
    if (!product.pricing) throw new ValidationError("Product has no pricing");

    const pricingData = {
      hourlyRate: product.pricing.hourlyRate ? Number(product.pricing.hourlyRate) : undefined,
      dailyRate: product.pricing.dailyRate ? Number(product.pricing.dailyRate) : undefined,
      weeklyRate: product.pricing.weeklyRate ? Number(product.pricing.weeklyRate) : undefined,
      monthlyRate: product.pricing.monthlyRate ? Number(product.pricing.monthlyRate) : undefined,
      securityDeposit: Number(product.pricing.securityDeposit),
      serviceFeePercent: Number(product.pricing.serviceFeePercent ?? 10),
      deliveryFee: Number(product.pricing.deliveryFee ?? 0),
    };

    return calculateRentalPrice(pricingData, start, end);
  }

  async getAvailability(productId, year, month) {
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59);
    return bookingRepository.findOverlappingBookings(
      productId,
      startOfMonth,
      endOfMonth
    );
  }
}

export const bookingService = new BookingService();
