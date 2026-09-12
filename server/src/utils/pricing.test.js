import { describe, it, expect } from "vitest";
import { calculateRentalPrice, formatCurrencyNPR } from "./pricing.js";
import { addDays } from "date-fns";

describe("Pricing Engine", () => {
  const samplePricing = {
    dailyRate: 1000,
    weeklyRate: 5500,
    monthlyRate: 20000,
    securityDeposit: 10000,
    serviceFeePercent: 10,
    deliveryFee: 200,
  };

  it("calculates 1 day rental accurately", () => {
    const start = new Date("2026-09-01T10:00:00Z");
    const end = addDays(start, 1);
    const result = calculateRentalPrice(samplePricing, start, end);
    expect(result.durationUnit).toBe("daily");
    expect(result.durationValue).toBe(1);
    expect(result.baseRentalPrice).toBe(1000);
    expect(result.serviceFee).toBe(100);
    expect(result.deliveryFee).toBe(200);
    expect(result.totalRentalPrice).toBe(1300);
    expect(result.securityDeposit).toBe(10000);
  });

  it("applies weekly discount tier when duration is 1 week", () => {
    const start = new Date("2026-09-01T10:00:00Z");
    const end = addDays(start, 7);
    const result = calculateRentalPrice(samplePricing, start, end);
    expect(result.durationUnit).toBe("weekly");
    expect(result.durationValue).toBe(1);
    expect(result.baseRentalPrice).toBe(5500);
    expect(result.serviceFee).toBe(550);
  });

  it("formats NPR currency correctly", () => {
    expect(formatCurrencyNPR(10000)).toMatch(/Rs\.\s?10,000/);
  });

  it("throws error when end date is not after start date", () => {
    const start = new Date("2026-09-05T10:00:00Z");
    const end = new Date("2026-09-01T10:00:00Z");
    expect(() => calculateRentalPrice(samplePricing, start, end)).toThrow();
  });
});
