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
  Clock3,
} from "lucide-react";

const inputClass =
  "w-full px-3.5 py-2.5 text-xs bg-[#F7F3EA] border border-[#B8B0A3] rounded-md outline-none text-[#211E1B] placeholder:text-[#8B8377] focus:border-[#C17817] focus:ring-1 focus:ring-[#C17817]/20 transition";

export function BecomeSellerPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated, setUser } = useAuth();
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

  const sellerApplicationStatus = user?.sellerProfile?.status;
  const isApplicationPending = user?.role === "customer" && sellerApplicationStatus === "pending";
  const isApplicationRejected = user?.role === "customer" && sellerApplicationStatus === "rejected";

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
      navigate("/dashboard", { replace: true });
    },
    onError: (err: any) => {
      setErrorMsg(getErrorMessage(err, "Failed to submit seller application"));
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

  if (isApplicationPending) {
    return (
      <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] px-4 sm:px-6 lg:px-8 py-16">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white border border-[#DDD5C7] rounded-md p-8 sm:p-10 shadow-sm text-center space-y-5">
            <div className="mx-auto w-14 h-14 rounded-md bg-[#F1E0C8] text-[#C17817] flex items-center justify-center">
              <Clock3 className="w-7 h-7" />
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-[#C17817]">Seller Application</div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#211E1B] mt-1">Waiting for Admin Approval</h1>
              <p className="text-sm text-[#8B8377] leading-relaxed mt-3">
                Your seller application has been submitted. You remain a customer until an administrator approves the application.
              </p>
            </div>
            <div className="rounded-md border border-[#DDD5C7] bg-[#F7F3EA] p-4 text-left text-xs text-[#514B44] space-y-1">
              <p><span className="text-[#8B8377]">Business:</span> {user?.sellerProfile?.businessName || "—"}</p>
              <p><span className="text-[#8B8377]">City:</span> {user?.sellerProfile?.businessCity || "—"}</p>
              <p><span className="text-[#8B8377]">Status:</span> <span className="text-[#C17817] font-bold">Pending review</span></p>
            </div>
            <button
              type="button"
              onClick={() => navigate("/dashboard")}
              className="px-5 py-2.5 rounded-md bg-[#C17817] hover:bg-[#A66314] text-[#211E1B] text-xs font-bold transition"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] px-4 sm:px-6 lg:px-8 py-12">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F1E0C8] border border-[#C17817]/35 text-[#A66314] text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5" />
            Monetize Your Equipment
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#211E1B]">
            Become a Verified Lender on RentHub
          </h1>
          <p className="text-sm text-[#8B8377] leading-relaxed">
            List your cameras, drones, camping gear, and power tools. Your seller application will be reviewed by an administrator before the seller role is enabled.
          </p>
        </div>

        {isApplicationRejected && user?.sellerProfile?.rejectionReason && (
          <div className="p-4 rounded-md bg-[#FBE9E5] border border-[#A23B2E]/30 text-xs text-[#8F3328] flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-[#A23B2E] flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Your previous seller application was rejected.</p>
              <p className="mt-1 text-[#8F3328]">Reason: {user.sellerProfile.rejectionReason}</p>
            </div>
          </div>
        )}

        {errorMsg && (
          <div className="p-4 rounded-md bg-[#FBE9E5] border border-[#A23B2E]/30 text-xs text-[#8F3328] flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-[#A23B2E] flex-shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-md border border-[#DDD5C7] p-6 sm:p-8 shadow-sm space-y-8">
          <div className="space-y-5">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-[#211E1B] flex items-center gap-2">
                <Building className="w-4 h-4 text-[#C17817]" />
                Lender Business Information
              </h3>
              <p className="text-xs text-[#8B8377] mt-1">Tell renters who they are booking equipment from.</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#514B44]">Business or Display Name *</label>
              <input type="text" placeholder="e.g. Apex Cine & Lens Rentals" value={formData.businessName} onChange={(e) => updateField("businessName", e.target.value)} className={inputClass} required />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#514B44]">Business Address *</label>
              <input type="text" placeholder="e.g. New Road, Ward 22" value={formData.businessAddress} onChange={(e) => updateField("businessAddress", e.target.value)} className={inputClass} required />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#514B44]">City *</label>
                <input type="text" value={formData.businessCity} onChange={(e) => updateField("businessCity", e.target.value)} className={inputClass} required />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#514B44]">PAN / VAT Number *</label>
                <input type="text" placeholder="e.g. 109876543" value={formData.panNumber} onChange={(e) => updateField("panNumber", e.target.value)} className={inputClass} required />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#514B44]">Business Description</label>
              <textarea rows={3} placeholder="Briefly describe what kind of gear you offer and your experience..." value={formData.businessDescription} onChange={(e) => updateField("businessDescription", e.target.value)} className={inputClass} />
            </div>
          </div>

          <div className="pt-7 border-t border-[#DDD5C7] space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-[#211E1B] flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#4B5D3A]" />
                  Payout Method
                </h3>
                <p className="text-xs text-[#8B8377] mt-1">Choose where rental earnings should be paid.</p>
              </div>
              {payoutMethod === "debit_credit_card" && (
                <button type="button" onClick={fillDemoCard} className="text-xs font-bold text-[#A66314] hover:text-[#8F5510] border border-[#C17817]/35 bg-[#F1E0C8] px-3 py-2 rounded-md transition">
                  Fill Demo Card
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button type="button" onClick={() => selectPayoutMethod("bank_account")} className={`text-left rounded-md border p-4 transition ${payoutMethod === "bank_account" ? "border-[#C17817] bg-[#F1E0C8] shadow-sm" : "border-[#B8B0A3] bg-[#F7F3EA] hover:border-[#8B8377]"}`}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-md bg-[#F1E0C8] text-[#C17817] flex items-center justify-center"><Landmark className="w-5 h-5" /></div>
                    <div><p className="text-sm font-bold text-[#211E1B]">Bank Account</p><p className="text-xs text-[#8B8377]">Direct transfer to your bank</p></div>
                  </div>
                  {payoutMethod === "bank_account" && <CheckCircle2 className="w-5 h-5 text-[#C17817]" />}
                </div>
              </button>

              <button type="button" onClick={() => selectPayoutMethod("debit_credit_card")} className={`text-left rounded-md border p-4 transition ${payoutMethod === "debit_credit_card" ? "border-[#A23B2E] bg-[#FBE9E5] shadow-sm" : "border-[#B8B0A3] bg-[#F7F3EA] hover:border-[#8B8377]"}`}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-md bg-[#E8E1D5] text-[#A23B2E] flex items-center justify-center"><CreditCard className="w-5 h-5" /></div>
                    <div><p className="text-sm font-bold text-[#211E1B]">Debit / Credit Card</p><p className="text-xs text-[#8B8377]">Demo card payout option</p></div>
                  </div>
                  {payoutMethod === "debit_credit_card" && <CheckCircle2 className="w-5 h-5 text-[#A23B2E]" />}
                </div>
              </button>
            </div>

            {payoutMethod === "bank_account" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-md bg-[#F7F3EA] border border-[#DDD5C7] p-5">
                <div className="space-y-1.5"><label className="text-xs font-semibold text-[#514B44]">Account Holder Name *</label><input type="text" placeholder="Full name as per bank record" value={formData.bankAccountName} onChange={(e) => updateField("bankAccountName", e.target.value)} className={inputClass} required /></div>
                <div className="space-y-1.5"><label className="text-xs font-semibold text-[#514B44]">Bank Name *</label><input type="text" placeholder="e.g. Nabil Bank Ltd." value={formData.bankName} onChange={(e) => updateField("bankName", e.target.value)} className={inputClass} required /></div>
                <div className="sm:col-span-2 space-y-1.5"><label className="text-xs font-semibold text-[#514B44]">Bank Account Number *</label><input type="text" placeholder="e.g. 01234567890123" value={formData.bankAccountNumber} onChange={(e) => updateField("bankAccountNumber", e.target.value)} className={`${inputClass} font-mono`} required /></div>
              </div>
            ) : (
              <div className="rounded-md bg-[#F7F3EA] border border-[#DDD5C7] p-5 space-y-4">
                <div className="flex items-start gap-3 p-3 rounded-md bg-[#F7F0DD] border border-[#C17817]/25">
                  <LockKeyhole className="w-4 h-4 text-[#C17817] mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-[#514B44]">This is a demo payout method for the university project. The server receives only a masked card reference, never the CVV or full card number.</p>
                </div>

                <div className="space-y-1.5"><label className="text-xs font-semibold text-[#514B44]">Cardholder Name *</label><input type="text" placeholder="Name on card" value={formData.cardHolderName} onChange={(e) => updateField("cardHolderName", e.target.value)} className={inputClass} required /></div>

                <div className="space-y-1.5"><label className="text-xs font-semibold text-[#514B44]">Debit / Credit Card Number *</label><input type="text" inputMode="numeric" autoComplete="cc-number" maxLength={19} placeholder="4242 4242 4242 4242" value={formData.cardNumber} onChange={(e) => updateField("cardNumber", e.target.value.replace(/[^0-9 ]/g, ""))} className={`${inputClass} font-mono tracking-wider`} required /></div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5"><label className="text-xs font-semibold text-[#514B44]">Expiry (MM/YY) *</label><input type="text" inputMode="numeric" autoComplete="cc-exp" maxLength={5} placeholder="12/30" value={formData.cardExpiry} onChange={(e) => updateField("cardExpiry", e.target.value.replace(/[^0-9/]/g, "").slice(0, 5))} className={`${inputClass} font-mono`} required /></div>
                  <div className="space-y-1.5"><label className="text-xs font-semibold text-[#514B44]">CVV *</label><input type="password" inputMode="numeric" autoComplete="cc-csc" maxLength={4} placeholder="123" value={formData.cardCvv} onChange={(e) => updateField("cardCvv", e.target.value.replace(/\D/g, "").slice(0, 4))} className={`${inputClass} font-mono`} required /></div>
                </div>

                <div className="text-xs text-[#8B8377]">Demo card: <span className="font-mono text-[#514B44]">4242 4242 4242 4242</span> · Expiry <span className="font-mono text-[#514B44]">12/30</span> · CVV <span className="font-mono text-[#514B44]">123</span></div>
              </div>
            )}
          </div>

          <button type="submit" disabled={registerMutation.isPending} className="w-full py-3.5 rounded-md bg-[#C17817] hover:bg-[#A66314] text-[#211E1B] font-bold text-sm shadow-sm transition disabled:opacity-60 disabled:cursor-not-allowed">
            {registerMutation.isPending ? "Submitting Application..." : "Submit Seller Application"}
          </button>
        </form>
      </div>
    </div>
  );
}
