import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/axios";
import { formatCurrency, formatDate, getErrorMessage } from "../lib/utils";
import {
  Users,
  Building,
  ShieldAlert,
  AlertTriangle,
  Plus,
  Trash2,
} from "lucide-react";
import { ConfirmModal } from "../components/shared/ConfirmModal";

const getEntityId = (entity: any): string => {
  const rawId = entity?.id ?? entity?._id;
  if (typeof rawId === "string" || typeof rawId === "number") return String(rawId);
  if (rawId && typeof rawId === "object") {
    if (typeof rawId.$oid === "string") return rawId.$oid;
    if (typeof rawId.toString === "function") {
      const value = rawId.toString();
      if (value !== "[object Object]") return value;
    }
  }
  return "";
};

const getActionLabel = (action: unknown): string => {
  const value = typeof action === "string" && action.trim() ? action : "admin action";
  return value.replace(/_/g, " ");
};

export function AdminDashboardPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"overview" | "users" | "sellers" | "products" | "disputes" | "categories">("overview");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryDescription, setNewCategoryDescription] = useState("");
  const [newCategoryIcon, setNewCategoryIcon] = useState("Package");
  const [sellerRejectionModal, setSellerRejectionModal] = useState<{ seller: any } | null>(null);
  const [sellerRejectionReason, setSellerRejectionReason] = useState("");

  const { data: dashboardData } = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: async () => {
      const { data } = await api.get("/admin/dashboard");
      return data.data;
    },
  });

  const { data: usersList } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data } = await api.get("/admin/users");
      return (data.data || []).map((user: any) => ({ ...user, id: getEntityId(user) }));
    },
    enabled: activeTab === "users",
  });

  const { data: sellersList } = useQuery({
    queryKey: ["admin-sellers"],
    queryFn: async () => {
      const { data } = await api.get("/admin/sellers");
      return (data.data || []).map((seller: any) => ({ ...seller, id: getEntityId(seller) }));
    },
    enabled: activeTab === "sellers",
  });

  const { data: disputesList } = useQuery({
    queryKey: ["admin-disputes"],
    queryFn: async () => {
      const { data } = await api.get("/admin/disputes");
      return data.data || [];
    },
    enabled: activeTab === "disputes",
  });

  const { data: categoriesList } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data } = await api.get("/categories");
      return data.data || [];
    },
    enabled: activeTab === "categories",
  });

  const toggleUserSuspendMutation = useMutation({
    mutationFn: async ({ userId, isSuspended }: { userId: string; isSuspended: boolean }) => {
      setErrorMsg(null);
      if (!userId) throw new Error("User ID is missing from the admin user record.");
      const endpoint = isSuspended
        ? `/admin/users/${encodeURIComponent(userId)}/unsuspend`
        : `/admin/users/${encodeURIComponent(userId)}/suspend`;
      await api.post(endpoint);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
    },
    onError: (err: any) => setErrorMsg(getErrorMessage(err, "Failed to update user status")),
  });

  const moderateSellerMutation = useMutation({
    mutationFn: async ({ sellerId, status, reason }: { sellerId: string; status: string; reason?: string }) => {
      setErrorMsg(null);
      if (!sellerId) throw new Error("Seller ID is missing from the admin seller record.");
      await api.post(`/admin/sellers/${encodeURIComponent(sellerId)}/moderate`, {
        status,
        reason,
      });
    },
    onSuccess: () => {
      setSellerRejectionModal(null);
      setSellerRejectionReason("");
      queryClient.invalidateQueries({ queryKey: ["admin-sellers"] });
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
    },
    onError: (err: any) => setErrorMsg(getErrorMessage(err, "Failed to update seller status")),
  });

  const handleSellerModeration = (seller: any, status: "approved" | "rejected") => {
    const sellerId = getEntityId(seller);
    if (!sellerId) {
      setErrorMsg("Seller ID is missing from the admin seller record.");
      return;
    }

    if (status === "rejected") {
      setSellerRejectionReason("");
      setSellerRejectionModal({ seller });
      return;
    }

    moderateSellerMutation.mutate({ sellerId, status: "approved" });
  };

  const rejectSeller = () => {
    const sellerId = sellerRejectionModal ? getEntityId(sellerRejectionModal.seller) : "";
    const reason = sellerRejectionReason.trim();
    if (!sellerId) {
      setSellerRejectionModal(null);
      setErrorMsg("Seller ID is missing from the admin seller record.");
      return;
    }
    if (reason.length < 5) {
      setErrorMsg("Please provide a rejection reason of at least 5 characters.");
      return;
    }
    moderateSellerMutation.mutate({ sellerId, status: "rejected", reason });
  };

  const createCategoryMutation = useMutation({
    mutationFn: async () => {
      setErrorMsg(null);
      const name = newCategoryName.trim();
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
      if (!name || !slug) throw new Error("Category name is required.");
      await api.post("/categories", {
        name,
        slug,
        description: newCategoryDescription.trim() || undefined,
        iconName: newCategoryIcon.trim() || "Package",
      });
    },
    onSuccess: () => {
      setNewCategoryName("");
      setNewCategoryDescription("");
      setNewCategoryIcon("Package");
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
    onError: (err: any) => setErrorMsg(getErrorMessage(err, "Failed to create category")),
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (categoryId: string) => {
      setErrorMsg(null);
      await api.delete(`/categories/${encodeURIComponent(categoryId)}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["categories"] }),
    onError: (err: any) => setErrorMsg(getErrorMessage(err, "Failed to delete category")),
  });

  const updateCategoryIconMutation = useMutation({
    mutationFn: async ({ categoryId, iconName }: { categoryId: string; iconName: string }) => {
      setErrorMsg(null);
      await api.patch(`/categories/${encodeURIComponent(categoryId)}`, { iconName: iconName.trim() || "Package" });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["categories"] }),
    onError: (err: any) => setErrorMsg(getErrorMessage(err, "Failed to update category icon")),
  });

  const metrics = dashboardData?.metrics;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-amber-600">Platform Administration</div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-0.5">Admin Governance Panel</h1>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 border-b border-slate-200">
        {[
          { id: "overview", label: "Overview & Analytics" },
          { id: "users", label: "Users Management" },
          { id: "sellers", label: "Seller Moderation" },
          { id: "categories", label: "Categories" },
          { id: "disputes", label: "Reports & Disputes" },
        ].map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`px-4 py-2 text-xs font-bold rounded-xl transition ${activeTab === tab.id ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "overview" && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { label: "Platform Revenue", value: formatCurrency(metrics?.totalRevenue ?? 0), hint: "Gross rental GMV" },
              { label: "Total Users", value: metrics?.totalUsers ?? 0, hint: "Registered members" },
              { label: "Active Listings", value: metrics?.totalProducts ?? 0, hint: "Rentable gear" },
              { label: "Active Rentals", value: metrics?.activeRentals ?? 0, hint: "Currently in use" },
            ].map((metric) => (
              <div key={metric.label} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400">{metric.label}</div>
                <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">{metric.value}</div>
                <p className="text-[11px] text-slate-500 font-medium mt-1">{metric.hint}</p>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900">Recent Platform Activity</h3>
            {dashboardData?.recentActivity?.length ? (
              <div className="divide-y divide-slate-100 text-xs">
                {dashboardData.recentActivity.map((act: any, index: number) => {
                  const action = act?.action ?? act?.actionType;
                  const key = getEntityId(act) || `activity-${index}`;
                  return (
                    <div key={key} className="py-2.5 flex items-center justify-between">
                      <div>
                        <span className="font-bold text-slate-900 capitalize">{getActionLabel(action)}</span>
                        <span className="text-slate-500 ml-2">by {act?.admin?.name || act?.userId?.name || "Admin"}</span>
                      </div>
                      <span className="text-[10px] text-slate-400">{act?.createdAt ? formatDate(act.createdAt, "MMM d, h:mm a") : "—"}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-xs text-slate-400 py-4">No recent administrative actions</div>
            )}
          </div>
        </div>
      )}

      {activeTab === "users" && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-slate-900">Platform Users</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-100 text-slate-400 font-bold uppercase"><tr><th className="pb-3">Name</th><th className="pb-3">Email</th><th className="pb-3">Role</th><th className="pb-3">Status</th><th className="pb-3 text-right">Actions</th></tr></thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {(usersList || []).map((u: any, index: number) => {
                  const userId = getEntityId(u);
                  const rowKey = userId || `${u.email || "user"}-${index}`;
                  return <tr key={rowKey}><td className="py-3 font-semibold text-slate-900">{u.name}</td><td className="py-3">{u.email}</td><td className="py-3 capitalize font-medium">{u.role}</td><td className="py-3"><span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${u.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>{u.status}</span></td><td className="py-3 text-right">{u.role !== "admin" && <button onClick={() => toggleUserSuspendMutation.mutate({ userId, isSuspended: u.status === "suspended" })} disabled={!userId || toggleUserSuspendMutation.isPending} className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition disabled:opacity-50 ${u.status === "suspended" ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100" : "bg-rose-50 text-rose-700 hover:bg-rose-100"}`}>{u.status === "suspended" ? "Unsuspend" : "Suspend"}</button>}</td></tr>;
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "sellers" && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
            <div>
              <h3 className="text-base font-bold text-slate-900">Seller Applications & Moderation</h3>
              <p className="text-[11px] text-slate-500 mt-1">Customer seller applications require admin approval. Sellers can disband their seller role directly; disbandment is not reviewed here.</p>
            </div>
            <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-100 text-slate-400 font-bold uppercase">
                <tr><th className="pb-3">Business Name</th><th className="pb-3">City</th><th className="pb-3">PAN</th><th className="pb-3">Status</th><th className="pb-3 text-right">Actions</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {(sellersList || []).map((s: any, index: number) => {
                  const sellerId = getEntityId(s);
                  const rowKey = sellerId || `${s.email || "seller"}-${index}`;
                  const isPendingApplication = s.role === "customer" && s.sellerProfile?.status === "pending";
                  const displayStatus = isPendingApplication ? "Application Pending" : s.sellerProfile?.status || s.status;
                  return (
                    <tr key={rowKey}>
                      <td className="py-3 font-semibold text-slate-900">{s.sellerProfile?.businessName || "—"}</td>
                      <td className="py-3">{s.sellerProfile?.businessCity || "—"}</td>
                      <td className="py-3 font-mono">{s.sellerProfile?.panNumber || "—"}</td>
                      <td className="py-3"><span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${isPendingApplication ? "bg-amber-50 text-amber-800" : "bg-slate-100 text-slate-800"}`}>{displayStatus}</span></td>
                      <td className="py-3 text-right space-x-2">
                        <button onClick={() => handleSellerModeration(s, "approved")} disabled={!sellerId || moderateSellerMutation.isPending} className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold text-[11px] disabled:opacity-50">Approve</button>
                        <button onClick={() => handleSellerModeration(s, "rejected")} disabled={!sellerId || moderateSellerMutation.isPending} className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 font-bold text-[11px] disabled:opacity-50">Reject</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {!sellersList?.length && <div className="text-xs text-slate-400 py-4 text-center">No pending seller applications or active sellers.</div>}
        </div>
      )}

      {activeTab === "categories" && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2"><Plus className="w-4 h-4 text-emerald-600" /><h3 className="text-base font-bold text-slate-900">Create Category</h3></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} placeholder="Category name" className="px-3 py-2.5 rounded-xl border border-slate-200 text-sm" />
              <input value={newCategoryDescription} onChange={(e) => setNewCategoryDescription(e.target.value)} placeholder="Description" className="px-3 py-2.5 rounded-xl border border-slate-200 text-sm" />
              <input value={newCategoryIcon} onChange={(e) => setNewCategoryIcon(e.target.value)} placeholder="Lucide icon name" className="px-3 py-2.5 rounded-xl border border-slate-200 text-sm" />
            </div>
            <button onClick={() => createCategoryMutation.mutate()} disabled={createCategoryMutation.isPending || !newCategoryName.trim()} className="px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold disabled:opacity-50">Create Category</button>
          </div>
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900">Categories</h3>
            <div className="space-y-2">
              {(categoriesList || []).map((category: any, index: number) => {
                const categoryId = getEntityId(category);
                return <div key={categoryId || `${category.slug || category.name || "category"}-${index}`} className="flex flex-wrap items-center justify-between gap-3 border border-slate-100 rounded-2xl p-3"><div><p className="text-sm font-bold text-slate-900">{category.name}</p><p className="text-[11px] text-slate-500">{category.slug}</p></div><div className="flex items-center gap-2"><input value={category.iconName || "Package"} onChange={(e) => { const iconName = e.target.value; if (categoryId) updateCategoryIconMutation.mutate({ categoryId, iconName }); }} className="w-28 px-2 py-1.5 rounded-lg border border-slate-200 text-xs" /><button onClick={() => categoryId && deleteCategoryMutation.mutate(categoryId)} disabled={!categoryId || deleteCategoryMutation.isPending} className="p-2 rounded-lg bg-rose-50 text-rose-600 disabled:opacity-50"><Trash2 className="w-4 h-4" /></button></div></div>;
              })}
            </div>
          </div>
        </div>
      )}

      {activeTab === "products" && <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm"><p className="text-sm text-slate-500">Product administration is available from seller listing workflows.</p></div>}
      {activeTab === "disputes" && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-slate-900">Reports & Disputes</h3>
          {(disputesList || []).length === 0 ? <p className="text-sm text-slate-500">No disputes found.</p> : <div className="space-y-3">{(disputesList || []).map((dispute: any, index: number) => <div key={getEntityId(dispute) || `dispute-${index}`} className="rounded-2xl border border-slate-100 p-4"><p className="text-sm font-bold text-slate-900">Booking {getEntityId(dispute)}</p><p className="text-xs text-slate-500 mt-1">{dispute.customer?.name || "Customer"} · {dispute.status}</p></div>)}</div>}
        </div>
      )}

      <ConfirmModal
        open={Boolean(sellerRejectionModal)}
        title="Reject Seller Application"
        message={`Provide a reason for rejecting "${sellerRejectionModal?.seller?.sellerProfile?.businessName || sellerRejectionModal?.seller?.name || "this seller"}". The reason will be saved and shown to the customer.`}
        confirmLabel="Reject Application"
        cancelLabel="Keep Reviewing"
        onConfirm={rejectSeller}
        onCancel={() => {
          if (!moderateSellerMutation.isPending) {
            setSellerRejectionModal(null);
            setSellerRejectionReason("");
          }
        }}
        loading={moderateSellerMutation.isPending}
        danger
      >
        <div className="space-y-2 pb-1">
          <label htmlFor="seller-rejection-reason" className="text-xs font-bold text-slate-300">Rejection reason *</label>
          <textarea
            id="seller-rejection-reason"
            value={sellerRejectionReason}
            onChange={(event) => setSellerRejectionReason(event.target.value)}
            placeholder="Explain why the seller application is being rejected..."
            rows={4}
            maxLength={1000}
            disabled={moderateSellerMutation.isPending}
            className="w-full px-3 py-2.5 rounded-xl border border-slate-700 bg-slate-950 text-sm text-slate-100 placeholder:text-slate-500 outline-none focus:border-rose-400 focus:ring-1 focus:ring-rose-400/20 disabled:opacity-50"
          />
          <div className="flex items-center justify-between text-[10px] text-slate-500">
            <span>Minimum 5 characters.</span>
            <span>{sellerRejectionReason.length}/1000</span>
          </div>
        </div>
      </ConfirmModal>
    </div>
  );
}
