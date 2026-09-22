import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/axios";
import { formatCurrency, formatDate, getEntityId, getErrorMessage } from "../lib/utils";
import { useAuth } from "../hooks/useAuth";
import { Package, Plus, RotateCcw, Trash2, AlertTriangle, ShieldAlert, Power, Search, Star } from "lucide-react";
import type { Booking, Product } from "../types";
import { ConfirmModal } from "../components/shared/ConfirmModal";

type SellerEarningsData = {
  metrics?: {
    totalEarnings: number | string;
    activeRentalsCount: number;
    pendingRequestsCount: number;
    totalProducts: number;
    completedRentalsCount: number;
  };
};

export function SellerDashboardPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { setUser } = useAuth();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [productSearch, setProductSearch] = useState("");
  const [productStatusFilter, setProductStatusFilter] = useState<"all" | "active" | "inactive" | "draft" | "suspended">("all");
  const [bookingSearch, setBookingSearch] = useState("");
  const [bookingStatusFilter, setBookingStatusFilter] = useState<"all" | Booking["status"]>("all");
  const [confirmModal, setConfirmModal] = useState<
    | { type: "delete"; product: Product }
    | { type: "disband" }
    | null
  >(null);

  const { data: earningsData, isLoading } = useQuery<SellerEarningsData>({
    queryKey: ["seller-earnings"],
    queryFn: async () => {
      const { data } = await api.get("/users/seller/earnings");
      return data.data;
    },
  });

  const { data: sellerBookingsData } = useQuery<Booking[]>({
    queryKey: ["seller-bookings"],
    queryFn: async () => {
      const { data } = await api.get("/bookings/seller-bookings");
      return data.data || [];
    },
  });
  const sellerBookings = sellerBookingsData || [];

  const { data: myProductsData, isLoading: productsLoading } = useQuery<Product[]>({
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
    onError: (err: unknown) => setErrorMsg(getErrorMessage(err, "Failed to update booking status.")),
  });

  const updateProductStatusMutation = useMutation({
    mutationFn: async ({ productId, status }: { productId: string; status: "active" | "inactive" }) => {
      if (!productId) throw new Error("Product ID is missing.");
      await api.patch("/products/" + encodeURIComponent(productId) + "/status", { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["seller-products"] });
      queryClient.invalidateQueries({ queryKey: ["seller-earnings"] });
      setErrorMsg(null);
    },
    onError: (err: unknown) => setErrorMsg(getErrorMessage(err, "Failed to update listing status.")),
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
    onError: (err: unknown) => setErrorMsg(getErrorMessage(err, "Failed to delete the product.")),
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
    onError: (err: unknown) => setErrorMsg(getErrorMessage(err, "Failed to disband the seller account.")),
  });

  const handleDeleteProduct = (product: Product) => {
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
  const normalizedProductSearch = productSearch.trim().toLowerCase();
  const filteredProducts = myProducts.filter((product) => {
    const searchable = [product.name, product.brand, product.model, product.category?.name]
      .filter(Boolean)
      .map((value) => String(value).toLowerCase());
    const matchesSearch = !normalizedProductSearch || searchable.some((value) => value.includes(normalizedProductSearch));
    const matchesStatus = productStatusFilter === "all" || product.status === productStatusFilter;
    return matchesSearch && matchesStatus;
  });

  const normalizedBookingSearch = bookingSearch.trim().toLowerCase();
  const filteredBookings = sellerBookings.filter((booking) => {
    const searchable = [booking.customer?.name, booking.customer?.email, booking.bookingItems?.[0]?.product?.name]
      .filter(Boolean)
      .map((value) => String(value).toLowerCase());
    const matchesSearch = !normalizedBookingSearch || searchable.some((value) => value.includes(normalizedBookingSearch));
    const matchesStatus = bookingStatusFilter === "all" || booking.status === bookingStatusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalViews = myProducts.reduce((sum, product) => sum + Number(product.viewCount || 0), 0);
  const totalRentals = myProducts.reduce((sum, product) => sum + Number(product.totalRentals || 0), 0);
  const totalRatings = myProducts.reduce((sum, product) => sum + Number(product.totalRatings || 0), 0);
  const weightedRatingTotal = myProducts.reduce(
    (sum, product) => sum + Number(product.averageRating || 0) * Number(product.totalRatings || 0),
    0
  );
  const averageRating = totalRatings > 0 ? weightedRatingTotal / totalRatings : 0;

  const modalLoading =
    deleteProductMutation.isPending ||
    disbandSellerMutation.isPending ||
    updateProductStatusMutation.isPending;

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="h-72 rounded-md bg-[#211E1B] border border-[#6B6359] animate-pulse" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {errorMsg && (
        <div className="flex items-start gap-3 rounded-md border border-[#A23B2E]/30 bg-[#FBE9E5] p-4 text-sm text-[#A23B2E]">
          <AlertTriangle className="h-5 w-5 shrink-0 text-[#A23B2E]" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#C8C0B3]">
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-[#C17817]">Lender Command Center</div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#211E1B] mt-0.5">Seller Dashboard</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleSellerDisband}
            disabled={disbandSellerMutation.isPending}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md bg-[#FBE9E5] border border-[#A23B2E]/30 hover:bg-[#F3D8D2] text-[#A23B2E] text-xs font-bold transition disabled:opacity-50"
          >
            <ShieldAlert className="w-4 h-4" />
            {disbandSellerMutation.isPending ? "Disbanding..." : "Disband Seller Account"}
          </button>
          <Link
            to="/seller/products/new"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-[#C17817] hover:bg-[#211E1B] text-white text-xs font-bold shadow-md shadow-none transition"
          >
            <Plus className="w-4 h-4" />
            List New Equipment
          </Link>
        </div>
      </div>

      <div className="rounded-md border border-[#C17817]/30 bg-[#F1ECE1] p-4 text-xs text-[#C17817]">
        Disbanding changes your account back to customer status immediately. Any active or draft listings will be taken offline. You must settle all pending, confirmed, active, or return-requested rentals first.
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-md border border-[#C8C0B3] p-6 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wider text-[#A39A8D]">Total Revenue</div>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#211E1B] mt-1">{formatCurrency(metrics?.totalEarnings ?? 0)}</div>
          <p className="text-[11px] text-[#4B5D3A] font-medium mt-1">Earned to date</p>
        </div>
        <div className="bg-white rounded-md border border-[#C8C0B3] p-6 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wider text-[#A39A8D]">Active Rented Items</div>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#211E1B] mt-1">{metrics?.activeRentalsCount ?? 0}</div>
          <p className="text-[11px] text-[#C17817] font-medium mt-1">Currently with renters</p>
        </div>
        <div className="bg-white rounded-md border border-[#C8C0B3] p-6 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wider text-[#A39A8D]">Awaiting Customer Payment</div>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#211E1B] mt-1">{metrics?.pendingRequestsCount ?? 0}</div>
          <p className="text-[11px] text-[#C17817] font-medium mt-1">Payment window is active</p>
        </div>
        <div className="bg-white rounded-md border border-[#C8C0B3] p-6 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wider text-[#A39A8D]">Equipment Listed</div>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#211E1B] mt-1">{metrics?.totalProducts ?? 0}</div>
          <p className="text-[11px] text-[#8B8377] font-medium mt-1">Your live catalog</p>
        </div>
      </div>


      <div className="bg-white rounded-md border border-[#C8C0B3] p-6 shadow-sm space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-[#211E1B]">Your Equipment Listings</h3>
            <p className="text-xs text-[#8B8377] mt-1">Pause a listing when you do not want new rentals without deleting it.</p>
          </div>
          <Link to="/seller/products/new" className="text-xs font-semibold text-[#C17817] hover:underline flex items-center gap-1">
            <Plus className="w-3.5 h-3.5" />
            Add New
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-2">
          <div className="relative">
            <Search className="w-4 h-4 text-[#A39A8D] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={productSearch}
              onChange={(event) => setProductSearch(event.target.value)}
              placeholder="Search your equipment, brand, or model"
              className="w-full pl-9 pr-3 py-2.5 rounded-md border border-[#C8C0B3] bg-[#F1ECE1] text-xs outline-none focus:border-[#C17817]"
            />
          </div>
          <select
            value={productStatusFilter}
            onChange={(event) => setProductStatusFilter(event.target.value as typeof productStatusFilter)}
            className="px-3 py-2.5 rounded-md border border-[#C8C0B3] bg-white text-xs"
          >
            <option value="all">All listing statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Paused</option>
            <option value="draft">Draft</option>
            <option value="suspended">Admin suspended</option>
          </select>
        </div>

        {productsLoading ? (
          <div className="h-32 rounded-md bg-[#E8E1D5] animate-pulse" />
        ) : myProducts.length === 0 ? (
          <div className="text-center py-10 text-xs text-[#A39A8D]">You haven't listed any equipment yet.</div>
        ) : filteredProducts.length === 0 ? (
          <div className="py-10 text-center text-xs text-[#A39A8D]">No listings match your current search or status filter.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[#E6DED1] text-[#A39A8D] font-bold uppercase tracking-wider">
                <tr>
                  <th className="pb-3">Equipment</th>
                  <th className="pb-3">Category</th>
                  <th className="pb-3">Rate</th>
                  <th className="pb-3">Performance</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E6DED1] text-[#514B44]">
                {filteredProducts.map((product, index) => {
                  const productId = getEntityId(product);
                  const rowKey = productId || (product.slug || product.name || "product") + "-" + index;
                  const canToggleStatus = product.status === "active" || product.status === "inactive" || product.status === "draft";
                  return (
                    <tr key={rowKey} className="hover:bg-[#F1ECE1]/60">
                      <td className="py-3 font-semibold text-[#211E1B]">{product.name}</td>
                      <td className="py-3 text-[#8B8377]">{product.category?.name || "—"}</td>
                      <td className="py-3 font-bold text-[#211E1B]">{product.pricing?.dailyRate ? formatCurrency(product.pricing.dailyRate) : "—"}</td>
                      <td className="py-3 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 text-[#C17817]"><Star className="w-3 h-3" />{Number(product.averageRating || 0).toFixed(1)}</span>
                        <span className="text-[#8B8377] ml-2">{product.totalRentals || 0} rentals</span>
                        <span className="text-[#A39A8D] ml-2">{product.viewCount || 0} views</span>
                      </td>
                      <td className="py-3">
                        <span className={"capitalize px-2 py-0.5 rounded-md font-bold text-[11px] " + (
                          product.status === "active"
                            ? "bg-[#E7EFE2] text-[#4B5D3A]"
                            : product.status === "suspended"
                              ? "bg-[#FBE9E5] text-[#A23B2E]"
                              : "bg-[#E8E1D5] text-[#211E1B]"
                        )}>
                          {product.status}
                        </span>
                      </td>
                      <td className="py-3 text-right whitespace-nowrap">
                        <div className="flex justify-end items-center gap-3 flex-wrap">
                          <Link to={productId ? "/seller/products/" + productId + "/edit" : "#"} onClick={(event) => !productId && event.preventDefault()} className="text-[#C17817] hover:underline font-semibold text-[11px]">Edit</Link>
                          <Link to={productId ? "/products/" + productId : "#"} onClick={(event) => !productId && event.preventDefault()} className="text-[#8B8377] hover:underline text-[11px]">View</Link>
                          {productId && canToggleStatus && (
                            <button
                              type="button"
                              onClick={() => updateProductStatusMutation.mutate({
                                productId,
                                status: product.status === "active" ? "inactive" : "active",
                              })}
                              disabled={updateProductStatusMutation.isPending}
                              className={"inline-flex items-center gap-1 font-semibold text-[11px] disabled:opacity-40 " + (
                                product.status === "active" ? "text-[#A23B2E]" : "text-[#4B5D3A]"
                              )}
                            >
                              <Power className="w-3.5 h-3.5" />
                              {product.status === "active" ? "Pause" : "Activate"}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDeleteProduct(product)}
                            disabled={!productId || deleteProductMutation.isPending}
                            className="inline-flex items-center gap-1 text-[#A23B2E] disabled:opacity-40 font-semibold text-[11px]"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-md border border-[#C8C0B3] p-5 shadow-sm">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#A39A8D]">Catalog Views</div>
          <div className="text-2xl font-extrabold text-[#211E1B] mt-1">{totalViews}</div>
          <p className="text-[11px] text-[#8B8377] mt-1">Product detail views across your catalog</p>
        </div>
        <div className="bg-white rounded-md border border-[#C8C0B3] p-5 shadow-sm">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#A39A8D]">Recorded Rentals</div>
          <div className="text-2xl font-extrabold text-[#211E1B] mt-1">{totalRentals}</div>
          <p className="text-[11px] text-[#8B8377] mt-1">Rental activity across your listings</p>
        </div>
        <div className="bg-white rounded-md border border-[#C8C0B3] p-5 shadow-sm">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#A39A8D]">Catalog Rating</div>
          <div className="text-2xl font-extrabold text-[#211E1B] mt-1 inline-flex items-center gap-1">
            {averageRating.toFixed(1)}
            <Star className="w-4 h-4 text-[#C17817]" />
          </div>
          <p className="text-[11px] text-[#8B8377] mt-1">Average across rated listings</p>
        </div>
      </div>

      <div className="bg-white rounded-md border border-[#C8C0B3] p-6 shadow-sm space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-[#C17817]" />
            <div>
              <h3 className="text-lg font-bold text-[#211E1B]">Rental Bookings Management</h3>
              <p className="text-xs text-[#8B8377] mt-1">Search and filter rentals so the next action is easy to find.</p>
            </div>
          </div>
          <div className="text-[11px] text-[#8B8377]">Showing {filteredBookings.length} of {sellerBookings.length}</div>
        </div>

        {sellerBookings.length === 0 ? (
          <div className="text-center py-10 text-xs text-[#A39A8D]">No bookings received yet for your listed equipment.</div>
        ) : (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-2">
              <div className="relative">
                <Search className="w-4 h-4 text-[#A39A8D] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  value={bookingSearch}
                  onChange={(event) => setBookingSearch(event.target.value)}
                  placeholder="Search by customer or product"
                  className="w-full pl-9 pr-3 py-2.5 rounded-md border border-[#C8C0B3] bg-[#F1ECE1] text-xs outline-none focus:border-[#C17817]"
                />
              </div>
              <select
                value={bookingStatusFilter}
                onChange={(event) => setBookingStatusFilter(event.target.value as typeof bookingStatusFilter)}
                className="px-3 py-2.5 rounded-md border border-[#C8C0B3] bg-white text-xs"
              >
                <option value="all">All booking statuses</option>
                <option value="pending">Awaiting payment</option>
                <option value="confirmed">Confirmed</option>
                <option value="active">Active rental</option>
                <option value="return_requested">Return requested</option>
                <option value="returned">Returned</option>
                <option value="completed">Completed</option>
                <option value="rejected">Rejected</option>
                <option value="cancelled">Cancelled</option>
                <option value="disputed">Disputed</option>
                <option value="expired">Expired</option>
              </select>
            </div>

            {filteredBookings.length === 0 ? (
              <div className="py-10 text-center text-xs text-[#A39A8D]">No bookings match your current search or status filter.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-[#E6DED1] text-[#A39A8D] font-bold uppercase tracking-wider">
                    <tr>
                      <th className="pb-3">Customer</th>
                      <th className="pb-3">Rental Dates</th>
                      <th className="pb-3">Status</th>
                      <th className="pb-3">Earnings</th>
                      <th className="pb-3">Deposit</th>
                      <th className="pb-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E6DED1] text-[#514B44]">
                    {filteredBookings.map((booking, index) => {
                      const bookingId = getEntityId(booking);
                      const rowKey = bookingId || "booking-" + index;
                      const item = booking.bookingItems?.[0];
                      return (
                        <tr key={rowKey} className="hover:bg-[#F1ECE1]/60">
                          <td className="py-3 font-semibold text-[#211E1B]">{booking.customer?.name || "Customer"}</td>
                          <td className="py-3">{item ? formatDate(item.startDate) + " → " + formatDate(item.endDate) : "—"}</td>
                          <td className="py-3">
                            <span className="capitalize px-2 py-0.5 rounded-md font-bold text-[11px] bg-[#E8E1D5] text-[#211E1B]">
                              {booking.status === "pending" ? "Awaiting payment" : booking.status}
                            </span>
                          </td>
                          <td className="py-3 font-bold text-[#211E1B]">{formatCurrency(booking.totalRentalPrice)}</td>
                          <td className="py-3 text-[#4B5D3A] font-medium">{formatCurrency(booking.totalDeposit)}</td>
                          <td className="py-3 text-right whitespace-nowrap">
                            <div className="flex justify-end items-center gap-2 flex-wrap">
                              {bookingId && booking.status === "pending" && (
                                <button
                                  onClick={() => updateStatusMutation.mutate({ bookingId, status: "rejected" })}
                                  disabled={updateStatusMutation.isPending}
                                  className="px-2.5 py-1 rounded-lg bg-[#FBE9E5] text-[#A23B2E] hover:bg-[#F3D8D2] disabled:opacity-50 font-bold text-[11px]"
                                >
                                  Decline
                                </button>
                              )}
                              {bookingId && booking.status === "confirmed" && (
                                <button
                                  onClick={() => updateStatusMutation.mutate({ bookingId, status: "active" })}
                                  disabled={updateStatusMutation.isPending}
                                  className="px-2.5 py-1 rounded-lg bg-[#F1ECE1] text-[#C17817] hover:bg-[#E8E1D5] disabled:opacity-50 font-bold text-[11px]"
                                >
                                  Handover Gear
                                </button>
                              )}
                              {bookingId && booking.status === "return_requested" && (
                                <button
                                  onClick={() => updateStatusMutation.mutate({ bookingId, status: "returned" })}
                                  disabled={updateStatusMutation.isPending}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#4B5D3A] text-white hover:bg-[#211E1B] disabled:opacity-50 font-bold text-[11px]"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                  Mark Returned
                                </button>
                              )}
                              {bookingId && booking.status === "returned" && (
                                <button
                                  onClick={() => updateStatusMutation.mutate({ bookingId, status: "completed" })}
                                  disabled={updateStatusMutation.isPending}
                                  className="px-2.5 py-1 rounded-lg bg-[#4B5D3A] text-white hover:bg-[#211E1B] disabled:opacity-50 font-bold text-[11px]"
                                >
                                  Complete
                                </button>
                              )}
                              {bookingId && (
                                <Link to={"/bookings/" + bookingId} className="text-[#8B8377] hover:underline text-[11px]">
                                  Details
                                </Link>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
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
