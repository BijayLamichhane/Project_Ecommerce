import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../models/User.js", () => ({
  User: {
    findById: vi.fn(),
  },
}));

vi.mock("../../models/Product.js", () => ({
  Product: {
    findById: vi.fn(),
  },
}));

vi.mock("../../models/Booking.js", () => ({
  Booking: {
    findById: vi.fn(),
  },
}));

vi.mock("./messaging.repository.js", () => ({
  messagingRepository: {
    createConversation: vi.fn(),
  },
}));

import { User } from "../../models/User.js";
import { Product } from "../../models/Product.js";
import { Booking } from "../../models/Booking.js";
import { messagingRepository } from "./messaging.repository.js";
import { MessagingService } from "./messaging.service.js";
import { Conversation } from "../../models/Messaging.js";

const service = new MessagingService();

function queryResult(value) {
  return {
    select: vi.fn().mockReturnThis(),
    lean: vi.fn().mockResolvedValue(value),
  };
}

function mockUsers(sender, recipient) {
  User.findById
    .mockReturnValueOnce(queryResult(sender))
    .mockReturnValueOnce(queryResult(recipient));
}

describe("MessagingService.createConversation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Product.findById.mockReturnValue(queryResult(null));
    Booking.findById.mockReturnValue(queryResult(null));
    messagingRepository.createConversation.mockResolvedValue({
      id: "conversation-1",
    });
  });

  it("allows a customer to message a seller without a listing context", async () => {
    mockUsers(
      { _id: "customer-1", role: "customer", status: "active" },
      { _id: "seller-1", role: "seller", status: "active" }
    );

    await expect(
      service.createConversation("customer-1", "seller-1")
    ).resolves.toEqual({ id: "conversation-1" });

    expect(messagingRepository.createConversation).toHaveBeenCalledWith(
      expect.objectContaining({
        customerId: "customer-1",
        sellerId: "seller-1",
      })
    );
  });

  it("allows a customer to message an admin who owns the referenced product", async () => {
    mockUsers(
      { _id: "customer-1", role: "customer", status: "active" },
      { _id: "admin-1", role: "admin", status: "active" }
    );
    Product.findById.mockReturnValue(
      queryResult({
        _id: "product-1",
        sellerId: "admin-1",
        status: "active",
      })
    );

    await expect(
      service.createConversation("customer-1", "admin-1", "product-1")
    ).resolves.toEqual({ id: "conversation-1" });
  });

  it("allows a customer to message an admin who owns the referenced booking", async () => {
    mockUsers(
      { _id: "customer-1", role: "customer", status: "active" },
      { _id: "admin-1", role: "admin", status: "active" }
    );
    Booking.findById.mockReturnValue(
      queryResult({
        _id: "booking-1",
        sellerId: "admin-1",
      })
    );

    await expect(
      service.createConversation("customer-1", "admin-1", undefined, "booking-1")
    ).resolves.toEqual({ id: "conversation-1" });
  });

  it("still blocks a customer from messaging an admin who does not own the referenced listing", async () => {
    mockUsers(
      { _id: "customer-1", role: "customer", status: "active" },
      { _id: "admin-1", role: "admin", status: "active" }
    );
    Product.findById.mockReturnValue(
      queryResult({
        _id: "product-1",
        sellerId: "seller-2",
        status: "active",
      })
    );

    await expect(
      service.createConversation("customer-1", "admin-1", "product-1")
    ).rejects.toThrow(
      "Messaging is available only between customers and sellers"
    );
    expect(messagingRepository.createConversation).not.toHaveBeenCalled();
  });

  it("keeps admin senders blocked", async () => {
    mockUsers(
      { _id: "admin-1", role: "admin", status: "active" },
      { _id: "seller-1", role: "seller", status: "active" }
    );

    await expect(
      service.createConversation("admin-1", "seller-1")
    ).rejects.toThrow(
      "Messaging is available only between customers and sellers"
    );
    expect(messagingRepository.createConversation).not.toHaveBeenCalled();
  });

  it("preserves bookingId in the Conversation schema and create payload", async () => {
    mockUsers(
      { _id: "customer-1", role: "customer", status: "active" },
      { _id: "seller-1", role: "seller", status: "active" }
    );
    const booking = {
      _id: "booking-1",
      sellerId: "seller-1",
    };
    Booking.findById.mockReturnValue(queryResult(booking));

    await service.createConversation(
      "customer-1",
      "seller-1",
      undefined,
      "booking-1"
    );

    expect(messagingRepository.createConversation).toHaveBeenCalledWith(
      expect.objectContaining({
        customerId: "customer-1",
        sellerId: "seller-1",
        bookingId: "booking-1",
      })
    );

    expect(Conversation.schema.path("bookingId")).toBeDefined();

    const conversation = new Conversation({
      _id: "conversation-1",
      customerId: "customer-1",
      sellerId: "seller-1",
      bookingId: "booking-1",
    });

    expect(conversation.toObject().bookingId).toBe("booking-1");
  });
});
