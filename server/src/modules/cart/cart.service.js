import { cartRepository } from "./cart.repository.js";
import { productRepository } from "../products/product.repository.js";
import { bookingRepository } from "../bookings/booking.repository.js";
import { calculateRentalPrice } from "../../utils/pricing.js";
import { parseDateSafe, validateRentalDateRange } from "../../utils/availability.js";
import { ValidationError, NotFoundError, ForbiddenError } from "../../middleware/errorHandler.js";

export class CartService {
  async getCart(userId) {
    const items = await cartRepository.findByUserId(userId);
    let totalRentalPrice = 0;
    let totalDeposit = 0;
    let totalServiceFee = 0;
    let totalDeliveryFee = 0;

    const enrichedItems = items.map((item) => {
      let calculation = null;
      if (item.product?.pricing) {
        try {
          const pricingData = {
            hourlyRate: item.product.pricing.hourlyRate
              ? Number(item.product.pricing.hourlyRate)
              : undefined,
            dailyRate: item.product.pricing.dailyRate
              ? Number(item.product.pricing.dailyRate)
              : undefined,
            weeklyRate: item.product.pricing.weeklyRate
              ? Number(item.product.pricing.weeklyRate)
              : undefined,
            monthlyRate: item.product.pricing.monthlyRate
              ? Number(item.product.pricing.monthlyRate)
              : undefined,
            securityDeposit: Number(item.product.pricing.securityDeposit),
            serviceFeePercent: Number(item.product.pricing.serviceFeePercent ?? 10),
            deliveryFee: Number(item.product.pricing.deliveryFee ?? 0),
          };
          calculation = calculateRentalPrice(pricingData, item.startDate, item.endDate);
          totalRentalPrice += calculation.baseRentalPrice * item.quantity;
          totalDeposit += calculation.securityDeposit * item.quantity;
          totalServiceFee += calculation.serviceFee * item.quantity;
          totalDeliveryFee += calculation.deliveryFee;
        } catch {
          // ignore
        }
      }

      return {
        ...item,
        priceCalculation: calculation,
      };
    });

    return {
      items: enrichedItems,
      summary: {
        totalItems: items.reduce((sum, item) => sum + item.quantity, 0),
        totalRentalPrice,
        totalDeposit,
        totalServiceFee,
        totalDeliveryFee,
        grandTotal: totalRentalPrice + totalServiceFee + totalDeliveryFee,
        totalAuthorization:
          totalRentalPrice + totalServiceFee + totalDeliveryFee + totalDeposit,
      },
    };
  }

  async addToCart(userId, input) {
    const start = parseDateSafe(input.startDate);
    const end = parseDateSafe(input.endDate);
    if (!start || !end) {
      throw new ValidationError("Invalid start or end date");
    }
    const validation = validateRentalDateRange(start, end);
    if (!validation.valid) {
      throw new ValidationError(validation.error);
    }

    const product = await productRepository.findById(input.productId);
    if (!product || product.status !== "active") {
      throw new NotFoundError("Product not found or unavailable");
    }
    if (product.sellerId === userId) {
      throw new ValidationError("You cannot add your own product to cart");
    }

    const overlaps = await bookingRepository.findOverlappingBookings(
      input.productId,
      start,
      end
    );
    if (overlaps.length > 0) {
      throw new ValidationError("Product is already booked for these dates");
    }

    const existing = await cartRepository.findByUserAndProduct(userId, input.productId);
    if (existing) {
      return cartRepository.updateItem(existing.id, {
        quantity: existing.quantity + input.quantity,
        startDate: input.startDate,
        endDate: input.endDate,
      });
    }
    return cartRepository.addItem(userId, input);
  }

  async updateCartItem(userId, itemId, input) {
    const item = await cartRepository.findById(itemId);
    if (!item) throw new NotFoundError("Cart item");
    if (item.userId !== userId) throw new ForbiddenError("Not authorized");

    if (input.startDate && input.endDate) {
      const start = parseDateSafe(input.startDate);
      const end = parseDateSafe(input.endDate);
      if (start && end) {
        const validation = validateRentalDateRange(start, end);
        if (!validation.valid) throw new ValidationError(validation.error);
      }
    }

    return cartRepository.updateItem(itemId, input);
  }

  async removeItem(userId, itemId) {
    const item = await cartRepository.findById(itemId);
    if (!item) throw new NotFoundError("Cart item");
    if (item.userId !== userId) throw new ForbiddenError("Not authorized");
    return cartRepository.removeItem(itemId);
  }

  async clearCart(userId) {
    await cartRepository.clearCart(userId);
  }
}

export const cartService = new CartService();
