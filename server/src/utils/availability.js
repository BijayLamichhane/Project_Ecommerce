import { isBefore, isAfter, differenceInDays, parseISO } from "date-fns";

export function doRangesOverlap(a, b) {
  return isBefore(a.startDate, b.endDate) && isAfter(a.endDate, b.startDate);
}

export function findConflictingBooking(requested, existingBookings) {
  for (const booking of existingBookings) {
    if (doRangesOverlap(booking, requested)) {
      return booking;
    }
  }
  return null;
}

export function getDatesInRange(startDate, endDate) {
  const dates = [];
  const current = new Date(startDate);
  current.setUTCHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setUTCHours(0, 0, 0, 0);

  while (!isAfter(current, end)) {
    dates.push(new Date(current));
    current.setUTCDate(current.getUTCDate() + 1);
  }
  return dates;
}

export function validateRentalDateRange(startDate, endDate, options = {}) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (!options.allowPastDates && isBefore(startDate, today)) {
    return { valid: false, error: "Start date cannot be in the past" };
  }

  if (!isAfter(endDate, startDate)) {
    return { valid: false, error: "End date must be after start date" };
  }

  const days = differenceInDays(endDate, startDate);

  if (options.minDays && days < options.minDays) {
    return { valid: false, error: `Minimum rental period is ${options.minDays} day(s)` };
  }

  if (options.maxDays && days > options.maxDays) {
    return { valid: false, error: `Maximum rental period is ${options.maxDays} day(s)` };
  }

  return { valid: true };
}

export function parseDateSafe(dateStr) {
  try {
    const date = parseISO(dateStr);
    if (isNaN(date.getTime())) return null;
    return date;
  } catch {
    return null;
  }
}
