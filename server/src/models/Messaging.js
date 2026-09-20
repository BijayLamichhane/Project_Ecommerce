import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

const messageSchema = new mongoose.Schema(
  {
    _id: { type: String, default: () => uuidv4() },
    conversationId: { type: String, required: true, ref: "Conversation" },
    senderId: { type: String, required: true, ref: "User" },
    content: { type: String, required: true },
    imageUrl: { type: String },
    isRead: { type: Boolean, default: false },
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

messageSchema.virtual("id").get(function () {
  return this._id;
});

messageSchema.virtual("sender", {
  ref: "User",
  localField: "senderId",
  foreignField: "_id",
  justOne: true,
});

const conversationSchema = new mongoose.Schema(
  {
    _id: { type: String, default: () => uuidv4() },
    customerId: { type: String, required: true, ref: "User" },
    sellerId: { type: String, required: true, ref: "User" },
    productId: { type: String, ref: "Product" },
    bookingId: { type: String, ref: "Booking" },
    lastMessageAt: { type: Date, default: Date.now },
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

conversationSchema.virtual("id").get(function () {
  return this._id;
});

conversationSchema.virtual("customer", {
  ref: "User",
  localField: "customerId",
  foreignField: "_id",
  justOne: true,
});

conversationSchema.virtual("seller", {
  ref: "User",
  localField: "sellerId",
  foreignField: "_id",
  justOne: true,
});

conversationSchema.virtual("product", {
  ref: "Product",
  localField: "productId",
  foreignField: "_id",
  justOne: true,
});

export const Conversation = mongoose.models.Conversation || mongoose.model("Conversation", conversationSchema);
export const Message = mongoose.models.Message || mongoose.model("Message", messageSchema);
