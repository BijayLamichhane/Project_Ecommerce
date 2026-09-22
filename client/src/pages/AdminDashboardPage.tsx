import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/axios";
import { formatCurrency, formatDate, getEntityId, getErrorMessage } from "../lib/utils";
import type { Booking, Category, Report, User } from "../types";
import { AdminProductManagement } from "../components/admin/AdminProductManagement";
import {
  ShieldAlert,
  AlertTriangle,
  Plus,
  Trash2,
  Flag,
  CheckCircle2,
  Search,
  Gavel,
  XCircle,
} from "lucide-react";
import { ConfirmModal } from "../components/shared/ConfirmModal";
import { CATEGORY_ICON_NAMES, getCategoryIcon } from "../lib/categoryIcons";

type ActiveTab = "overview" | "users" | "sellers" | "products" | "disputes" | "categories";

type AdminActivity = {
  id?: string;
  _id?: string;
  action?: string;
  actionType?: string;
  createdAt?: string;
  admin?: { name?: string };
  userId?: string | { name?: string } | null;
};

type AdminDashboardData = {
  metrics: {
    totalRevenue: number;
    totalUsers: number;
    totalProducts: number;
    featuredProducts: number;
    activeRentals: number;
    pendingDisputes?: number;
  };
  recentActivity: AdminActivity[];
};

type ModerationModal =
  | {
      kind: "report";
      item: Report;
      status: "reviewed" | "resolved" | "dismissed";
    }
  | {
      kind: "dispute";
      item: Booking;
      action: "resolve" | "dismiss";
    }
  | null;

const adminTabs: { id: ActiveTab; label: string }[] = [
  { id: "overview", label: "Overview & Analytics" },
  { id: "users", label: "Users Management" },
  { id: "sellers", label: "Seller Moderation" },
  { id: "products", label: "Products" },
  { id: "categories", label: "Categories" },
  { id: "disputes", label: "Reports & Disputes" },
];

const getActionLabel = (action: unknown): string => {
  const value = typeof action === "string" && action.trim() ? action : "admin action";
  return value.replace(/_/g, " ");
};

export function AdminDashboardPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<ActiveTab>("overview");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryDescription, setNewCategoryDescription] = useState("");
  const [newCategoryIcon, setNewCategoryIcon] = useState("Package");
  const [sellerRejectionModal, setSellerRejectionModal] = useState<{ seller: User } | null>(null);
  const [sellerRejectionReason, setSellerRejectionReason] = useState("");
  const [moderationMode, setModerationMode] = useState<"reports" | "disputes">("reports");
  const [reportStatusFilter, setReportStatusFilter] = useState<"all" | Report["status"]>("all");
  const [reportSearch, setReportSearch] = useState("");
  const [disputeSearch, setDisputeSearch] = useState("");
  const [moderationModal, setModerationModal] = useState<ModerationModal>(null);
  const [moderationNotes, setModerationNotes] = useState("");

  const { data: dashboardData } = useQuery<AdminDashboardData>({
    queryKey: ["admin-dashboard"],
    queryFn: async () => {
      const { data } = await api.get("/admin/dashboard");
      return data.data;
    },
  });

  const { data: usersList } = useQuery<User[]>({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data } = await api.get("/admin/users");
      return (data.data as User[] || []).map((user: User) => ({ ...user, id: getEntityId(user) }));
    },
    enabled: activeTab === "users",
  });

  const { data: sellersList } = useQuery<User[]>({
    queryKey: ["admin-sellers"],
    queryFn: async () => {
      const { data } = await api.get("/admin/sellers");
      return (data.data as User[] || []).map((seller: User) => ({ ...seller, id: getEntityId(seller) }));
    },
    enabled: activeTab === "sellers",
  });

  const { data: reportsList } = useQuery<Report[]>({
    queryKey: ["admin-reports"],
    queryFn: async () => {
      const { data } = await api.get("/admin/reports");
      return data.data || [];
    },
    enabled: activeTab === "disputes",
  });

  const { data: disputesList } = useQuery<Booking[]>({
    queryKey: ["admin-disputes"],
    queryFn: async () => {
      const { data } = await api.get("/admin/disputes");
      return data.data || [];
    },
    enabled: activeTab === "disputes",
  });

  const { data: categoriesList } = useQuery<Category[]>({
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
    onError: (err: unknown) => setErrorMsg(getErrorMessage(err, "Failed to update user status")),
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
    onError: (err: unknown) => setErrorMsg(getErrorMessage(err, "Failed to update seller status")),
  });

  const handleSellerModeration = (seller: User, status: "approved" | "rejected") => {
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

  const updateReportStatusMutation = useMutation({
    mutationFn: async ({
      reportId,
      status,
      notes,
    }: {
      reportId: string;
      status: "reviewed" | "resolved" | "dismissed";
      notes: string;
    }) => {
      setErrorMsg(null);
      await api.patch(`/admin/reports/${encodeURIComponent(reportId)}/status`, {
        status,
        notes,
      });
    },
    onSuccess: () => {
      setModerationModal(null);
      setModerationNotes("");
      queryClient.invalidateQueries({ queryKey: ["admin-reports"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
    },
    onError: (err: unknown) =>
      setErrorMsg(getErrorMessage(err, "Failed to update the report.")),
  });

  const resolveDisputeMutation = useMutation({
    mutationFn: async ({
      bookingId,
      action,
      notes,
    }: {
      bookingId: string;
      action: "resolve" | "dismiss";
      notes: string;
    }) => {
      setErrorMsg(null);
      await api.patch(`/admin/disputes/${encodeURIComponent(bookingId)}`, {
        action,
        notes,
      });
    },
    onSuccess: () => {
      setModerationModal(null);
      setModerationNotes("");
      queryClient.invalidateQueries({ queryKey: ["admin-disputes"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
    },
    onError: (err: unknown) =>
      setErrorMsg(getErrorMessage(err, "Failed to resolve the dispute.")),
  });

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
    onError: (err: unknown) => setErrorMsg(getErrorMessage(err, "Failed to create category")),
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (categoryId: string) => {
      setErrorMsg(null);
      await api.delete(`/categories/${encodeURIComponent(categoryId)}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["categories"] }),
    onError: (err: unknown) => setErrorMsg(getErrorMessage(err, "Failed to delete category")),
  });

  const updateCategoryIconMutation = useMutation({
    mutationFn: async ({ categoryId, iconName }: { categoryId: string; iconName: string }) => {
      setErrorMsg(null);
      await api.patch(`/categories/${encodeURIComponent(categoryId)}`, { iconName: iconName.trim() || "Package" });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["categories"] }),
    onError: (err: unknown) => setErrorMsg(getErrorMessage(err, "Failed to update category icon")),
  });

  const metrics = dashboardData?.metrics;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {errorMsg && (
        <div className="p-4 rounded-md bg-[#FBE9E5] border border-[#A23B2E]/30 text-xs text-[#A23B2E] flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-[#A23B2E] flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="flex items-center justify-between pb-4 border-b border-[#C8C0B3]">
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-[#C17817]">Platform Administration</div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#211E1B] mt-0.5">Admin Governance Panel</h1>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 border-b border-[#C8C0B3]">
        {adminTabs.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-4 py-2 text-xs font-bold rounded-md transition ${activeTab === tab.id ? "bg-[#211E1B] text-white shadow-sm" : "text-[#6F685F] hover:bg-[#E8E1D5]"}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "overview" && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
            {[
              { label: "Platform Revenue", value: formatCurrency(metrics?.totalRevenue ?? 0), hint: "Gross rental GMV" },
              { label: "Total Users", value: metrics?.totalUsers ?? 0, hint: "Registered members" },
              { label: "Active Listings", value: metrics?.totalProducts ?? 0, hint: "Rentable gear" },
              { label: "Featured Listings", value: metrics?.featuredProducts ?? 0, hint: "Admin-promoted gear" },
              { label: "Active Rentals", value: metrics?.activeRentals ?? 0, hint: "Currently in use" },
            ].map((metric) => (
              <div key={metric.label} className="bg-white rounded-md border border-[#C8C0B3] p-6 shadow-sm">
                <div className="text-xs font-bold uppercase tracking-wider text-[#A39A8D]">{metric.label}</div>
                <div className="text-2xl sm:text-3xl font-extrabold text-[#211E1B] mt-1">{metric.value}</div>
                <p className="text-[11px] text-[#8B8377] font-medium mt-1">{metric.hint}</p>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-md border border-[#C8C0B3] p-6 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-[#211E1B]">Recent Platform Activity</h3>
            {dashboardData?.recentActivity?.length ? (
              <div className="divide-y divide-[#E6DED1] text-xs">
                {dashboardData.recentActivity.map((act, index) => {
                  const action = act?.action ?? act?.actionType;
                  const actorName =
                    act?.userId && typeof act.userId === "object" ? act.userId.name : undefined;
                  const key = getEntityId(act) || `activity-${index}`;
                  return (
                    <div key={key} className="py-2.5 flex items-center justify-between">
                      <div>
                        <span className="font-bold text-[#211E1B] capitalize">{getActionLabel(action)}</span>
                        <span className="text-[#8B8377] ml-2">by {act?.admin?.name || actorName || "Admin"}</span>
                      </div>
                      <span className="text-[10px] text-[#A39A8D]">{act?.createdAt ? formatDate(act.createdAt, "MMM d, h:mm a") : "—"}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-xs text-[#A39A8D] py-4">No recent administrative actions</div>
            )}
          </div>
        </div>
      )}

      {activeTab === "users" && (
        <div className="bg-white rounded-md border border-[#C8C0B3] p-6 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-[#211E1B]">Platform Users</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[#E6DED1] text-[#A39A8D] font-bold uppercase"><tr><th className="pb-3">Name</th><th className="pb-3">Email</th><th className="pb-3">Role</th><th className="pb-3">Status</th><th className="pb-3 text-right">Actions</th></tr></thead>
              <tbody className="divide-y divide-[#E6DED1] text-[#514B44]">
                {(usersList || []).map((u, index) => {
                  const userId = getEntityId(u);
                  const rowKey = userId || `${u.email || "user"}-${index}`;
                  return <tr key={rowKey}><td className="py-3 font-semibold text-[#211E1B]">{u.name}</td><td className="py-3">{u.email}</td><td className="py-3 capitalize font-medium">{u.role}</td><td className="py-3"><span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${u.status === "active" ? "bg-[#E7EFE2] text-[#4B5D3A]" : "bg-[#FBE9E5] text-[#A23B2E]"}`}>{u.status}</span></td><td className="py-3 text-right">{u.role !== "admin" && <button onClick={() => toggleUserSuspendMutation.mutate({ userId, isSuspended: u.status === "suspended" })} disabled={!userId || toggleUserSuspendMutation.isPending} className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition disabled:opacity-50 ${u.status === "suspended" ? "bg-[#E7EFE2] text-[#4B5D3A] hover:bg-[#DCE7D4]" : "bg-[#FBE9E5] text-[#A23B2E] hover:bg-[#F3D8D2]"}`}>{u.status === "suspended" ? "Unsuspend" : "Suspend"}</button>}</td></tr>;
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "sellers" && (
        <div className="bg-white rounded-md border border-[#C8C0B3] p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
            <div>
              <h3 className="text-base font-bold text-[#211E1B]">Seller Applications & Moderation</h3>
              <p className="text-[11px] text-[#8B8377] mt-1">Customer seller applications require admin approval. Sellers can disband their seller role directly; disbandment is not reviewed here.</p>
            </div>
            <ShieldAlert className="w-5 h-5 text-[#C17817] shrink-0" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[#E6DED1] text-[#A39A8D] font-bold uppercase">
                <tr><th className="pb-3">Business Name</th><th className="pb-3">City</th><th className="pb-3">PAN</th><th className="pb-3">Status</th><th className="pb-3 text-right">Actions</th></tr>
              </thead>
              <tbody className="divide-y divide-[#E6DED1] text-[#514B44]">
                {(sellersList || []).map((s, index) => {
                  const sellerId = getEntityId(s);
                  const rowKey = sellerId || `${s.email || "seller"}-${index}`;
                  const isPendingApplication = s.role === "customer" && s.sellerProfile?.status === "pending";
                  const displayStatus = isPendingApplication ? "Application Pending" : s.sellerProfile?.status || s.status;
                  return (
                    <tr key={rowKey}>
                      <td className="py-3 font-semibold text-[#211E1B]">{s.sellerProfile?.businessName || "—"}</td>
                      <td className="py-3">{s.sellerProfile?.businessCity || "—"}</td>
                      <td className="py-3 font-mono">{s.sellerProfile?.panNumber || "—"}</td>
                      <td className="py-3"><span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${isPendingApplication ? "bg-[#F1ECE1] text-[#C17817]" : "bg-[#E8E1D5] text-[#211E1B]"}`}>{displayStatus}</span></td>
                      <td className="py-3 text-right space-x-2">
                        <button onClick={() => handleSellerModeration(s, "approved")} disabled={!sellerId || moderateSellerMutation.isPending} className="px-2.5 py-1 rounded-lg bg-[#E7EFE2] text-[#4B5D3A] hover:bg-[#DCE7D4] font-bold text-[11px] disabled:opacity-50">Approve</button>
                        <button onClick={() => handleSellerModeration(s, "rejected")} disabled={!sellerId || moderateSellerMutation.isPending} className="px-2.5 py-1 rounded-lg bg-[#FBE9E5] text-[#A23B2E] hover:bg-[#F3D8D2] font-bold text-[11px] disabled:opacity-50">Reject</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {!sellersList?.length && <div className="text-xs text-[#A39A8D] py-4 text-center">No pending seller applications or active sellers.</div>}
        </div>
      )}

      {activeTab === "categories" && (
        <div className="space-y-6">
          <div className="bg-white rounded-md border border-[#C8C0B3] p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2"><Plus className="w-4 h-4 text-[#4B5D3A]" /><h3 className="text-base font-bold text-[#211E1B]">Create Category</h3></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} placeholder="Category name" className="px-3 py-2.5 rounded-md border border-[#C8C0B3] text-sm" />
              <input value={newCategoryDescription} onChange={(e) => setNewCategoryDescription(e.target.value)} placeholder="Description" className="px-3 py-2.5 rounded-md border border-[#C8C0B3] text-sm" />
              <div className="flex items-center gap-2">
                {React.createElement(getCategoryIcon(newCategoryIcon), { className: "w-4 h-4 text-[#6F685F] shrink-0" })}
                <select value={newCategoryIcon} onChange={(e) => setNewCategoryIcon(e.target.value)} className="w-full px-3 py-2.5 rounded-md border border-[#C8C0B3] text-sm bg-white">
                  {CATEGORY_ICON_NAMES.map((iconName) => <option key={iconName} value={iconName}>{iconName}</option>)}
                </select>
              </div>
            </div>
            <button onClick={() => createCategoryMutation.mutate()} disabled={createCategoryMutation.isPending || !newCategoryName.trim()} className="px-4 py-2.5 rounded-md bg-[#211E1B] text-white text-xs font-bold disabled:opacity-50">Create Category</button>
          </div>
          <div className="bg-white rounded-md border border-[#C8C0B3] p-6 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-[#211E1B]">Categories</h3>
            <div className="space-y-2">
              {(categoriesList || []).map((category, index) => {
                const categoryId = getEntityId(category);
                return <div key={categoryId || `${category.slug || category.name || "category"}-${index}`} className="flex flex-wrap items-center justify-between gap-3 border border-[#E6DED1] rounded-md p-3"><div><p className="text-sm font-bold text-[#211E1B]">{category.name}</p><p className="text-[11px] text-[#8B8377]">{category.slug}</p></div><div className="flex items-center gap-2">
                        {React.createElement(getCategoryIcon(category.iconName), { className: "w-4 h-4 text-[#6F685F] shrink-0" })}
                        <select value={category.iconName || "Package"} onChange={(e) => { const iconName = e.target.value; if (categoryId) updateCategoryIconMutation.mutate({ categoryId, iconName }); }} className="w-32 px-2 py-1.5 rounded-lg border border-[#C8C0B3] text-xs bg-white">
                          {CATEGORY_ICON_NAMES.map((iconName) => <option key={iconName} value={iconName}>{iconName}</option>)}
                        </select>
                        <button onClick={() => categoryId && deleteCategoryMutation.mutate(categoryId)} disabled={!categoryId || deleteCategoryMutation.isPending} className="p-2 rounded-lg bg-[#FBE9E5] text-[#A23B2E] disabled:opacity-50"><Trash2 className="w-4 h-4" /></button></div></div>;
              })}
            </div>
          </div>
        </div>
      )}

      {activeTab === "products" && <AdminProductManagement />}
      {activeTab === "disputes" && (
        <div className="bg-white rounded-md border border-[#C8C0B3] p-6 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-[#211E1B]">Reports & Disputes</h3>
          {(disputesList || []).length === 0 ? <p className="text-sm text-[#8B8377]">No disputes found.</p> : <div className="space-y-3">{(disputesList || []).map((dispute, index) => <div key={getEntityId(dispute) || `dispute-${index}`} className="rounded-md border border-[#E6DED1] p-4"><p className="text-sm font-bold text-[#211E1B]">Booking {getEntityId(dispute)}</p><p className="text-xs text-[#8B8377] mt-1">{dispute.customer?.name || "Customer"} · {dispute.status}</p></div>)}</div>}
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
          <label htmlFor="seller-rejection-reason" className="text-xs font-bold text-[#B8B0A3]">Rejection reason *</label>
          <textarea
            id="seller-rejection-reason"
            value={sellerRejectionReason}
            onChange={(event) => setSellerRejectionReason(event.target.value)}
            placeholder="Explain why the seller application is being rejected..."
            rows={4}
            maxLength={1000}
            disabled={moderateSellerMutation.isPending}
            className="w-full px-3 py-2.5 rounded-md border border-[#6B6359] bg-[#F1ECE1] text-sm text-[#211E1B] placeholder:text-[#8B8377] outline-none focus:border-[#A23B2E] focus:ring-1 focus:ring-[#A23B2E]/20 disabled:opacity-50"
          />
          <div className="flex items-center justify-between text-[10px] text-[#8B8377]">
            <span>Minimum 5 characters.</span>
            <span>{sellerRejectionReason.length}/1000</span>
          </div>
        </div>
      </ConfirmModal>
    </div>
  );
}
