import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { api } from "../lib/axios";
import { useAuth } from "../hooks/useAuth";
import { getPostLoginRedirect, getErrorMessage } from "../lib/utils";
import { Layers, Lock, Mail, AlertCircle, Sparkles } from "lucide-react";

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user, isLoading: isSessionLoading, setUser } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const redirectTo = getPostLoginRedirect(location.state, searchParams);

  useEffect(() => {
    if (!isSessionLoading && user) {
      navigate(redirectTo, { replace: true });
    }
  }, [isSessionLoading, user, navigate, redirectTo]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);

    try {
      await api.post("/api/auth/sign-in/email", {
        email: email.trim().toLowerCase(),
        password,
      });

      const { data: me } = await api.get("/users/me");
      if (!me.success || !me.data) {
        throw new Error("Unable to load your account profile after sign in");
      }

      setUser(me.data);
      navigate(redirectTo, { replace: true });
    } catch (err: unknown) {
      setErrorMsg(getErrorMessage(err, "Invalid email or password"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoFill = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword("Password123!");
  };

  if (isSessionLoading || user) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#C17817] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-2">
        <Link to="/" className="inline-flex items-center gap-2">
          <div className="w-10 h-10 rounded-md bg-[#C17817] flex items-center justify-center text-white shadow-md shadow-none">
            <Layers className="w-6 h-6" />
          </div>
          <span className="text-2xl font-extrabold tracking-tight text-[#211E1B]">
            Rent<span className="text-[#C17817]">Hub</span>
          </span>
        </Link>
        <h2 className="text-2xl font-extrabold text-[#211E1B]">Sign in to your account</h2>
        <p className="text-xs text-[#8B8377]">
          Or{" "}
          <Link to="/register" className="font-bold text-[#C17817] hover:underline">
            create a new account
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 sm:px-10 rounded-md border border-[#C8C0B3] shadow-sm space-y-6">
          {errorMsg && (
            <div className="p-3.5 rounded-md bg-[#FBE9E5] border border-[#A23B2E]/30 text-xs text-[#A23B2E] flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-[#A23B2E] flex-shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="p-3.5 rounded-md bg-[#F1ECE1]/70 border border-[#C17817]/30 text-xs space-y-2">
            <span className="font-bold text-[#211E1B] flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-[#C17817]" />
              Quick Demo Accounts
            </span>
            <div className="flex flex-wrap gap-1.5">
              <button type="button" onClick={() => handleDemoFill("prashant@example.com")} className="px-2.5 py-1 rounded-lg bg-white text-[#C17817] font-semibold text-[11px] shadow-2xs hover:bg-[#F1ECE1] border border-[#C17817]/30">
                Customer
              </button>
              <button type="button" onClick={() => handleDemoFill("apex.rentals@renthub.app")} className="px-2.5 py-1 rounded-lg bg-white text-[#C17817] font-semibold text-[11px] shadow-2xs hover:bg-[#F1ECE1] border border-[#C17817]/30">
                Seller (Apex Cine)
              </button>
              <button type="button" onClick={() => handleDemoFill("admin@renthub.app")} className="px-2.5 py-1 rounded-lg bg-white text-[#C17817] font-semibold text-[11px] shadow-2xs hover:bg-[#F1ECE1] border border-[#C17817]/30">
                Admin
              </button>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-[#514B44]">Email Address</label>
              <div className="relative">
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="w-full pl-9 pr-3 py-2.5 text-xs bg-[#F1ECE1] border border-[#C8C0B3] rounded-md outline-none focus:border-[#C17817]" required />
                <Mail className="w-4 h-4 text-[#A39A8D] absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-[#514B44]">Password</label>
              <div className="relative">
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="w-full pl-9 pr-3 py-2.5 text-xs bg-[#F1ECE1] border border-[#C8C0B3] rounded-md outline-none focus:border-[#C17817]" required />
                <Lock className="w-4 h-4 text-[#A39A8D] absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <button type="submit" disabled={isLoading} className="w-full py-3 rounded-md bg-[#C17817] hover:bg-[#211E1B] text-white font-bold text-xs shadow-md shadow-none transition">
              {isLoading ? "Signing in..." : "Sign In"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
