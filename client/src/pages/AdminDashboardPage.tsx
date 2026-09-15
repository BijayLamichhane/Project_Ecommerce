import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/axios";
import { formatCurrency, formatDate, getErrorMessage } from "../lib/utils";
import {
  Users,
  Building,
  Package,
  TrendingUp,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Ban,
  RotateCcw,
  Plus,
  Trash2,
} from "lucide-react";

export function AdminDashboardPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<
    "overview" | "users" | "sellers" | "products" | "disputes" | "categories"
  >("overview");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryDescription, setNewCategoryDescription] = useState("");
  const [newCategoryIcon, setNewCategoryIcon] = useState("Package");

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
      return data.data || [];
    },
    enabled: activeTab === "users",
  });

  const { data: sellersList } = useQuery({
    queryKey: ["admin-sellers"],
    queryFn: async () => {
      const { data } = await api.get("/admin/sellers");
      return data.data || [];
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

  // User suspend mutation
  const toggleUserSuspendMutation = useMutation({
    mutationFn: async ({ userId, isSuspended }: { userId: string; isSuspended: boolean }) => {
      setErrorMsg(null);
      const endpoint = isSuspended ? `/admin/users/${userId}/unsuspend` : `/admin/users/${userId}/suspend`;
      await api.post(endpoint);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
    },
    onError: (err: any) => {
      setErrorMsg(getErrorMessage(err, "Failed to update user status"));
    },
  });

  // Seller moderate mutation
  const moderateSellerMutation = useMutation({
    mutationFn: async ({ sellerId, status }: { sellerId: string; status: string }) => {
      setErrorMsg(null);
      await api.post(`/admin/sellers/${sellerId}/moderate`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-sellers"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
    },
    onError: (err: any) => {
      setErrorMsg(getErrorMessage(err, "Failed to update seller status"));
    },
  });

  const createCategoryMutation = useMutation({
    mutationFn: async () => {
      setErrorMsg(null);
      const slug = newCategoryName
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      await api.post("/categories", {
        name: newCategoryName.trim(),
        slug,
        description: newCategoryDescription.trim() || undefined,
        iconName: newCategoryIcon,
      });
    },
    onSuccess: () => {
      setNewCategoryName("");
      setNewCategoryDescription("");
      setNewCategoryIcon("Package");
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
    onError: (err: any) => {
      setErrorMsg(getErrorMessage(err, "Failed to create category"));
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (categoryId: string) => {
      setErrorMsg(null);
      await api.delete(`/categories/${categoryId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
    onError: (err: any) => {
      setErrorMsg(getErrorMessage(err, "Failed to delete category"));
    },
  });

  const updateCategoryIconMutation = useMutation({
    mutationFn: async ({ categoryId, iconName }: { categoryId: string; iconName: string }) => {
      setErrorMsg(null);
      await api.patch(`/categories/${categoryId}`, { iconName });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
    onError: (err: any) => {
      setErrorMsg(getErrorMessage(err, "Failed to update category icon"));
    },
  });

  const metrics = dashboardData?.metrics;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-amber-600">
            Platform Administration
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-0.5">
            Admin Governance Panel
          </h1>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 border-b border-slate-200">
        {[
          { id: "overview", label: "Overview & Analytics" },
          { id: "users", label: "Users Management" },
          { id: "sellers", label: "Seller Moderation" },
          { id: "categories", label: "Categories" },
          { id: "disputes", label: "Reports & Disputes" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition ${
              activeTab === tab.id
                ? "bg-slate-900 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ─── Overview Tab ─────────────────────────────────────── */}
      {activeTab === "overview" && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Platform Revenue
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
                {formatCurrency(metrics?.totalRevenue ?? 0)}
              </div>
              <p className="text-[11px] text-emerald-600 font-medium mt-1">Gross rental GMV</p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Total Users
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
                {metrics?.totalUsers ?? 0}
              </div>
              <p className="text-[11px] text-indigo-600 font-medium mt-1">Registered members</p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Active Listings
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
                {metrics?.totalProducts ?? 0}
              </div>
              <p className="text-[11px] text-slate-500 font-medium mt-1">Rentable gear</p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Active Rentals
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
                {metrics?.activeRentals ?? 0}
              </div>
              <p className="text-[11px] text-indigo-600 font-medium mt-1">Currently in use</p>
            </div>
          </div>

          {/* Recent Activity Log */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900">Recent Platform Activity</h3>
            {dashboardData?.recentActivity && dashboardData.recentActivity.length > 0 ? (
              <div className="divide-y divide-slate-100 text-xs">
                {dashboardData.recentActivity.map((act: any) => (
                  <div key={act.id} className="py-2.5 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-900 capitalize">
                        {act.actionType.replace("_", " ")}
                      </span>
                      <span className="text-slate-500 ml-2">by {act.admin?.name}</span>
                    </div>
                    <span className="text-[10px] text-slate-400">
                      {formatDate(act.createdAt, "MMM d, h:mm a")}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-slate-400 py-4">No recent administrative actions</div>
            )}
          </div>
        </div>
      )}

      {/* ─── Users Tab ────────────────────────────────────────── */}
      {activeTab === "users" && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-slate-900">Platform Users</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-100 text-slate-400 font-bold uppercase">
                <tr>
                  <th className="pb-3">Name</th>
                  <th className="pb-3">Email</th>
                  <th className="pb-3">Role</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {(usersList || []).map((u: any) => (
                  <tr key={u.id}>
                    <td className="py-3 font-semibold text-slate-900">{u.name}</td>
                    <td className="py-3">{u.email}</td>
                    <td className="py-3 capitalize font-medium">{u.role}</td>
                    <td className="py-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          u.status === "active"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-rose-50 text-rose-700"
                        }`}
                      >
                        {u.status}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      {u.role !== "admin" && (
                        <button
                          onClick={() =>
                            toggleUserSuspendMutation.mutate({
                              userId: u.id,
                              isSuspended: u.status === "suspended",
                            })
                          }
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                            u.status === "suspended"
                              ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                              : "bg-rose-50 text-rose-700 hover:bg-rose-100"
                          }`}
                        >
                          {u.status === "suspended" ? "Unsuspend" : "Suspend"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── Sellers Tab ──────────────────────────────────────── */}
      {activeTab === "sellers" && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-slate-900">Seller Moderation</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-100 text-slate-400 font-bold uppercase">
                <tr>
                  <th className="pb-3">Business Name</th>
                  <th className="pb-3">City</th>
                  <th className="pb-3">PAN</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {(sellersList || []).map((s: any) => (
                  <tr key={s.id}>
                    <td className="py-3 font-semibold text-slate-900">{s.businessName}</td>
                    <td className="py-3">{s.businessCity}</td>
                    <td className="py-3 font-mono">{s.panNumber}</td>
                    <td className="py-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-800">
                        {s.status}
                      </span>
                    </td>
                    <td className="py-3 text-right space-x-2">
                      <button
                        onClick={() =>
                          moderateSellerMutation.mutate({ sellerId: s.id, status: "approved" })
                        }
                        className="px-2 py-1 rounded bg-emerald-50 text-emerald-700 font-bold text-[11px]"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() =>
                          moderateSellerMutation.mutate({ sellerId: s.id, status: "suspended" })
                        }
                        className="px-2 py-1 rounded bg-rose-50 text-rose-700 font-bold text-[11px]"
                      >
                        Suspend
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── Categories Tab ───────────────────────────────────── */}
      {activeTab === "categories" && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-6">
          <h3 className="text-base font-bold text-slate-900">Equipment Categories</h3>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              createCategoryMutation.mutate();
            }}
            className="flex flex-col sm:flex-row gap-3 items-start sm:items-end bg-slate-50 border border-slate-200 rounded-2xl p-4"
          >
            <div className="flex-1 space-y-1 w-full">
              <label className="text-[11px] font-bold text-slate-700">Category Name *</label>
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="e.g. Camping Gear"
                className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl outline-none"
              />
            </div>
            <div className="flex-1 space-y-1 w-full">
              <label className="text-[11px] font-bold text-slate-700">Description</label>
              <input
                type="text"
                value={newCategoryDescription}
                onChange={(e) => setNewCategoryDescription(e.target.value)}
                placeholder="Optional"
                className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl outline-none"
              />
            </div>
            <div className="space-y-1 w-full sm:w-40">
              <label className="text-[11px] font-bold text-slate-700">Icon</label>
              <select
                value={newCategoryIcon}
                onChange={(e) => setNewCategoryIcon(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl outline-none"
              >
                <option value="Package">Generic</option>
                <option value="Camera">Camera</option>
                <option value="Laptop">Laptop</option>
                <option value="Tent">Tent</option>
                <option value="Music">Music</option>
                <option value="Wrench">Tools</option>
                <option value="Sparkles">Party</option>
                <option value="Gamepad2">Gaming</option>
                <option value="Navigation">Drone</option>
                <option value="Projector">Projector</option>
                <option value="Bike">Sports</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={createCategoryMutation.isPending || newCategoryName.trim().length < 2}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold flex items-center gap-1.5 whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              {createCategoryMutation.isPending ? "Adding..." : "Add Category"}
            </button>
          </form>

          {(categoriesList || []).length === 0 ? (
            <div className="text-center py-10 text-xs text-slate-400">
              No categories yet — add one above so sellers can list equipment.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-100 text-slate-400 font-bold uppercase">
                  <tr>
                    <th className="pb-3">Icon</th>
                    <th className="pb-3">Name</th>
                    <th className="pb-3">Slug</th>
                    <th className="pb-3">Description</th>
                    <th className="pb-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {(categoriesList || []).map((cat: any) => (
                    <tr key={cat.id}>
                      <td className="py-3">
                        <select
                          value={cat.iconName || "Package"}
                          onChange={(e) =>
                            updateCategoryIconMutation.mutate({ categoryId: cat.id, iconName: e.target.value })
                          }
                          disabled={updateCategoryIconMutation.isPending}
                          className="px-2 py-1.5 text-[11px] bg-white border border-slate-200 rounded-lg outline-none"
                        >
                          <option value="Package">Generic</option>
                          <option value="Camera">Camera</option>
                          <option value="Laptop">Laptop</option>
                          <option value="Tent">Tent</option>
                          <option value="Music">Music</option>
                          <option value="Wrench">Tools</option>
                          <option value="Sparkles">Party</option>
                          <option value="Gamepad2">Gaming</option>
                          <option value="Navigation">Drone</option>
                          <option value="Projector">Projector</option>
                          <option value="Bike">Sports</option>
                        </select>
                      </td>
                      <td className="py-3 font-semibold text-slate-900">{cat.name}</td>
                      <td className="py-3 font-mono text-slate-500">{cat.slug}</td>
                      <td className="py-3 text-slate-500">{cat.description || "—"}</td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => {
                            if (window.confirm(`Delete "${cat.name}"? This can't be undone.`)) {
                              deleteCategoryMutation.mutate(cat.id);
                            }
                          }}
                          disabled={deleteCategoryMutation.isPending}
                          className="px-2 py-1 rounded bg-rose-50 text-rose-700 font-bold text-[11px] inline-flex items-center gap-1"
                        >
                          <Trash2 className="w-3 h-3" />
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ─── Disputes Tab ─────────────────────────────────────── */}
      {activeTab === "disputes" && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-slate-900">Open Disputes & Incident Reports</h3>
          {(disputesList || []).length === 0 ? (
            <div className="text-xs text-slate-400 py-8 text-center">
              No active disputes or reports filed. Platform health is 100%.
            </div>
          ) : (
            <div className="space-y-3 text-xs">
              {disputesList.map((d: any) => (
                <div key={d.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <div className="font-bold text-slate-900">{d.description}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
