import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/axios";
import { formatCurrency, formatDate, getEntityId, getErrorMessage } from "../lib/utils";
import { useAuth } from "../hooks/useAuth";
import { Package, Plus, RotateCcw, Trash2, AlertTriangle, ShieldAlert } from "lucide-react";
import { ConfirmModal } from "../components/shared/ConfirmModal";

export function SellerDashboardPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { setUser } = useAuth();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<
    | { type: "delete"; product: any }
    | { type: "disband" }
    | null
  >(null);

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

  const { data: myProductsData, isLoading: productsLoading } = useQuery({
    queryKey: ["seller-products"],
    queryFn: async () => {
      const { data } = await api.get("/products/mine");
      return data.data || [];
    },
  });
  const myProducts = myProductsData || [];

  const updateStatusMutation = useMutation({
    mutationFn: async ({ bookingId, status }: { bookingId: string; status: string }) => {
      await api.patch(`/bookings/${encodeURIComponent(bookingId)}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["seller-bookings"] });
      queryClient.invalidateQueries({ queryKey: ["seller-earnings"] });
      setErrorMsg(null);
    },
    onError: (err: any) => setErrorMsg(getErrorMessage(err, "Failed to update booking status.")),
  });

  const deleteProductMutation = useMutation({
    mutationFn: async (productId: string) => {
      if (!productId) throw new Error("Product ID is missing.");
      await api.delete(`/products/${encodeURIComponent(productId)}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["seller-products"] });
      queryClient.invalidateQueries({ queryKey: ["seller-earnings"] });
      setConfirmModal(null);
      setErrorMsg(null);
    },
    onError: (err: any) => setErrorMsg(getErrorMessage(err, "Failed to delete the product.")),
  });

  const disbandSellerMutation = useMutation({
    mutationFn: async () => {
      setErrorMsg(null);
      const { data } = await api.post("/users/seller/disband");
      return data.data;
    },
    onSuccess: async () => {
      const { data: me } = await api.get("/users/me");
      setUser(me.data);
      queryClient.clear();
      setConfirmModal(null);
      navigate("/dashboard", { replace: true });
    },
    onError: (err: any) => setErrorMsg(getErrorMessage(err, "Failed to disband the seller account.")),
  });

  const handleDeleteProduct = (product: any) => {
    const productId = getEntityId(product);
    if (!productId) {
      setErrorMsg("This product has no valid ID and cannot be deleted.");
      return;
    }
    setConfirmModal({ type: "delete", product });
  };

  const handleSellerDisband = () => {
    if (disbandSellerMutation.isPending) return;
    setConfirmModal({ type: "disband" });
  };

  const handleConfirmAction = () => {
    if (!confirmModal) return;

    if (confirmModal.type === "delete") {
      const productId = getEntityId(confirmModal.product);
      if (!productId) {
        setConfirmModal(null);
        setErrorMsg("This product has no valid ID and cannot be deleted.");
        return;
      }
      deleteProductMutation.mutate(productId);
      return;
    }

    disbandSellerMutation.mutate();
  };

  const metrics = earningsData?.metrics;
  const modalLoading = deleteProductMutation.isPending || disbandSellerMutation.isPending;

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="h-72 rounded-3xl bg-slate-900 border border-slate-800 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {errorMsg && (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-800 bg-rose-950/60 p-4 text-sm text-rose-200">
          <AlertTriangle className="h-5 w-5 shrink-0 text-rose-400" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-indigo-600">Lender Command Center</div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-0.5">Seller Dashboard</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleSellerDisband}
            disabled={disbandSellerMutation.isPending}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-700 text-xs font-bold transition disabled:opacity-50"
          >
            <ShieldAlert className="w-4 h-4" />
            {disbandSellerMutation.isPending ? "Disbanding..." : "Disband Seller Account"}
          </button>
          <Link
            to="/seller/products/new"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-200 transition"
          >
            <Plus className="w-4 h-4" />
            List New Equipment
          </Link>
        </div>
      </div>

      <div className="rounded-2xl border border-amber-800 bg-amber-950/50 p-4 text-xs text-amber-200">
        Disbanding changes your account back to customer status immediately. Any active or draft listings will be taken offline. You must settle all pending, confirmed, active, or return-requested rentals first.
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Revenue</div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">{formatCurrency(metrics?.totalEarnings ?? 0)}</div>
          <p className="text-[11px] text-emerald-600 font-medium mt-1">Earned to date</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Active Rented Items</div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">{metrics?.activeRentalsCount ?? 0}</div>
          <p className="text-[11px] text-indigo-600 font-medium mt-1">Currently with renters</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Pending Requests</div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">{metrics?.pendingRequestsCount ?? 0}</div>
          <p className="text-[11px] text-amber-600 font-medium mt-1">Awaiting your approval</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Equipment Listed</div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">{metrics?.totalProducts ?? 0}</div>
          <p className="text-[11px] text-slate-500 font-medium mt-1">Your live catalog</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Your Equipment Listings</h3>
            <p className="text-xs text-slate-500 mt-1">Only products owned by this seller are shown here.</p>
          </div>
          <Link to="/seller/products/new" className="text-xs font-semibold text-indigo-600 hover:underline flex items-center gap-1">
            <Plus className="w-3.5 h-3.5" />
            Add New
          </Link>
        </div>

        {productsLoading ? (
          <div className="h-32 rounded-2xl bg-slate-100 animate-pulse" />
        ) : myProducts.length === 0 ? (
          <div className="text-center py-10 text-xs text-slate-400">You haven't listed any equipment yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                <tr><th className="pb-3">Equipment</th><th className="pb-3">Category</th><th className="pb-3">Daily Rate</th><th className="pb-3">Status</th><th className="pb-3 text-right">Actions</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {myProducts.map((product: any, index: number) => {
                  const productId = getEntityId(product);
                  const rowKey = productId || `${product.slug || product.name || "product"}-${index}`;
                  return (
                    <tr key={rowKey} className="hover:bg-slate-50/60">
                      <td className="py-3 font-semibold text-slate-900">{product.name}</td>
                      <td className="py-3 text-slate-500">{product.category?.name || "—"}</td>
                      <td className="py-3 font-bold text-slate-900">{product.pricing?.dailyRate ? formatCurrency(product.pricing.dailyRate) : "—"}</td>
                      <td className="py-3"><span className="capitalize px-2 py-0.5 rounded-md font-bold text-[11px] bg-slate-100 text-slate-800">{product.status}</span></td>
                      <td className="py-3 text-right whitespace-nowrap space-x-3">
                        <Link to={productId ? `/seller/products/${productId}/edit` : "#"} onClick={(event) => !productId && event.preventDefault()} className="text-indigo-600 hover:underline font-semibold text-[11px]">Edit</Link>
                        <Link to={productId ? `/products/${productId}` : "#"} onClick={(event) => !productId && event.preventDefault()} className="text-slate-500 hover:underline text-[11px]">View</Link>
                        <button type="button" onClick={() => handleDeleteProduct(product)} disabled={!productId || deleteProductMutation.isPending} className="inline-flex items-center gap-1 text-rose-600 hover:text-rose-700 disabled:opacity-40 font-semibold text-[11px]"><Trash2 className="w-3.5 h-3.5" />Delete</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-6">
        <div className="flex items-center gap-2">
          <Package className="w-5 h-5 text-indigo-600" />
          <div>
            <h3 className="text-lg font-bold text-slate-900">Rental Bookings Management</h3>
            <p className="text-xs text-slate-500 mt-1">Manage bookings for your equipment.</p>
          </div>
        </div>

        {sellerBookings.length === 0 ? (
          <div className="text-center py-10 text-xs text-slate-400">No bookings received yet for your listed equipment.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider"><tr><th className="pb-3">Customer</th><th className="pb-3">Rental Dates</th><th className="pb-3">Status</th><th className="pb-3">Earnings</th><th className="pb-3">Deposit</th><th className="pb-3 text-right">Actions</th></tr></thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {sellerBookings.map((booking: any, index: number) => {
                  const bookingId = getEntityId(booking);
                  const rowKey = bookingId || `booking-${index}`;
                  return (
                    <tr key={rowKey} className="hover:bg-slate-50/60">
                      <td className="py-3 font-semibold text-slate-900">{booking.customer?.name || "Customer"}</td>
                      <td className="py-3">{booking.bookingItems?.[0] ? `${formatDate(booking.bookingItems[0].startDate)} → ${formatDate(booking.bookingItems[0].endDate)}` : "—"}</td>
                      <td className="py-3"><span className="capitalize px-2 py-0.5 rounded-md font-bold text-[11px] bg-slate-100 text-slate-800">{booking.status}</span></td>
                      <td className="py-3 font-bold text-slate-900">{formatCurrency(booking.totalRentalPrice)}</td>
                      <td className="py-3 text-emerald-700 font-medium">{formatCurrency(booking.totalDeposit)}</td>
                      <td className="py-3 text-right space-x-2 whitespace-nowrap">
                        {bookingId && booking.status === "pending" && (
                          <>
                            <button onClick={() => updateStatusMutation.mutate({ bookingId, status: "confirmed" })} disabled={updateStatusMutation.isPending} className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 disabled:opacity-50 font-bold text-[11px]">Accept</button>
                            <button onClick={() => updateStatusMutation.mutate({ bookingId, status: "rejected" })} disabled={updateStatusMutation.isPending} className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 disabled:opacity-50 font-bold text-[11px]">Decline</button>
                          </>
                        )}
                        {bookingId && booking.status === "confirmed" && <button onClick={() => updateStatusMutation.mutate({ bookingId, status: "active" })} disabled={updateStatusMutation.isPending} className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 disabled:opacity-50 font-bold text-[11px]">Handover Gear (Activate)</button>}
                        {bookingId && booking.status === "return_requested" && <button onClick={() => updateStatusMutation.mutate({ bookingId, status: "returned" })} disabled={updateStatusMutation.isPending} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 font-bold text-[11px]"><RotateCcw className="w-3.5 h-3.5" />Inspect & Mark Returned</button>}
                        {bookingId && booking.status === "returned" && <button onClick={() => updateStatusMutation.mutate({ bookingId, status: "completed" })} disabled={updateStatusMutation.isPending} className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 font-bold text-[11px]">Complete Booking</button>}
                        {bookingId && <Link to={`/bookings/${bookingId}`} className="text-slate-500 hover:underline text-[11px]">Details</Link>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmModal
        open={Boolean(confirmModal)}
        title={confirmModal?.type === "delete" ? "Delete Equipment Listing" : "Disband Seller Account"}
        message={
          confirmModal?.type === "delete"
            ? `Delete "${confirmModal.product?.name || "this product"}"? The listing will be removed from the marketplace and your seller inventory.`
            : "Disbanding is immediate and does not require admin approval. Your account will return to customer status and active or draft listings will be taken offline."
        }
        confirmLabel={confirmModal?.type === "delete" ? "Delete Product" : "Disband Account"}
        onConfirm={handleConfirmAction}
        onCancel={() => !modalLoading && setConfirmModal(null)}
        loading={modalLoading}
        danger
      />
    </div>
  );
}
