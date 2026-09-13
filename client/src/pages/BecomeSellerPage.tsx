import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { api } from "../lib/axios";
import { useAuth } from "../hooks/useAuth";
import {
  ShieldCheck,
  Building,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from "lucide-react";

export function BecomeSellerPage() {
  const navigate = useNavigate();
  const { isAuthenticated, setUser } = useAuth();

  const [formData, setFormData] = useState({
    businessName: "",
    businessDescription: "",
    businessAddress: "",
    businessCity: "Kathmandu",
    panNumber: "",
    bankAccountName: "",
    bankAccountNumber: "",
    bankName: "Nabil Bank Ltd.",
  });

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const registerMutation = useMutation({
    mutationFn: async () => {
      setErrorMsg(null);
      const { data } = await api.post("/users/become-seller", formData);
      return data.data;
    },
    onSuccess: async () => {
      // The client's cached user still has role: "customer" at this point —
      // refetch it now that the server has upgraded the account, so
      // ProtectedRoute's role check on /seller sees the update immediately
      // instead of needing a full page reload to pick it up.
      const { data: me } = await api.get("/users/me");
      setUser(me.data);
      navigate("/seller", { replace: true });
    },
    onError: (err: any) => {
      const details = err.response?.data?.error?.details;
      let msg = err.response?.data?.error?.message || "Failed to register as a seller";
      if (details) {
        const firstField = Object.keys(details).find((k) => k !== "_errors" && details[k]?._errors?.length);
        if (firstField && details[firstField]?._errors?.[0]) {
          msg = `${firstField}: ${details[firstField]._errors[0]}`;
        }
      }
      setErrorMsg(msg);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      navigate("/login?redirect=/become-seller");
      return;
    }
    registerMutation.mutate();
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <div className="text-center space-y-2 max-w-xl mx-auto">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold">
          <Sparkles className="w-3.5 h-3.5" />
          Monetize Your Equipment
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          Become a Verified Lender on RentHub
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          List your cameras, drones, camping gear, and power tools. Set your terms, require security deposits, and earn recurring rental revenue.
        </p>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm space-y-6">
        <div className="space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
            <Building className="w-4 h-4 text-indigo-600" />
            Lender Business Information
          </h3>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Business or Display Name *</label>
            <input
              type="text"
              placeholder="e.g. Apex Cine & Lens Rentals"
              value={formData.businessName}
              onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Business Address *</label>
            <input
              type="text"
              placeholder="e.g. New Road, Ward 22"
              value={formData.businessAddress}
              onChange={(e) => setFormData({ ...formData, businessAddress: e.target.value })}
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">City *</label>
              <input
                type="text"
                value={formData.businessCity}
                onChange={(e) => setFormData({ ...formData, businessCity: e.target.value })}
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">PAN / VAT Number *</label>
              <input
                type="text"
                placeholder="e.g. 109876543"
                value={formData.panNumber}
                onChange={(e) => setFormData({ ...formData, panNumber: e.target.value })}
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none"
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Business Description</label>
            <textarea
              rows={3}
              placeholder="Briefly describe what kind of gear you offer and your experience..."
              value={formData.businessDescription}
              onChange={(e) => setFormData({ ...formData, businessDescription: e.target.value })}
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none"
            />
          </div>
        </div>

        {/* Bank & Payout info */}
        <div className="pt-6 border-t border-slate-100 space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            Payout & Banking Details
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Account Holder Name *</label>
              <input
                type="text"
                placeholder="Full name as per bank record"
                value={formData.bankAccountName}
                onChange={(e) => setFormData({ ...formData, bankAccountName: e.target.value })}
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Bank Name *</label>
              <input
                type="text"
                placeholder="e.g. Nabil Bank Ltd."
                value={formData.bankName}
                onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none"
                required
              />
            </div>

            <div className="sm:col-span-2 space-y-1">
              <label className="text-xs font-bold text-slate-700">Bank Account Number *</label>
              <input
                type="text"
                placeholder="e.g. 01234567890123"
                value={formData.bankAccountNumber}
                onChange={(e) => setFormData({ ...formData, bankAccountNumber: e.target.value })}
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none font-mono"
                required
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={registerMutation.isPending}
          className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md shadow-indigo-200 transition"
        >
          {registerMutation.isPending ? "Setting up Seller Account..." : "Complete Seller Registration"}
        </button>
      </form>
    </div>
  );
}
