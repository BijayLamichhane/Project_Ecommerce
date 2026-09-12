import { Payment } from "../../models/Payment.js";

export class PaymentRepository {
  async findByBookingId(bookingId) {
    return Payment.findOne({ bookingId }).lean({ virtuals: true });
  }

  async findDepositByBookingId(bookingId) {
    return Payment.findOne({ bookingId, type: "security_deposit" }).lean({ virtuals: true });
  }

  async createPayment(data) {
    const payment = await Payment.create(data);
    return payment.toJSON();
  }

  async updatePayment(id, data) {
    return Payment.findByIdAndUpdate(id, { $set: data }, { new: true }).lean({ virtuals: true });
  }

  async updateDeposit(id, data) {
    return Payment.findByIdAndUpdate(id, { $set: data }, { new: true }).lean({ virtuals: true });
  }
}

export const paymentRepository = new PaymentRepository();
