import { bookingService } from "./booking.service.js";
import { sendSuccess, sendCreated } from "../../utils/response.js";

export class BookingController {
  async getById(req, res, next) {
    try {
      const booking = await bookingService.getById(
        req.params.id,
        req.user.id,
        req.user.role
      );
      sendSuccess(res, booking);
    } catch (error) {
      next(error);
    }
  }

  async getMyBookings(req, res, next) {
    try {
      const status = req.query.status;
      const bookings = await bookingService.getCustomerBookings(req.user.id, status);
      sendSuccess(res, bookings);
    } catch (error) {
      next(error);
    }
  }

  async getSellerBookings(req, res, next) {
    try {
      const status = req.query.status;
      const bookings = await bookingService.getSellerBookings(req.user.id, status);
      sendSuccess(res, bookings);
    } catch (error) {
      next(error);
    }
  }

  async create(req, res, next) {
    try {
      const booking = await bookingService.createBooking(req.user.id, req.body);
      sendCreated(res, booking, "Booking created successfully");
    } catch (error) {
      next(error);
    }
  }

  async updateStatus(req, res, next) {
    try {
      const { status, reason } = req.body;
      const booking = await bookingService.updateStatus(
        req.params.id,
        req.user.id,
        req.user.role,
        status,
        reason
      );
      sendSuccess(res, booking, `Booking ${status}`);
    } catch (error) {
      next(error);
    }
  }

  async cancel(req, res, next) {
    try {
      const booking = await bookingService.updateStatus(
        req.params.id,
        req.user.id,
        req.user.role,
        "cancelled",
        req.body?.reason
      );
      sendSuccess(res, booking, "Booking cancelled");
    } catch (error) {
      next(error);
    }
  }

  async requestReturn(req, res, next) {
    try {
      const booking = await bookingService.updateStatus(
        req.params.id,
        req.user.id,
        req.user.role,
        "return_requested"
      );
      sendSuccess(res, booking, "Return requested");
    } catch (error) {
      next(error);
    }
  }

  async calculatePrice(req, res, next) {
    try {
      const { productId, startDate, endDate } = req.query;
      const calculation = await bookingService.calculatePrice(productId, startDate, endDate);
      sendSuccess(res, calculation);
    } catch (error) {
      next(error);
    }
  }

  async getAvailability(req, res, next) {
    try {
      const { productId } = req.params;
      const year = Number(req.query.year) || new Date().getFullYear();
      const month = Number(req.query.month) || new Date().getMonth() + 1;
      const availability = await bookingService.getAvailability(productId, year, month);
      sendSuccess(res, availability);
    } catch (error) {
      next(error);
    }
  }
}

export const bookingController = new BookingController();
