import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

const reportSchema = new mongoose.Schema(
  {
    _id: { type: String, default: () => uuidv4() },
    reporterId: { type: String, required: true, ref: "User" },
    reportedUserId: { type: String, ref: "User" },
    reportedProductId: { type: String, ref: "Product" },
    reportedReviewId: { type: String, ref: "Review" },
    targetType: {
      type: String,
      enum: ["product", "user", "review"],
      required: true,
    },
    reason: { type: String, required: true },
    details: { type: String },
    status: {
      type: String,
      enum: ["pending", "reviewed", "resolved", "dismissed"],
      default: "pending",
    },
    resolvedBy: { type: String, ref: "User" },
    resolutionNotes: { type: String },
    resolvedAt: { type: Date },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        ret.id = ret._id;
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform: (doc, ret) => {
        ret.id = ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

reportSchema.virtual("id").get(function () {
  return this._id;
});

const auditLogSchema = new mongoose.Schema(
  {
    _id: { type: String, default: () => uuidv4() },
    userId: { type: String, ref: "User" },
    action: { type: String, required: true },
    entityType: { type: String, required: true },
    entityId: { type: String },
    details: { type: mongoose.Schema.Types.Mixed },
    ipAddress: { type: String },
    userAgent: { type: String },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        ret.id = ret._id;
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform: (doc, ret) => {
        ret.id = ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

auditLogSchema.virtual("id").get(function () {
  return this._id;
});

export const Report = mongoose.models.Report || mongoose.model("Report", reportSchema);
export const AuditLog = mongoose.models.AuditLog || mongoose.model("AuditLog", auditLogSchema);
