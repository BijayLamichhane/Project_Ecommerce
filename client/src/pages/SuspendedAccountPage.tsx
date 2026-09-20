import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/axios";
import { AlertTriangle, LogOut, ShieldAlert } from "lucide-react";

export function SuspendedAccountPage() {
  const navigate = useNavigate();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await api.post("/api/auth/sign-out");
    } catch {
      // The local session is cleared by the redirect regardless.
    } finally {
      window.location.href = "/";
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-lg rounded-md border border-[#A23B2E]/30 bg-[#211E1B] p-8 sm:p-10 shadow-none shadow-black/30 text-center">
        <div className="mx-auto w-16 h-16 rounded-md bg-[#FBE9E5]0/10 border border-[#A23B2E]/30 flex items-center justify-center text-[#A23B2E]">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div className="mt-6 space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#A23B2E]/30 bg-[#FBE9E5]0/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[#F3D8D2]">
            <AlertTriangle className="w-3.5 h-3.5" />
            Account Suspended
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#FFF8ED]">Your account is currently suspended</h1>
          <p className="text-sm leading-relaxed text-[#A39A8D]">
            You cannot purchase, book rentals, become a seller, manage listings, send messages, or perform other authenticated account actions while your account is suspended.
          </p>
          <p className="text-xs leading-relaxed text-[#8B8377]">
            Contact the platform administrator if you believe this suspension was made in error.
          </p>
        </div>

        <div className="mt-8 flex flex-col sm:flex-row justify-center gap-3">
          <button
            type="button"
            onClick={handleSignOut}
            disabled={isSigningOut}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-[#A23B2E] px-5 py-3 text-sm font-bold text-[#FFF8ED] transition hover:bg-[#FBE9E5]0 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <LogOut className="w-4 h-4" />
            {isSigningOut ? "Signing Out..." : "Sign Out"}
          </button>
          <button
            type="button"
            onClick={() => navigate("/")}
            className="rounded-md border border-[#6B6359] px-5 py-3 text-sm font-semibold text-[#B8B0A3] transition hover:bg-[#2F2B27] hover:text-[#FFF8ED]"
          >
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}
