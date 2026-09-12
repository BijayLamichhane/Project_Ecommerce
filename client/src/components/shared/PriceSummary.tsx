import React from "react";
import { formatCurrency } from "../../lib/utils";
import { ShieldCheck, Info } from "lucide-react";
import type { RentalPriceCalculation } from "../../types";

interface PriceSummaryProps {
  calculation: RentalPriceCalculation | null;
  securityDeposit: number;
}

export function PriceSummary({ calculation, securityDeposit }: PriceSummaryProps) {
  if (!calculation) return null;

  const totalAuthorization = calculation.totalRentalPrice + securityDeposit;

  return (
    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-3">
      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
        Price Breakdown
      </h4>

      <div className="space-y-2 text-sm">
        {calculation.breakdown.map((item, index) => (
          <div key={index} className="flex justify-between text-slate-700">
            <span>{item.label}</span>
            <span className="font-medium text-slate-900">{formatCurrency(item.amount)}</span>
          </div>
        ))}

        <div className="pt-2 border-t border-slate-200 flex justify-between font-bold text-slate-900">
          <span>Rental Total</span>
          <span className="text-indigo-600">{formatCurrency(calculation.totalRentalPrice)}</span>
        </div>
      </div>

      {/* Security Deposit Banner */}
      <div className="mt-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200/70 text-xs">
        <div className="flex items-center justify-between font-bold text-emerald-900">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            Security Deposit (Refundable)
          </span>
          <span>{formatCurrency(securityDeposit)}</span>
        </div>
        <p className="text-emerald-700/90 text-[11px] mt-1">
          Returned in full upon return inspection of the equipment.
        </p>
      </div>

      {/* Total Due at Checkout */}
      <div className="pt-2 border-t border-slate-200 flex items-baseline justify-between">
        <div>
          <div className="text-xs text-slate-500">Total Authorization</div>
          <div className="text-[10px] text-slate-400">Includes rental + deposit</div>
        </div>
        <div className="text-lg font-extrabold text-slate-900">
          {formatCurrency(totalAuthorization)}
        </div>
      </div>
    </div>
  );
}
