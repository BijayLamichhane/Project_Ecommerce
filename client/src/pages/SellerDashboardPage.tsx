import React from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/axios";
import { formatCurrency, formatDate } from "../lib/utils";
import {
  TrendingUp,
  Package,
  Clock,
  CheckCircle2,
  XCircle,
  Plus,
  ArrowRight,
  ShieldCheck,
  RotateCcw,
} from "lucide-react";

export function SellerDashboardPage() {
  const queryClient = useQueryClient();

  const { data: earningsData, isLoading } = useQuery({
    queryKey: ["seller-earnings"],
    queryFn: async () => {
      const { data } = await api.get("/users/seller/earnings");
      return data.data;
    },
  });

  const { data: sellerBookingsData } = useQuery({
    queryKey: ["seller-bookings"],
    queryFn: async () => {
      const { data } = await api.get("/bookings/seller-bookings");
      return data.data || [];
    },
  });
  const sellerBookings = sellerBookingsData || [];

  const { data: myProductsData } = useQuery({
    queryKey: ["seller-products"],
    queryFn: async () => {
      const { data } = await api.get("/products?limit=20");
      return data.data || [];
    },
  });
  const myProducts = myProductsData || [];

  // Approve / Confirm Booking Mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ bookingId, status }: { bookingId: string; status: string }) => {
      await api.patch(`/bookings/${bookingId}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["seller-bookings"] });
      queryClient.invalidateQueries({ queryKey: ["seller-earnings"] });
    },
  });

  const metrics = earningsData?.metrics;
  const pendingRequests = sellerBookings.filter((b: any) => b.status === "pending" || b.status === "confirmed");
  const activeRentals = sellerBookings.filter((b: any) => b.status === "active" || b.status === "return_requested");

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Seller Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-indigo-600">
            Lender Command Center
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-0.5">
            Seller Dashboard
          </h1>
        </div>

        <Link
          to="/seller/products/new"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-200 transition"
        >
          <Plus className="w-4 h-4" />
          List New Equipment
        </Link>
      </div>

      {/* ─── Metric Cards ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Total Revenue
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
            {formatCurrency(metrics?.totalEarnings ?? 0)}
          </div>
          <p className="text-[11px] text-emerald-600 font-medium mt-1">Earned to date</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Active Rented Items
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
            {metrics?.activeRentalsCount ?? 0}
          </div>
          <p className="text-[11px] text-indigo-600 font-medium mt-1">Currently with renters</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Pending Requests
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
            {metrics?.pendingRequestsCount ?? 0}
          </div>
          <p className="text-[11px] text-amber-600 font-medium mt-1">Awaiting your approval</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Equipment Listed
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
            {metrics?.totalProducts ?? 0}
          </div>
          <p className="text-[11px] text-slate-500 font-medium mt-1">Active live catalog</p>
        </div>
      </div>

      {/* ─── Your Equipment Listings ──────────────────────────── */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900">Your Equipment Listings</h3>
          <Link
            to="/seller/products/new"
            className="text-xs font-semibold text-indigo-600 hover:underline flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            Add New
          </Link>
        </div>

        {myProducts.length === 0 ? (
          <div className="text-center py-10 text-xs text-slate-400">
            You haven't listed any equipment yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                <tr>
                  <th className="pb-3">Equipment</th>
                  <th className="pb-3">Category</th>
                  <th className="pb-3">Daily Rate</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {myProducts.map((p: any) => (
                  <tr key={p._id} className="hover:bg-slate-50/60">
                    <td className="py-3 font-semibold text-slate-900">{p.name}</td>
                    <td className="py-3 text-slate-500">{p.category?.name || "—"}</td>
                    <td className="py-3 font-bold text-slate-900">
                      {p.pricing?.dailyRate ? formatCurrency(p.pricing.dailyRate) : "—"}
                    </td>
                    <td className="py-3">
                      <span className="capitalize px-2 py-0.5 rounded-md font-bold text-[11px] bg-slate-100 text-slate-800">
                        {p.status}
                      </span>
                    </td>
                    <td className="py-3 text-right space-x-3">
                      <Link
                        to={`/seller/products/${p._id}/edit`}
                        className="text-indigo-600 hover:underline font-semibold text-[11px]"
                      >
                        Edit
                      </Link>
                      <Link to={`/products/${p._id}`} className="text-slate-500 hover:underline text-[11px]">
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── Active & Pending Bookings Management ─────────────── */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-6">
        <h3 className="text-lg font-bold text-slate-900">Rental Bookings Management</h3>

        {sellerBookings.length === 0 ? (
          <div className="text-center py-10 text-xs text-slate-400">
            No bookings received yet for your listed equipment.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                <tr>
                  <th className="pb-3">Customer</th>
                  <th className="pb-3">Rental Dates</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Earnings</th>
                  <th className="pb-3">Deposit</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {sellerBookings.map((b: any) => (
                  <tr key={b._id} className="hover:bg-slate-50/60">
                    <td className="py-3 font-semibold text-slate-900">
                      {b.customer?.name || "Customer"}
                    </td>
                    <td className="py-3">
                      {b.bookingItems?.[0] && (
                        <span>
                          {formatDate(b.bookingItems[0].startDate)} →{" "}
                          {formatDate(b.bookingItems[0].endDate)}
                        </span>
                      )}
                    </td>
                    <td className="py-3">
                      <span className="capitalize px-2 py-0.5 rounded-md font-bold text-[11px] bg-slate-100 text-slate-800">
                        {b.status}
                      </span>
                    </td>
                    <td className="py-3 font-bold text-slate-900">
                      {formatCurrency(b.totalRentalPrice)}
                    </td>
                    <td className="py-3 text-emerald-700 font-medium">
                      {formatCurrency(b.totalDeposit)}
                    </td>
                    <td className="py-3 text-right space-x-2">
                      {b.status === "pending" && (
                        <>
                          <button
                            onClick={() =>
                              updateStatusMutation.mutate({ bookingId: b._id, status: "confirmed" })
                            }
                            className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold text-[11px]"
                          >
                            Accept
                          </button>
                          <button
                            onClick={() =>
                              updateStatusMutation.mutate({ bookingId: b._id, status: "rejected" })
                            }
                            className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 font-bold text-[11px]"
                          >
                            Decline
                          </button>
                        </>
                      )}

                      {b.status === "confirmed" && (
                        <button
                          onClick={() =>
                            updateStatusMutation.mutate({ bookingId: b._id, status: "active" })
                          }
                          className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-bold text-[11px]"
                        >
                          Handover Gear (Activate)
                        </button>
                      )}

                      {b.status === "return_requested" && (
                        <button
                          onClick={() =>
                            updateStatusMutation.mutate({ bookingId: b._id, status: "returned" })
                          }
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 font-bold text-[11px]"
                        >
                          Inspect & Mark Returned
                        </button>
                      )}

                      {b.status === "returned" && (
                        <button
                          onClick={() =>
                            updateStatusMutation.mutate({ bookingId: b._id, status: "completed" })
                          }
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 font-bold text-[11px]"
                        >
                          Complete Booking
                        </button>
                      )}

                      <Link
                        to={`/bookings/${b._id}`}
                        className="text-slate-500 hover:underline text-[11px]"
                      >
                        Details
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
