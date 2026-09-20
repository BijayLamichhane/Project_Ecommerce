import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/axios";
import { Category, Product } from "../types";
import { getEntityId, getErrorMessage } from "../lib/utils";
import {
  Package,
  ShieldCheck,
  Zap,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  Upload,
  Trash2,
} from "lucide-react";

export function SellerProductEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
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

  // Edit mode: fetch the existing listing so the form can be prefilled.
  // This was previously missing entirely — the "edit" route rendered the
  // same blank form as "create" and always POSTed a brand new product.
  const { data: existingProduct, isLoading: loadingProduct } = useQuery({
    queryKey: ["product", id],
    queryFn: async () => {
      const { data } = await api.get(`/products/${id}`);
      return data.data as Product;
    },
    enabled: isEditing,
  });

  useEffect(() => {
    if (!existingProduct) return;
    setFormData({
      name: existingProduct.name || "",
      categoryId: existingProduct.categoryId || "",
      description: existingProduct.description || "",
      brand: existingProduct.brand || "",
      model: existingProduct.model || "",
      condition: existingProduct.condition || "like_new",
      city: existingProduct.city || "Kathmandu",
      dailyRate: existingProduct.pricing?.dailyRate || "",
      weeklyRate: existingProduct.pricing?.weeklyRate || "",
      monthlyRate: existingProduct.pricing?.monthlyRate || "",
      securityDeposit: existingProduct.pricing?.securityDeposit || "",
      rules: (existingProduct.rules?.rules || []).join("\n"),
      instantBook: existingProduct.rules?.instantBook ?? true,
    });
  }, [existingProduct]);

  // New listing: once categories load, default the picker to the first one
  // rather than silently leaving categoryId unset until the user notices.
  useEffect(() => {
    if (isEditing || formData.categoryId) return;
    if (categories && categories.length > 0) {
      setFormData((prev) => (prev.categoryId ? prev : { ...prev, categoryId: categories[0].id }));
    }
  }, [categories, isEditing]);

  // Equipment photos — the server upload endpoint (POST /products/:id/images)
  // already worked, but nothing in the UI ever called it, so every listing
  // was left with no images and fell back to a placeholder everywhere.
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const uploadImagesMutation = useMutation({
    mutationFn: async (files: File[]) => {
      setUploadError(null);
      const form = new FormData();
      files.forEach((file) => form.append("images", file));
      // Don't set Content-Type manually — axios generates the correct
      // multipart boundary itself when the body is a FormData instance.
      const { data } = await api.post(`/products/${id}/images`, form);
      return data.data;
    },
    onSuccess: () => {
      setSelectedFiles([]);
      queryClient.invalidateQueries({ queryKey: ["product", id] });
    },
    onError: (err: unknown) => {
      setUploadError(getErrorMessage(err, "Failed to upload photos"));
    },
  });

  const deleteImageMutation = useMutation({
    mutationFn: async (imageId: string) => {
      await api.delete(`/products/${id}/images/${imageId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product", id] });
    },
    onError: (err: unknown) => {
      setUploadError(getErrorMessage(err, "Failed to delete photo"));
    },
  });

  const saveProductMutation = useMutation({
    mutationFn: async () => {
      setErrorMsg(null);
      const payload = {
        name: formData.name,
        categoryId: formData.categoryId,
        description: formData.description,
        brand: formData.brand || undefined,
        model: formData.model || undefined,
        condition: formData.condition,
        city: formData.city || undefined,
        pricing: {
          dailyRate: formData.dailyRate ? parseFloat(formData.dailyRate) : undefined,
          weeklyRate: formData.weeklyRate ? parseFloat(formData.weeklyRate) : undefined,
          monthlyRate: formData.monthlyRate ? parseFloat(formData.monthlyRate) : undefined,
          securityDeposit: formData.securityDeposit ? parseFloat(formData.securityDeposit) : 0,
        },
        rules: {
          rules: formData.rules.split("\n").map((r) => r.trim()).filter((r) => r.length > 0),
          instantBook: formData.instantBook,
        },
      };

      const { data } = isEditing
        ? await api.patch(`/products/${id}`, payload)
        : await api.post("/products", payload);
      return data.data;
    },
    onSuccess: (savedProduct) => {
      const productId = getEntityId(savedProduct);
      if (!productId) {
        navigate("/seller");
        return;
      }
      if (isEditing) {
        navigate(`/products/${productId}`);
      } else {
        // New listing: go straight to its edit page so photos can be added
        // right away, instead of a public page with no images yet.
        navigate(`/seller/products/${productId}/edit`, { replace: true });
      }
    },
    onError: (err: unknown) => {
      setErrorMsg(
        getErrorMessage(err, isEditing ? "Failed to update equipment listing" : "Failed to create equipment listing")
      );
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.name.trim().length < 3) {
      setErrorMsg("Equipment name must be at least 3 characters");
      return;
    }
    if (formData.description.trim().length < 20) {
      setErrorMsg("Description must be at least 20 characters so renters know what they're getting");
      return;
    }
    if (!formData.categoryId) {
      setErrorMsg("Please choose a category");
      return;
    }
    if (!formData.dailyRate || parseFloat(formData.dailyRate) <= 0) {
      setErrorMsg("Please enter a daily rental rate greater than 0");
      return;
    }
    saveProductMutation.mutate();
  };

  if (isEditing && loadingProduct) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="h-96 bg-[#E8E1D5] rounded-md animate-pulse" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="pb-4 border-b border-[#C8C0B3]">
        <h1 className="text-2xl font-extrabold text-[#211E1B]">
          {isEditing ? "Edit Equipment Listing" : "List Equipment for Rent"}
        </h1>
        <p className="text-xs text-[#8B8377]">
          Define rental rates, security deposit protection, and equipment conditions
        </p>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-md bg-[#FBE9E5] border border-[#A23B2E]/30 text-xs text-[#A23B2E] flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-[#A23B2E] flex-shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* ─── Basic Details ────────────────────────────────────── */}
        <div className="bg-white rounded-md border border-[#C8C0B3] p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-[#514B44]">
            Basic Equipment Information
          </h3>

          <div className="space-y-1">
            <label className="text-xs font-bold text-[#514B44]">Product Title *</label>
            <input
              type="text"
              placeholder="e.g. Sony Alpha 7 IV Full-Frame Camera"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3.5 py-2.5 text-xs bg-[#F1ECE1] border border-[#C8C0B3] rounded-md outline-none focus:border-[#C17817]"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-[#514B44]">Category *</label>
              <select
                value={formData.categoryId}
                onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                className="w-full px-3.5 py-2.5 text-xs bg-[#F1ECE1] border border-[#C8C0B3] rounded-md outline-none"
                required
              >
                <option value="" disabled>
                  {categories ? "Select a category" : "Loading categories..."}
                </option>
                {(categories || []).map((cat) => (
                  <option key={cat._id} value={cat._id}>
                    {cat.name}
                  </option>
                ))}
              </select>
              {categories && categories.length === 0 && (
                <p className="text-[11px] text-[#C17817] font-medium">
                  No categories exist yet — ask an admin to add one from the Admin Panel before you can publish a listing.
                </p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-[#514B44]">Equipment Condition</label>
              <select
                value={formData.condition}
                onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                className="w-full px-3.5 py-2.5 text-xs bg-[#F1ECE1] border border-[#C8C0B3] rounded-md outline-none"
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
              <label className="text-xs font-bold text-[#514B44]">Brand</label>
              <input
                type="text"
                placeholder="e.g. Sony"
                value={formData.brand}
                onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                className="w-full px-3.5 py-2.5 text-xs bg-[#F1ECE1] border border-[#C8C0B3] rounded-md outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-[#514B44]">Model</label>
              <input
                type="text"
                placeholder="e.g. ILCE-7M4"
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                className="w-full px-3.5 py-2.5 text-xs bg-[#F1ECE1] border border-[#C8C0B3] rounded-md outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-[#514B44]">City / Location</label>
              <input
                type="text"
                placeholder="e.g. Kathmandu"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full px-3.5 py-2.5 text-xs bg-[#F1ECE1] border border-[#C8C0B3] rounded-md outline-none"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-[#514B44]">Description *</label>
            <textarea
              rows={4}
              placeholder="Describe gear specs, what accessories are included (batteries, charger, case)..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3.5 py-2.5 text-xs bg-[#F1ECE1] border border-[#C8C0B3] rounded-md outline-none focus:border-[#C17817]"
              required
            />
          </div>
        </div>

        {/* ─── Pricing & Deposit Architecture ──────────────────── */}
        <div className="bg-white rounded-md border border-[#C8C0B3] p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#4B5D3A]" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#514B44]">
              Rental Pricing & Security Deposit
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-[#514B44]">Daily Rate (NPR) *</label>
              <input
                type="number"
                placeholder="e.g. 2000"
                value={formData.dailyRate}
                onChange={(e) => setFormData({ ...formData, dailyRate: e.target.value })}
                className="w-full px-3.5 py-2.5 text-xs bg-[#F1ECE1] border border-[#C8C0B3] rounded-md outline-none font-bold text-[#211E1B]"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-[#514B44]">Weekly Rate (NPR)</label>
              <input
                type="number"
                placeholder="e.g. 11000"
                value={formData.weeklyRate}
                onChange={(e) => setFormData({ ...formData, weeklyRate: e.target.value })}
                className="w-full px-3.5 py-2.5 text-xs bg-[#F1ECE1] border border-[#C8C0B3] rounded-md outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-[#514B44]">Monthly Rate (NPR)</label>
              <input
                type="number"
                placeholder="e.g. 35000"
                value={formData.monthlyRate}
                onChange={(e) => setFormData({ ...formData, monthlyRate: e.target.value })}
                className="w-full px-3.5 py-2.5 text-xs bg-[#F1ECE1] border border-[#C8C0B3] rounded-md outline-none"
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
                className="w-full px-3.5 py-2.5 text-xs bg-[#E7EFE2]/50 border border-emerald-300 rounded-md outline-none font-bold text-[#4B5D3A]"
                required
              />
            </div>
          </div>
          <p className="text-[11px] text-[#A39A8D]">
            Security deposits are held in escrow during the rental and released back to renter upon undamaged return.
          </p>
        </div>

        {/* ─── Rules ────────────────────────────────────────────── */}
        <div className="bg-white rounded-md border border-[#C8C0B3] p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-[#514B44]">
            Rental Rules (One per line)
          </h3>
          <textarea
            rows={3}
            value={formData.rules}
            onChange={(e) => setFormData({ ...formData, rules: e.target.value })}
            className="w-full px-3.5 py-2.5 text-xs bg-[#F1ECE1] border border-[#C8C0B3] rounded-md outline-none font-mono"
          />
        </div>

        <div className="bg-white rounded-md border border-[#C8C0B3] p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-[#514B44]">
            Equipment Photos
          </h3>

          {!isEditing ? (
            <p className="text-xs text-[#8B8377]">
              Save this listing first — you'll be able to add photos right after.
            </p>
          ) : (
            <>
              {uploadError && (
                <div className="p-3 rounded-md bg-[#FBE9E5] border border-[#A23B2E]/30 text-xs text-[#A23B2E]">
                  {uploadError}
                </div>
              )}

              {existingProduct?.images && existingProduct.images.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {existingProduct.images.map((img) => (
                    <div
                      key={img._id}
                      className="relative group aspect-square rounded-md overflow-hidden border border-[#C8C0B3]"
                    >
                      <img src={img.url} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => deleteImageMutation.mutate(img._id)}
                        disabled={deleteImageMutation.isPending}
                        className="absolute top-1.5 right-1.5 p-1.5 rounded-lg bg-white/90 text-[#A23B2E] opacity-0 group-hover:opacity-100 transition shadow-sm"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                <label className="px-4 py-2.5 rounded-md border border-dashed border-[#B8B0A3] text-xs font-semibold text-[#6F685F] hover:border-indigo-400 hover:text-[#C17817] cursor-pointer flex items-center gap-2">
                  <Upload className="w-3.5 h-3.5" />
                  Choose Photos
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    multiple
                    className="hidden"
                    onChange={(e) => setSelectedFiles(Array.from(e.target.files || []))}
                  />
                </label>
                {selectedFiles.length > 0 && (
                  <>
                    <span className="text-xs text-[#8B8377]">{selectedFiles.length} file(s) selected</span>
                    <button
                      type="button"
                      onClick={() => uploadImagesMutation.mutate(selectedFiles)}
                      disabled={uploadImagesMutation.isPending}
                      className="px-4 py-2.5 rounded-md bg-[#C17817] hover:bg-[#211E1B] text-white text-xs font-bold"
                    >
                      {uploadImagesMutation.isPending ? "Uploading..." : "Upload"}
                    </button>
                  </>
                )}
              </div>
              <p className="text-[11px] text-[#A39A8D]">JPEG, PNG, WebP, or GIF. Up to 10MB each.</p>
            </>
          )}
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate("/seller")}
            className="px-6 py-3 rounded-md border border-[#C8C0B3] text-[#6F685F] text-xs font-semibold hover:bg-[#F1ECE1]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saveProductMutation.isPending}
            className="px-8 py-3 rounded-md bg-[#C17817] hover:bg-[#211E1B] text-white text-xs font-bold shadow-md shadow-none transition"
          >
            {saveProductMutation.isPending
              ? isEditing
                ? "Saving..."
                : "Publishing..."
              : isEditing
              ? "Save Changes"
              : "Publish Equipment Listing"}
          </button>
        </div>
      </form>
    </div>
  );
}
