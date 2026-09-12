import { describe, it, expect } from "vitest";
import {
  doRangesOverlap,
  findConflictingBooking,
  validateRentalDateRange,
} from "./availability.js";

describe("Rental Availability & Conflict Detection Algorithm", () => {
  const existingBooking = {
    startDate: new Date("2026-08-28T00:00:00Z"),
    endDate: new Date("2026-09-02T00:00:00Z"),
  };

  it("detects overlapping range (Aug 30 -> Sep 04 is NOT AVAILABLE)", () => {
    const requested = {
      startDate: new Date("2026-08-30T00:00:00Z"),
      endDate: new Date("2026-09-04T00:00:00Z"),
    };
    const overlaps = doRangesOverlap(existingBooking, requested);
    expect(overlaps).toBe(true);
  });

  it("detects overlapping range (Aug 25 -> Aug 30 is NOT AVAILABLE)", () => {
    const requested = {
      startDate: new Date("2026-08-25T00:00:00Z"),
      endDate: new Date("2026-08-30T00:00:00Z"),
    };
    const overlaps = doRangesOverlap(existingBooking, requested);
    expect(overlaps).toBe(true);
  });

  it("detects overlapping range fully enclosing existing booking", () => {
    const requested = {
      startDate: new Date("2026-08-20T00:00:00Z"),
      endDate: new Date("2026-09-10T00:00:00Z"),
    };
    const overlaps = doRangesOverlap(existingBooking, requested);
    expect(overlaps).toBe(true);
  });

  it("allows non-overlapping subsequent booking (Sep 03 -> Sep 08 is AVAILABLE)", () => {
    const requested = {
      startDate: new Date("2026-09-03T00:00:00Z"),
      endDate: new Date("2026-09-08T00:00:00Z"),
    };
    const overlaps = doRangesOverlap(existingBooking, requested);
    expect(overlaps).toBe(false);
  });

  it("allows adjacent booking ending when next starts (Aug 20 -> Aug 28)", () => {
    const requested = {
      startDate: new Date("2026-08-20T00:00:00Z"),
      endDate: new Date("2026-08-28T00:00:00Z"),
    };
    const overlaps = doRangesOverlap(existingBooking, requested);
    expect(overlaps).toBe(false);
  });

  it("identifies conflicting booking from a list", () => {
    const bookingsList = [
      existingBooking,
      {
        startDate: new Date("2026-09-10T00:00:00Z"),
        endDate: new Date("2026-09-15T00:00:00Z"),
      },
    ];
    const requested = {
      startDate: new Date("2026-09-12T00:00:00Z"),
      endDate: new Date("2026-09-18T00:00:00Z"),
    };
    const conflict = findConflictingBooking(requested, bookingsList);
    expect(conflict).not.toBeNull();
    expect(conflict?.startDate).toEqual(new Date("2026-09-10T00:00:00Z"));
  });

  it("validates rental dates correctly", () => {
    const valid = validateRentalDateRange(
      new Date("2026-09-01"),
      new Date("2026-09-05"),
      { allowPastDates: true }
    );
    expect(valid.valid).toBe(true);
    const invalid = validateRentalDateRange(
      new Date("2026-09-05"),
      new Date("2026-09-01"),
      { allowPastDates: true }
    );
    expect(invalid.valid).toBe(false);
  });
});
