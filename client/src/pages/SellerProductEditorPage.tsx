import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "../lib/axios";
import { Category } from "../types";
import {
  Package,
  ShieldCheck,
  Zap,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

export function SellerProductEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  const [formData, setFormData] = useState({
    name: "",
    categoryId: "",
    description: "",
    brand: "",
    model: "",
    condition: "like_new",
    city: "Kathmandu",
    dailyRate: "",
    weeklyRate: "",
    monthlyRate: "",
    securityDeposit: "",
    rules: "Valid ID required on pickup\nReturn in original case\nNo modifications",
    instantBook: true,
  });

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data } = await api.get("/categories");
      return data.data as Category[];
    },
  });

  const createProductMutation = useMutation({
    mutationFn: async () => {
      setErrorMsg(null);
      const payload = {
        name: formData.name,
        categoryId: formData.categoryId || categories?.[0]?.id,
        description: formData.description,
        brand: formData.brand,
        model: formData.model,
        condition: formData.condition,
        city: formData.city,
        pricing: {
          dailyRate: formData.dailyRate ? parseFloat(formData.dailyRate) : undefined,
          weeklyRate: formData.weeklyRate ? parseFloat(formData.weeklyRate) : undefined,
          monthlyRate: formData.monthlyRate ? parseFloat(formData.monthlyRate) : undefined,
          securityDeposit: formData.securityDeposit ? parseFloat(formData.securityDeposit) : 0,
        },
        rules: {
          rules: formData.rules.split("\n").filter((r) => r.trim().length > 0),
          instantBook: formData.instantBook,
        },
      };

      const { data } = await api.post("/products", payload);
      return data.data;
    },
    onSuccess: (newProduct) => {
      if (newProduct?.id) {
        navigate(`/products/${newProduct.id}`);
      } else {
        navigate("/seller");
      }
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.error?.message || "Failed to create equipment listing");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.description || !formData.dailyRate) {
      setErrorMsg("Please fill in the equipment name, description, and daily rental rate");
      return;
    }
    createProductMutation.mutate();
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="pb-4 border-b border-slate-200">
        <h1 className="text-2xl font-extrabold text-slate-900">
          {isEditing ? "Edit Equipment Listing" : "List Equipment for Rent"}
        </h1>
        <p className="text-xs text-slate-500">
          Define rental rates, security deposit protection, and equipment conditions
        </p>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* ─── Basic Details ────────────────────────────────────── */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">
            Basic Equipment Information
          </h3>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Product Title *</label>
            <input
              type="text"
              placeholder="e.g. Sony Alpha 7 IV Full-Frame Camera"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Category *</label>
              <select
                value={formData.categoryId}
                onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none"
              >
                {(categories || []).map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Equipment Condition</label>
              <select
                value={formData.condition}
                onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none"
              >
                <option value="new">Brand New</option>
                <option value="like_new">Like New / Mint</option>
                <option value="good">Good (Normal wear)</option>
                <option value="fair">Fair (Visible cosmetic wear)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Brand</label>
              <input
                type="text"
                placeholder="e.g. Sony"
                value={formData.brand}
                onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Model</label>
              <input
                type="text"
                placeholder="e.g. ILCE-7M4"
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">City / Location</label>
              <input
                type="text"
                placeholder="e.g. Kathmandu"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Description *</label>
            <textarea
              rows={4}
              placeholder="Describe gear specs, what accessories are included (batteries, charger, case)..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500"
              required
            />
          </div>
        </div>

        {/* ─── Pricing & Deposit Architecture ──────────────────── */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">
              Rental Pricing & Security Deposit
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Daily Rate (NPR) *</label>
              <input
                type="number"
                placeholder="e.g. 2000"
                value={formData.dailyRate}
                onChange={(e) => setFormData({ ...formData, dailyRate: e.target.value })}
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-slate-900"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Weekly Rate (NPR)</label>
              <input
                type="number"
                placeholder="e.g. 11000"
                value={formData.weeklyRate}
                onChange={(e) => setFormData({ ...formData, weeklyRate: e.target.value })}
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Monthly Rate (NPR)</label>
              <input
                type="number"
                placeholder="e.g. 35000"
                value={formData.monthlyRate}
                onChange={(e) => setFormData({ ...formData, monthlyRate: e.target.value })}
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-emerald-800">
                Security Deposit (NPR) *
              </label>
              <input
                type="number"
                placeholder="e.g. 20000"
                value={formData.securityDeposit}
                onChange={(e) => setFormData({ ...formData, securityDeposit: e.target.value })}
                className="w-full px-3.5 py-2.5 text-xs bg-emerald-50/50 border border-emerald-300 rounded-xl outline-none font-bold text-emerald-900"
                required
              />
            </div>
          </div>
          <p className="text-[11px] text-slate-400">
            Security deposits are held in escrow during the rental and released back to renter upon undamaged return.
          </p>
        </div>

        {/* ─── Rules ────────────────────────────────────────────── */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">
            Rental Rules (One per line)
          </h3>
          <textarea
            rows={3}
            value={formData.rules}
            onChange={(e) => setFormData({ ...formData, rules: e.target.value })}
            className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none font-mono"
          />
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate("/seller")}
            className="px-6 py-3 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={createProductMutation.isPending}
            className="px-8 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-200 transition"
          >
            {createProductMutation.isPending ? "Publishing..." : "Publish Equipment Listing"}
          </button>
        </div>
      </form>
    </div>
  );
}
