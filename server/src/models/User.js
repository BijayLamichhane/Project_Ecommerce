import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

const profileSchema = new mongoose.Schema(
  {
    _id: { type: String, default: () => uuidv4() },
    bio: { type: String, default: "" },
    address: { type: String, default: "" },
    city: { type: String, default: "" },
    state: { type: String, default: "" },
    country: { type: String, default: "Nepal" },
    postalCode: { type: String, default: "" },
    latitude: { type: Number },
    longitude: { type: Number },
  },
  { _id: false, timestamps: true }
);

const sellerProfileSchema = new mongoose.Schema(
  {
    _id: { type: String, default: () => uuidv4() },
    businessName: { type: String, default: "" },
    businessDescription: { type: String, default: "" },
    businessAddress: { type: String, default: "" },
    businessCity: { type: String, default: "" },
    panNumber: { type: String, default: "" },
    bankAccountName: { type: String, default: "" },
    bankAccountNumber: { type: String, default: "" },
    bankName: { type: String, default: "" },
    isVerified: { type: Boolean, default: false },
    verifiedAt: { type: Date },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "suspended"],
      default: "pending",
    },
    rejectionReason: { type: String },
    disbandRequested: { type: Boolean, default: false },
    disbandRequestedAt: { type: Date },
    disbandedAt: { type: Date },
    totalRatings: { type: Number, default: 0 },
    averageRating: { type: String, default: "0" },
    totalEarnings: { type: String, default: "0" },
    payoutSettings: { type: mongoose.Schema.Types.Mixed },
  },
  { _id: false, timestamps: true }
);

const userSchema = new mongoose.Schema(
  {
    _id: { type: mongoose.Schema.Types.Mixed, default: () => uuidv4() },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    emailVerified: { type: Boolean, default: false },
    name: { type: String, required: true },
    password: { type: String, select: false },
    role: {
      type: String,
      enum: ["customer", "seller", "admin"],
      default: "customer",
    },
    status: {
      type: String,
      enum: ["active", "suspended", "pending_verification"],
      default: "active",
    },
    avatarUrl: { type: String },
    phone: { type: String },
    profile: { type: profileSchema, default: () => ({}) },
    sellerProfile: { type: sellerProfileSchema },
  },
  {
    collection: "user",
    timestamps: true,
    strict: false,
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        ret.id = String(ret._id);
        delete ret.password;
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform: (doc, ret) => {
        ret.id = String(ret._id);
        delete ret.password;
        delete ret.__v;
        return ret;
      },
    },
  }
);

userSchema.pre(["find", "findOne", "findOneAndUpdate", "findOneAndDelete", "updateOne", "updateMany"], function () {
  const filter = this.getQuery();
  if (filter && filter._id && typeof filter._id === "string" && filter._id.length === 24 && /^[0-9a-fA-F]{24}$/.test(filter._id)) {
    filter.$or = [{ _id: filter._id }, { _id: new mongoose.Types.ObjectId(filter._id) }];
    delete filter._id;
  }
});

userSchema.virtual("id").get(function () {
  return String(this._id);
});

export const User = mongoose.models.User || mongoose.model("User", userSchema, "user");
