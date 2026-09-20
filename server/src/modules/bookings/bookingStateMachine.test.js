import { describe, it, expect } from "vitest";
import { isValidTransition } from "./booking.schema.js";

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

  it("blocks invalid transitions", () => {
    expect(isValidTransition("pending", "completed")).toBe(false);
    expect(isValidTransition("cancelled", "active")).toBe(false);
    expect(isValidTransition("completed", "pending")).toBe(false);
    expect(isValidTransition("rejected", "confirmed")).toBe(false);
    expect(isValidTransition("expired", "confirmed")).toBe(false);
    expect(isValidTransition("expired", "cancelled")).toBe(false);
  });
});
