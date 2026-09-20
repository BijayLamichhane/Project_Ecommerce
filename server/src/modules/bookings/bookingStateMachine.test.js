import { describe, it, expect } from "vitest";
import { isValidTransition, returnRequestSchema } from "./booking.schema.js";

describe("Booking State Machine Transitions", () => {
  it("allows valid transitions", () => {
    expect(isValidTransition("pending", "confirmed")).toBe(true);
    expect(isValidTransition("pending", "rejected")).toBe(true);
    expect(isValidTransition("pending", "cancelled")).toBe(true);
    expect(isValidTransition("pending", "expired")).toBe(true);
    expect(isValidTransition("confirmed", "active")).toBe(true);
    expect(isValidTransition("confirmed", "cancelled")).toBe(true);
    expect(isValidTransition("active", "return_requested")).toBe(true);
    expect(isValidTransition("return_requested", "returned")).toBe(true);
    expect(isValidTransition("returned", "completed")).toBe(true);
  });

  it("accepts the return conditions used by the booking UI", () => {
    expect(returnRequestSchema.safeParse({ condition: "damaged" }).success).toBe(true);
    expect(returnRequestSchema.safeParse({ condition: "like_new" }).success).toBe(true);
  });

  it("blocks invalid transitions", () => {
    expect(isValidTransition("pending", "completed")).toBe(false);
    expect(isValidTransition("cancelled", "active")).toBe(false);
    expect(isValidTransition("completed", "pending")).toBe(false);
    expect(isValidTransition("rejected", "confirmed")).toBe(false);
    expect(isValidTransition("expired", "confirmed")).toBe(false);
    expect(isValidTransition("expired", "cancelled")).toBe(false);
  });
});
