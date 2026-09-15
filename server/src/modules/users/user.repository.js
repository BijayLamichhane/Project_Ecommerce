import { User } from "../../models/User.js";
import { Booking } from "../../models/Booking.js";
import { Product } from "../../models/Product.js";

function formatUser(user) {
  if (!user) return null;
  if (!user.id && user._id) user.id = String(user._id);
  return user;
}

export class UserRepository {
  async findById(id) {
    const user = await User.findById(id).lean({ virtuals: true });
    return formatUser(user);
  }

  async findByEmail(email) {
    const user = await User.findOne({ email }).lean({ virtuals: true });
    return formatUser(user);
  }

  async updateProfile(userId, data) {
    const update = {};
    if (data.name) update.name = data.name;
    if (data.phone) update.phone = data.phone;
    if (data.avatarUrl) update.avatarUrl = data.avatarUrl;

    if (data.bio !== undefined) update["profile.bio"] = data.bio;
    if (data.address !== undefined) update["profile.address"] = data.address;
    if (data.city !== undefined) update["profile.city"] = data.city;
    if (data.state !== undefined) update["profile.state"] = data.state;
    if (data.postalCode !== undefined) update["profile.postalCode"] = data.postalCode;

    const user = await User.findByIdAndUpdate(userId, { $set: update }, { new: true }).lean({ virtuals: true });
    return formatUser(user);
  }

  async createSellerProfile(userId, data) {
    const payoutMethod = data.payoutMethod || "bank_account";
    const payoutSettings = {
      method: payoutMethod,
      status: payoutMethod === "debit_credit_card" ? "demo" : "configured",
    };

    if (payoutMethod === "debit_credit_card") {
      payoutSettings.type = "debit_credit_card";
      payoutSettings.cardholderName = data.cardHolderName;
      payoutSettings.cardBrand = "Demo Card";
      payoutSettings.last4 = data.cardLast4;
      payoutSettings.expiry = data.cardExpiry;
      payoutSettings.isDemo = true;
    } else {
      payoutSettings.type = "bank_account";
      payoutSettings.bankName = data.bankName;
      payoutSettings.accountName = data.bankAccountName;
      payoutSettings.accountLast4 = String(data.bankAccountNumber || "").slice(-4);
    }

    const sellerProfile = {
      businessName: data.businessName,
      businessDescription: data.businessDescription,
      businessAddress: data.businessAddress,
      businessCity: data.businessCity,
      panNumber: data.panNumber,
      bankAccountName: payoutMethod === "bank_account" ? data.bankAccountName : "",
      bankAccountNumber: payoutMethod === "bank_account" ? data.bankAccountNumber : "",
      bankName: payoutMethod === "bank_account" ? data.bankName : "",
      payoutSettings,
      status: "approved",
      isVerified: true,
      verifiedAt: new Date(),
    };

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: { role: "seller", sellerProfile } },
      { new: true }
    ).lean({ virtuals: true });

    return user?.sellerProfile;
  }

  async updateSellerSettings(userId, data) {
    const update = {};
    const allowed = [
      "businessName",
      "businessDescription",
      "businessAddress",
      "businessCity",
      "panNumber",
      "bankAccountName",
      "bankAccountNumber",
      "bankName",
    ];

    for (const key of allowed) {
      if (data[key] !== undefined) update[`sellerProfile.${key}`] = data[key];
    }

    if (data.payoutMethod === "bank_account") {
      update["sellerProfile.payoutSettings.method"] = "bank_account";
      update["sellerProfile.payoutSettings.type"] = "bank_account";
      update["sellerProfile.payoutSettings.status"] = "configured";
      if (data.bankName !== undefined) update["sellerProfile.payoutSettings.bankName"] = data.bankName;
      if (data.bankAccountName !== undefined) update["sellerProfile.payoutSettings.accountName"] = data.bankAccountName;
      if (data.bankAccountNumber !== undefined) {
        update["sellerProfile.payoutSettings.accountLast4"] = String(data.bankAccountNumber).slice(-4);
      }
    } else if (data.payoutMethod === "debit_credit_card") {
      update["sellerProfile.payoutSettings.method"] = "debit_credit_card";
      update["sellerProfile.payoutSettings.type"] = "debit_credit_card";
      update["sellerProfile.payoutSettings.status"] = "demo";
      update["sellerProfile.payoutSettings.isDemo"] = true;
      if (data.cardHolderName !== undefined) update["sellerProfile.payoutSettings.cardholderName"] = data.cardHolderName;
      if (data.cardLast4 !== undefined) update["sellerProfile.payoutSettings.last4"] = data.cardLast4;
      if (data.cardExpiry !== undefined) update["sellerProfile.payoutSettings.expiry"] = data.cardExpiry;
      update["sellerProfile.payoutSettings.cardBrand"] = "Demo Card";
    }

    const updated = await User.findByIdAndUpdate(userId, { $set: update }, { new: true }).lean({ virtuals: true });
    return updated?.sellerProfile;
  }

  async getSellerEarnings(sellerId) {
    const seller = await User.findById(sellerId).lean({ virtuals: true });

    const [completedBookings, activeRentals, pendingRequests, totalProducts] = await Promise.all([
      Booking.find({ sellerId, status: "completed" }).sort({ createdAt: -1 }).lean({ virtuals: true }),
      Booking.find({ sellerId, status: "active" }).lean({ virtuals: true }),
      Booking.find({ sellerId, status: "pending" }).lean({ virtuals: true }),
      Product.countDocuments({ sellerId, status: "active" }),
    ]);

    const totalEarnings = completedBookings.reduce((sum, b) => sum + Number(b.totalRentalPrice || 0), 0);

    return {
      profile: seller?.sellerProfile,
      metrics: {
        totalEarnings,
        activeRentalsCount: activeRentals.length,
        pendingRequestsCount: pendingRequests.length,
        totalProducts,
        completedRentalsCount: completedBookings.length,
      },
      recentEarnings: completedBookings.slice(0, 10),
    };
  }

  async getCustomerStats(customerId) {
    const allBookings = await Booking.find({ customerId }).lean({ virtuals: true });

    const activeRentals = allBookings.filter((b) => b.status === "active");
    const upcomingBookings = allBookings.filter((b) => b.status === "confirmed" || b.status === "pending");
    const completedRentals = allBookings.filter((b) => b.status === "completed" || b.status === "returned");

    return {
      activeRentalsCount: activeRentals.length,
      upcomingBookingsCount: upcomingBookings.length,
      completedRentalsCount: completedRentals.length,
      totalSpent: completedRentals.reduce((sum, b) => sum + Number(b.totalAmount || 0), 0),
      currentRentals: activeRentals,
    };
  }
}

export const userRepository = new UserRepository();
