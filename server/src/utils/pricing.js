import { isAfter, differenceInHours, differenceInDays } from "date-fns";

const DEFAULT_SERVICE_FEE_PERCENT = 10;

export function calculateRentalPrice(pricing, startDate, endDate) {
  if (!isAfter(endDate, startDate)) {
    throw new Error("End date must be after start date");
  }

  const totalHours = differenceInHours(endDate, startDate);
  const totalDays = differenceInDays(endDate, startDate);
  const totalWeeks = Math.floor(totalDays / 7);
  const totalMonths = Math.floor(totalDays / 30);

  let baseRentalPrice = 0;
  let durationUnit = "daily";
  let durationValue = totalDays;

  if (totalMonths >= 1 && pricing.monthlyRate) {
    const remainingDays = totalDays - totalMonths * 30;
    baseRentalPrice = totalMonths * pricing.monthlyRate;
    if (remainingDays > 0 && pricing.dailyRate) {
      baseRentalPrice += remainingDays * pricing.dailyRate;
    }
    durationUnit = "monthly";
    durationValue = totalMonths;
  } else if (totalWeeks >= 1 && pricing.weeklyRate) {
    const remainingDays = totalDays - totalWeeks * 7;
    baseRentalPrice = totalWeeks * pricing.weeklyRate;
    if (remainingDays > 0 && pricing.dailyRate) {
      baseRentalPrice += remainingDays * pricing.dailyRate;
    }
    durationUnit = "weekly";
    durationValue = totalWeeks;
  } else if (totalDays >= 1 && pricing.dailyRate) {
    baseRentalPrice = totalDays * pricing.dailyRate;
    durationUnit = "daily";
    durationValue = totalDays;
  } else if (totalHours >= 1 && pricing.hourlyRate) {
    baseRentalPrice = totalHours * pricing.hourlyRate;
    durationUnit = "hourly";
    durationValue = totalHours;
  } else {
    throw new Error("No applicable pricing rate found for the requested duration");
  }

  const serviceFeePercent = pricing.serviceFeePercent ?? DEFAULT_SERVICE_FEE_PERCENT;
  const serviceFee = Math.round((baseRentalPrice * serviceFeePercent) / 100);
  const deliveryFee = pricing.deliveryFee ?? 0;
  const totalRentalPrice = baseRentalPrice + serviceFee + deliveryFee;
  const securityDeposit = pricing.securityDeposit;

  const breakdown = [
    {
      label: `Rental (${durationValue} ${durationUnit}${durationValue > 1 ? "s" : ""})`,
      amount: baseRentalPrice,
    },
    {
      label: `Service fee (${serviceFeePercent}%)`,
      amount: serviceFee,
    },
  ];

  if (deliveryFee > 0) {
    breakdown.push({ label: "Delivery fee", amount: deliveryFee });
  }

  return {
    startDate,
    endDate,
    durationUnit,
    durationValue,
    baseRentalPrice,
    serviceFee,
    deliveryFee,
    totalRentalPrice,
    securityDeposit,
    grandTotal: totalRentalPrice,
    breakdown,
  };
}

export function formatCurrencyNPR(amount) {
  return `Rs. ${Number(amount).toLocaleString("en-NP")}`;
}
