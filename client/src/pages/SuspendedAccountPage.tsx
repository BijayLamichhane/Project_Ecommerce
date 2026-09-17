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
      <div className="w-full max-w-lg rounded-3xl border border-rose-500/20 bg-[#0b1224] p-8 sm:p-10 shadow-2xl shadow-black/30 text-center">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-400/20 flex items-center justify-center text-rose-400">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div className="mt-6 space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-rose-400/20 bg-rose-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-rose-300">
            <AlertTriangle className="w-3.5 h-3.5" />
            Account Suspended
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Your account is currently suspended</h1>
          <p className="text-sm leading-relaxed text-slate-400">
            You cannot purchase, book rentals, become a seller, manage listings, send messages, or perform other authenticated account actions while your account is suspended.
          </p>
          <p className="text-xs leading-relaxed text-slate-500">
            Contact the platform administrator if you believe this suspension was made in error.
          </p>
        </div>

        <div className="mt-8 flex flex-col sm:flex-row justify-center gap-3">
          <button
            type="button"
            onClick={handleSignOut}
            disabled={isSigningOut}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <LogOut className="w-4 h-4" />
            {isSigningOut ? "Signing Out..." : "Sign Out"}
          </button>
          <button
            type="button"
            onClick={() => navigate("/")}
            className="rounded-xl border border-slate-700 px-5 py-3 text-sm font-semibold text-slate-300 transition hover:bg-slate-800 hover:text-white"
          >
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}
