import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { api } from "../lib/axios";
import { useAuth } from "../hooks/useAuth";
import { getErrorMessage } from "../lib/utils";
import {
  ShieldCheck,
  Building,
  AlertCircle,
  Sparkles,
  Landmark,
  CreditCard,
  CheckCircle2,
  LockKeyhole,
} from "lucide-react";

const inputClass =
  "w-full px-3.5 py-2.5 text-xs bg-slate-950 border border-slate-700 rounded-xl outline-none text-slate-100 placeholder:text-slate-500 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30 transition";

export function BecomeSellerPage() {
  const navigate = useNavigate();
  const { isAuthenticated, setUser } = useAuth();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [payoutMethod, setPayoutMethod] = useState<"bank_account" | "debit_credit_card">("bank_account");

  const [formData, setFormData] = useState({
    businessName: "",
    businessDescription: "",
    businessAddress: "",
    businessCity: "Kathmandu",
    panNumber: "",
    payoutMethod: "bank_account",
    bankAccountName: "",
    bankAccountNumber: "",
    bankName: "Nabil Bank Ltd.",
    cardHolderName: "",
    cardNumber: "",
    cardExpiry: "",
    cardCvv: "",
  });

  const registerMutation = useMutation({
    mutationFn: async () => {
      setErrorMsg(null);
      const payload = {
        businessName: formData.businessName,
        businessDescription: formData.businessDescription,
        businessAddress: formData.businessAddress,
        businessCity: formData.businessCity,
        panNumber: formData.panNumber,
        payoutMethod,
        bankAccountName: payoutMethod === "bank_account" ? formData.bankAccountName : undefined,
        bankAccountNumber: payoutMethod === "bank_account" ? formData.bankAccountNumber : undefined,
        bankName: payoutMethod === "bank_account" ? formData.bankName : undefined,
        cardHolderName: payoutMethod === "debit_credit_card" ? formData.cardHolderName : undefined,
        cardLast4: payoutMethod === "debit_credit_card" ? formData.cardNumber.replace(/\s+/g, "").slice(-4) : undefined,
        cardExpiry: payoutMethod === "debit_credit_card" ? formData.cardExpiry : undefined,
      };
      const { data } = await api.post("/users/become-seller", payload);
      return data.data;
    },
    onSuccess: async () => {
      const { data: me } = await api.get("/users/me");
      setUser(me.data);
      navigate("/seller", { replace: true });
    },
    onError: (err: any) => {
      setErrorMsg(getErrorMessage(err, "Failed to register as a seller"));
    },
  });

  const updateField = (field: string, value: string) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };

  const selectPayoutMethod = (method: "bank_account" | "debit_credit_card") => {
    setPayoutMethod(method);
    setFormData((current) => ({ ...current, payoutMethod: method }));
    setErrorMsg(null);
  };

  const fillDemoCard = () => {
    setPayoutMethod("debit_credit_card");
    setFormData((current) => ({
      ...current,
      payoutMethod: "debit_credit_card",
      cardHolderName: "RentHub Demo",
      cardNumber: "4242 4242 4242 4242",
      cardExpiry: "12/30",
      cardCvv: "123",
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      navigate("/login?redirect=/become-seller");
      return;
    }
    registerMutation.mutate();
  };

  return (
    <div className="min-h-screen bg-[#050816] text-slate-100 px-4 sm:px-6 lg:px-8 py-12">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-400/30 text-indigo-300 text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5" />
            Monetize Your Equipment
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            Become a Verified Lender on RentHub
          </h1>
          <p className="text-sm text-slate-400 leading-relaxed">
            List your cameras, drones, camping gear, and power tools. Choose how you want to receive rental earnings.
          </p>
        </div>

        {errorMsg && (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-400/30 text-xs text-rose-200 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-[#0b1224] rounded-3xl border border-slate-800 p-6 sm:p-8 shadow-2xl shadow-black/20 space-y-8">
          <div className="space-y-5">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                <Building className="w-4 h-4 text-cyan-400" />
                Lender Business Information
              </h3>
              <p className="text-xs text-slate-500 mt-1">Tell renters who they are booking equipment from.</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Business or Display Name *</label>
              <input type="text" placeholder="e.g. Apex Cine & Lens Rentals" value={formData.businessName} onChange={(e) => updateField("businessName", e.target.value)} className={inputClass} required />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Business Address *</label>
              <input type="text" placeholder="e.g. New Road, Ward 22" value={formData.businessAddress} onChange={(e) => updateField("businessAddress", e.target.value)} className={inputClass} required />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">City *</label>
                <input type="text" value={formData.businessCity} onChange={(e) => updateField("businessCity", e.target.value)} className={inputClass} required />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">PAN / VAT Number *</label>
                <input type="text" placeholder="e.g. 109876543" value={formData.panNumber} onChange={(e) => updateField("panNumber", e.target.value)} className={inputClass} required />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Business Description</label>
              <textarea rows={3} placeholder="Briefly describe what kind of gear you offer and your experience..." value={formData.businessDescription} onChange={(e) => updateField("businessDescription", e.target.value)} className={inputClass} />
            </div>
          </div>

          <div className="pt-7 border-t border-slate-800 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  Payout Method
                </h3>
                <p className="text-xs text-slate-500 mt-1">Choose where rental earnings should be paid.</p>
              </div>
              {payoutMethod === "debit_credit_card" && (
                <button type="button" onClick={fillDemoCard} className="text-xs font-bold text-cyan-300 hover:text-cyan-200 border border-cyan-400/30 bg-cyan-400/10 px-3 py-2 rounded-lg transition">
                  Fill Demo Card
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button type="button" onClick={() => selectPayoutMethod("bank_account")} className={`text-left rounded-2xl border p-4 transition ${payoutMethod === "bank_account" ? "border-cyan-400 bg-cyan-400/10 shadow-lg shadow-cyan-500/10" : "border-slate-700 bg-slate-950 hover:border-slate-500"}`}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-cyan-400/10 text-cyan-300 flex items-center justify-center"><Landmark className="w-5 h-5" /></div>
                    <div><p className="text-sm font-bold text-white">Bank Account</p><p className="text-xs text-slate-500">Direct transfer to your bank</p></div>
                  </div>
                  {payoutMethod === "bank_account" && <CheckCircle2 className="w-5 h-5 text-cyan-300" />}
                </div>
              </button>

              <button type="button" onClick={() => selectPayoutMethod("debit_credit_card")} className={`text-left rounded-2xl border p-4 transition ${payoutMethod === "debit_credit_card" ? "border-fuchsia-400 bg-fuchsia-400/10 shadow-lg shadow-fuchsia-500/10" : "border-slate-700 bg-slate-950 hover:border-slate-500"}`}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-fuchsia-400/10 text-fuchsia-300 flex items-center justify-center"><CreditCard className="w-5 h-5" /></div>
                    <div><p className="text-sm font-bold text-white">Debit / Credit Card</p><p className="text-xs text-slate-500">Demo card payout option</p></div>
                  </div>
                  {payoutMethod === "debit_credit_card" && <CheckCircle2 className="w-5 h-5 text-fuchsia-300" />}
                </div>
              </button>
            </div>

            {payoutMethod === "bank_account" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-2xl bg-slate-950/70 border border-slate-800 p-5">
                <div className="space-y-1.5"><label className="text-xs font-semibold text-slate-300">Account Holder Name *</label><input type="text" placeholder="Full name as per bank record" value={formData.bankAccountName} onChange={(e) => updateField("bankAccountName", e.target.value)} className={inputClass} required /></div>
                <div className="space-y-1.5"><label className="text-xs font-semibold text-slate-300">Bank Name *</label><input type="text" placeholder="e.g. Nabil Bank Ltd." value={formData.bankName} onChange={(e) => updateField("bankName", e.target.value)} className={inputClass} required /></div>
                <div className="sm:col-span-2 space-y-1.5"><label className="text-xs font-semibold text-slate-300">Bank Account Number *</label><input type="text" placeholder="e.g. 01234567890123" value={formData.bankAccountNumber} onChange={(e) => updateField("bankAccountNumber", e.target.value)} className={`${inputClass} font-mono`} required /></div>
              </div>
            ) : (
              <div className="rounded-2xl bg-slate-950/70 border border-slate-800 p-5 space-y-4">
                <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-400/10 border border-amber-300/20">
                  <LockKeyhole className="w-4 h-4 text-amber-300 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-amber-100/80">This is a demo payout method for the university project. The server receives only a masked card reference, never the CVV or full card number.</p>
                </div>

                <div className="space-y-1.5"><label className="text-xs font-semibold text-slate-300">Cardholder Name *</label><input type="text" placeholder="Name on card" value={formData.cardHolderName} onChange={(e) => updateField("cardHolderName", e.target.value)} className={inputClass} required /></div>

                <div className="space-y-1.5"><label className="text-xs font-semibold text-slate-300">Debit / Credit Card Number *</label><input type="text" inputMode="numeric" autoComplete="cc-number" maxLength={19} placeholder="4242 4242 4242 4242" value={formData.cardNumber} onChange={(e) => updateField("cardNumber", e.target.value.replace(/[^0-9 ]/g, ""))} className={`${inputClass} font-mono tracking-wider`} required /></div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5"><label className="text-xs font-semibold text-slate-300">Expiry (MM/YY) *</label><input type="text" inputMode="numeric" autoComplete="cc-exp" maxLength={5} placeholder="12/30" value={formData.cardExpiry} onChange={(e) => updateField("cardExpiry", e.target.value.replace(/[^0-9/]/g, "").slice(0, 5))} className={`${inputClass} font-mono`} required /></div>
                  <div className="space-y-1.5"><label className="text-xs font-semibold text-slate-300">CVV *</label><input type="password" inputMode="numeric" autoComplete="cc-csc" maxLength={4} placeholder="123" value={formData.cardCvv} onChange={(e) => updateField("cardCvv", e.target.value.replace(/\D/g, "").slice(0, 4))} className={`${inputClass} font-mono`} required /></div>
                </div>

                <div className="text-xs text-slate-500">Demo card: <span className="font-mono text-slate-300">4242 4242 4242 4242</span> · Expiry <span className="font-mono text-slate-300">12/30</span> · CVV <span className="font-mono text-slate-300">123</span></div>
              </div>
            )}
          </div>

          <button type="submit" disabled={registerMutation.isPending} className="w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 via-fuchsia-600 to-cyan-500 hover:brightness-110 text-white font-bold text-sm shadow-lg shadow-indigo-900/30 transition disabled:opacity-60 disabled:cursor-not-allowed">
            {registerMutation.isPending ? "Setting up Seller Account..." : "Complete Seller Registration"}
          </button>
        </form>
      </div>
    </div>
  );
}
