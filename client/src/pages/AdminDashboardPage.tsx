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

  const filteredReports = (reportsList || []).filter((report) => {
    const reporter = typeof report.reporterId === "object" ? report.reporterId?.name || report.reporterId?.email : "";
    const product = report.reportedProductId?.name || "";
    const user = report.reportedUserId?.name || report.reportedUserId?.email || "";
    const review = report.reportedReviewId?.comment || report.reportedReviewId?.title || "";
    const haystack = `${report.reason} ${report.details || ""} ${reporter} ${product} ${user} ${review}`.toLowerCase();

    return (
      (reportStatusFilter === "all" || report.status === reportStatusFilter) &&
      haystack.includes(reportSearch.trim().toLowerCase())
    );
  });

  const filteredDisputes = (disputesList || []).filter((dispute) => {
    const productName = dispute.bookingItems?.[0]?.product?.name || "";
    const customer = dispute.customer?.name || dispute.customer?.email || "";
    const seller = dispute.seller?.name || dispute.seller?.email || "";
    const haystack = `${getEntityId(dispute)} ${productName} ${customer} ${seller} ${dispute.disputeReason || ""}`.toLowerCase();
    return haystack.includes(disputeSearch.trim().toLowerCase());
  });

  const openReportsCount = (reportsList || []).filter((report) =>
    ["pending", "reviewed"].includes(report.status)
  ).length;
  const openDisputesCount = disputesList?.length || 0;

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
        <div className="space-y-6">
          <div className="bg-white rounded-md border border-[#C8C0B3] p-6 shadow-sm">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <Gavel className="w-5 h-5 text-[#C17817]" />
                  <h3 className="text-base font-bold text-[#211E1B]">Reports & Disputes</h3>
                </div>
                <p className="text-[11px] text-[#8B8377] mt-1">
                  Review marketplace reports and rental disputes, record the decision, and keep the booking lifecycle consistent.
                </p>
              </div>
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider">
                <span className="px-2.5 py-1 rounded-md bg-[#F1ECE1] text-[#C17817]">Open Reports {openReportsCount}</span>
                <span className="px-2.5 py-1 rounded-md bg-[#FBE9E5] text-[#A23B2E]">Open Disputes {openDisputesCount}</span>
              </div>
            </div>

            <div className="flex gap-2 mt-5">
              {([
                { id: "reports", label: "Reports", count: reportsList?.length || 0 },
                { id: "disputes", label: "Booking Disputes", count: disputesList?.length || 0 },
              ] as const).map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => setModerationMode(mode.id)}
                  className={`px-4 py-2 rounded-md text-xs font-bold transition ${
                    moderationMode === mode.id
                      ? "bg-[#211E1B] text-white"
                      : "bg-[#F1ECE1] text-[#6F685F] hover:bg-[#E8E1D5]"
                  }`}
                >
                  {mode.label} ({mode.count})
                </button>
              ))}
            </div>
          </div>

          {moderationMode === "reports" ? (
            <div className="bg-white rounded-md border border-[#C8C0B3] p-6 shadow-sm space-y-5">
              <div className="flex flex-col md:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#A39A8D]" />
                  <input
                    value={reportSearch}
                    onChange={(e) => setReportSearch(e.target.value)}
                    placeholder="Search reason, reporter, listing, or report details"
                    className="w-full pl-9 pr-3 py-2.5 rounded-md border border-[#C8C0B3] bg-white text-sm outline-none focus:border-[#C17817]"
                  />
                </div>
                <select
                  value={reportStatusFilter}
                  onChange={(e) => setReportStatusFilter(e.target.value as "all" | Report["status"])}
                  className="md:w-44 px-3 py-2.5 rounded-md border border-[#C8C0B3] bg-white text-xs font-semibold text-[#514B44]"
                >
                  <option value="all">All statuses</option>
                  <option value="pending">Pending</option>
                  <option value="reviewed">Reviewed</option>
                  <option value="resolved">Resolved</option>
                  <option value="dismissed">Dismissed</option>
                </select>
              </div>

              <div className="text-[11px] text-[#8B8377]">
                Showing {filteredReports.length} of {reportsList?.length || 0} reports
              </div>

              {filteredReports.length ? (
                <div className="space-y-3">
                  {filteredReports.map((report, index) => {
                    const reportId = getEntityId(report);
                    const reporter =
                      typeof report.reporterId === "object"
                        ? report.reporterId?.name || report.reporterId?.email
                        : "Reporter";
                    const target =
                      report.targetType === "product"
                        ? report.reportedProductId?.name || "Product"
                        : report.targetType === "user"
                          ? report.reportedUserId?.name || "User"
                          : report.reportedReviewId?.title || "Review";
                    const rowKey = reportId || `report-${index}`;

                    return (
                      <div key={rowKey} className="rounded-md border border-[#E6DED1] p-4 space-y-3">
                        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-bold text-[#211E1B]">{target}</span>
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[#F1ECE1] text-[#C17817]">
                                {report.targetType}
                              </span>
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                report.status === "pending"
                                  ? "bg-[#F1ECE1] text-[#C17817]"
                                  : report.status === "reviewed"
                                    ? "bg-[#E8E1D5] text-[#514B44]"
                                    : report.status === "resolved"
                                      ? "bg-[#E7EFE2] text-[#4B5D3A]"
                                      : "bg-[#FBE9E5] text-[#A23B2E]"
                              }`}>
                                {report.status}
                              </span>
                            </div>
                            <p className="text-[11px] text-[#8B8377] mt-1">
                              Reported by {reporter || "Reporter"} · {formatDate(report.createdAt, "MMM d, yyyy h:mm a")}
                            </p>
                          </div>

                          {["pending", "reviewed"].includes(report.status) && reportId && (
                            <div className="flex gap-2 shrink-0">
                              {report.status === "pending" && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setModerationNotes("");
                                    setModerationModal({ kind: "report", item: report, status: "reviewed" });
                                  }}
                                  className="px-3 py-1.5 rounded-md bg-[#F1ECE1] text-[#C17817] hover:bg-[#E8E1D5] text-[11px] font-bold"
                                >
                                  Mark Reviewed
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  setModerationNotes("");
                                  setModerationModal({ kind: "report", item: report, status: "resolved" });
                                }}
                                className="px-3 py-1.5 rounded-md bg-[#E7EFE2] text-[#4B5D3A] hover:bg-[#DCE7D4] text-[11px] font-bold"
                              >
                                Resolve
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setModerationNotes("");
                                  setModerationModal({ kind: "report", item: report, status: "dismissed" });
                                }}
                                className="px-3 py-1.5 rounded-md bg-[#FBE9E5] text-[#A23B2E] hover:bg-[#F3D8D2] text-[11px] font-bold"
                              >
                                Dismiss
                              </button>
                            </div>
                          )}
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                          <div className="rounded-md bg-[#F7F3EA] border border-[#E6DED1] p-3">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-[#A39A8D]">Reason</p>
                            <p className="text-xs text-[#514B44] mt-1">{report.reason}</p>
                          </div>
                          <div className="rounded-md bg-[#F7F3EA] border border-[#E6DED1] p-3">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-[#A39A8D]">Details</p>
                            <p className="text-xs text-[#514B44] mt-1">{report.details || "No additional details provided."}</p>
                          </div>
                        </div>

                        {report.resolutionNotes && (
                          <div className="rounded-md border border-[#C8C0B3] p-3">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-[#A39A8D]">Resolution</p>
                            <p className="text-xs text-[#514B44] mt-1">{report.resolutionNotes}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-10 text-center text-xs text-[#A39A8D]">No reports match the current filters.</div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-md border border-[#C8C0B3] p-6 shadow-sm space-y-5">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#A39A8D]" />
                <input
                  value={disputeSearch}
                  onChange={(e) => setDisputeSearch(e.target.value)}
                  placeholder="Search booking, customer, seller, product, or dispute reason"
                  className="w-full pl-9 pr-3 py-2.5 rounded-md border border-[#C8C0B3] bg-white text-sm outline-none focus:border-[#C17817]"
                />
              </div>

              <div className="text-[11px] text-[#8B8377]">
                Showing {filteredDisputes.length} of {disputesList?.length || 0} open disputes
              </div>

              {filteredDisputes.length ? (
                <div className="space-y-3">
                  {filteredDisputes.map((dispute, index) => {
                    const bookingId = getEntityId(dispute);
                    const productName = dispute.bookingItems?.[0]?.product?.name || "Product unavailable";
                    const rowKey = bookingId || `dispute-${index}`;

                    return (
                      <div key={rowKey} className="rounded-md border border-[#E6DED1] p-4 space-y-4">
                        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-bold text-[#211E1B]">Booking {bookingId}</span>
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[#FBE9E5] text-[#A23B2E]">Disputed</span>
                              {dispute.disputePreviousStatus && (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[#E8E1D5] text-[#514B44]">
                                  Previous: {dispute.disputePreviousStatus.replace("_", " ")}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-[#8B8377] mt-1">
                              Raised {formatDate(dispute.disputedAt || dispute.createdAt, "MMM d, yyyy h:mm a")}
                            </p>
                          </div>
                          {bookingId && (
                            <div className="flex gap-2 shrink-0">
                              <button
                                type="button"
                                onClick={() => {
                                  setModerationNotes("");
                                  setModerationModal({ kind: "dispute", item: dispute, action: "resolve" });
                                }}
                                className="px-3 py-1.5 rounded-md bg-[#E7EFE2] text-[#4B5D3A] hover:bg-[#DCE7D4] text-[11px] font-bold"
                              >
                                Resolve & Complete
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setModerationNotes("");
                                  setModerationModal({ kind: "dispute", item: dispute, action: "dismiss" });
                                }}
                                className="px-3 py-1.5 rounded-md bg-[#FBE9E5] text-[#A23B2E] hover:bg-[#F3D8D2] text-[11px] font-bold"
                              >
                                Dismiss & Restore
                              </button>
                            </div>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div className="rounded-md bg-[#F7F3EA] border border-[#E6DED1] p-3">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-[#A39A8D]">Customer</p>
                            <p className="text-xs font-semibold text-[#211E1B] mt-1">{dispute.customer?.name || "Customer"}</p>
                            <p className="text-[11px] text-[#8B8377]">{dispute.customer?.email || "—"}</p>
                          </div>
                          <div className="rounded-md bg-[#F7F3EA] border border-[#E6DED1] p-3">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-[#A39A8D]">Seller</p>
                            <p className="text-xs font-semibold text-[#211E1B] mt-1">{dispute.seller?.name || "Seller"}</p>
                            <p className="text-[11px] text-[#8B8377]">{dispute.seller?.email || "—"}</p>
                          </div>
                          <div className="rounded-md bg-[#F7F3EA] border border-[#E6DED1] p-3">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-[#A39A8D]">Rental</p>
                            <p className="text-xs font-semibold text-[#211E1B] mt-1">{productName}</p>
                            <p className="text-[11px] text-[#8B8377]">{dispute.totalAmount ? formatCurrency(dispute.totalAmount) : "—"} total</p>
                          </div>
                        </div>

                        <div className="rounded-md border border-[#C8C0B3] p-3">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-[#A39A8D]">Dispute Reason</p>
                          <p className="text-xs text-[#514B44] mt-1">{dispute.disputeReason || "No reason recorded."}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-10 text-center text-xs text-[#A39A8D]">No open disputes match the current search.</div>
              )}
            </div>
          )}
        </div>
      )}

      {moderationModal && (
        <div className="fixed inset-0 z-50 bg-[#211E1B]/75 flex items-center justify-center p-4">
          <div className="bg-white border border-[#DDD5C7] rounded-md p-6 max-w-lg w-full shadow-sm space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  {moderationModal.kind === "report" ? (
                    <Flag className="w-5 h-5 text-[#C17817]" />
                  ) : (
                    <Gavel className="w-5 h-5 text-[#A23B2E]" />
                  )}
                  <h3 className="text-lg font-bold text-[#211E1B]">
                    {moderationModal.kind === "report"
                      ? `${moderationModal.status === "reviewed" ? "Review" : moderationModal.status === "resolved" ? "Resolve" : "Dismiss"} Report`
                      : moderationModal.action === "resolve"
                        ? "Resolve Dispute"
                        : "Dismiss Dispute"}
                  </h3>
                </div>
                <p className="text-xs text-[#8B8377] mt-1">
                  {moderationModal.kind === "report"
                    ? "Record the moderation decision and leave an internal note."
                    : moderationModal.action === "resolve"
                      ? "This closes the dispute and completes the booking."
                      : "This closes the dispute and restores the booking to its previous state."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModerationModal(null)}
                disabled={updateReportStatusMutation.isPending || resolveDisputeMutation.isPending}
                className="p-2 rounded-lg hover:bg-[#E8E1D5] text-[#8B8377]"
              >
                <XCircle className="w-4 h-4" />
              </button>
            </div>

            <div className="rounded-md bg-[#F7F3EA] border border-[#E6DED1] p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#A39A8D]">
                {moderationModal.kind === "report" ? "Report" : "Dispute"}
              </p>
              <p className="text-xs font-semibold text-[#211E1B] mt-1">
                {moderationModal.kind === "report"
                  ? moderationModal.item.reason
                  : `Booking ${getEntityId(moderationModal.item)}`}
              </p>
              {moderationModal.kind === "report" && moderationModal.item.details && (
                <p className="text-[11px] text-[#6F685F] mt-1">{moderationModal.item.details}</p>
              )}
              {moderationModal.kind === "dispute" && moderationModal.item.disputeReason && (
                <p className="text-[11px] text-[#6F685F] mt-1">{moderationModal.item.disputeReason}</p>
              )}
            </div>

            <textarea
              autoFocus
              rows={5}
              maxLength={2000}
              value={moderationNotes}
              onChange={(e) => setModerationNotes(e.target.value)}
              disabled={updateReportStatusMutation.isPending || resolveDisputeMutation.isPending}
              placeholder="Add the decision or evidence note..."
              className="w-full px-4 py-3 text-sm bg-[#F7F3EA] border border-[#B8B0A3] rounded-md text-[#211E1B] placeholder:text-[#8B8377] outline-none focus:border-[#C17817] resize-none"
            />
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-[#8B8377]">{moderationNotes.length}/2000</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setModerationModal(null)}
                  disabled={updateReportStatusMutation.isPending || resolveDisputeMutation.isPending}
                  className="px-4 py-2.5 rounded-md text-xs font-bold text-[#8B8377] hover:bg-[#E8E1D5]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={
                    moderationNotes.trim().length < 3 ||
                    updateReportStatusMutation.isPending ||
                    resolveDisputeMutation.isPending
                  }
                  onClick={() => {
                    const itemId = getEntityId(moderationModal.item);
                    if (!itemId) {
                      setErrorMsg("The selected moderation item has no valid ID.");
                      return;
                    }

                    if (moderationModal.kind === "report") {
                      updateReportStatusMutation.mutate({
                        reportId: itemId,
                        status: moderationModal.status,
                        notes: moderationNotes.trim(),
                      });
                      return;
                    }

                    resolveDisputeMutation.mutate({
                      bookingId: itemId,
                      action: moderationModal.action,
                      notes: moderationNotes.trim(),
                    });
                  }}
                  className="px-4 py-2.5 rounded-md bg-[#211E1B] hover:bg-[#C17817] disabled:opacity-50 text-white text-xs font-extrabold inline-flex items-center gap-1.5"
                >
                  {moderationModal.kind === "report"
                    ? moderationModal.status === "dismissed"
                      ? "Dismiss Report"
                      : moderationModal.status === "resolved"
                        ? "Resolve Report"
                        : "Mark Reviewed"
                    : moderationModal.action === "resolve"
                      ? "Resolve & Complete"
                      : "Dismiss & Restore"}
                </button>
              </div>
            </div>
          </div>
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
