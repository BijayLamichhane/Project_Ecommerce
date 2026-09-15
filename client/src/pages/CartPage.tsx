import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/axios";
import { formatCurrency, formatDate } from "../lib/utils";
import {
  Trash2,
  Calendar,
  ShieldCheck,
  ArrowRight,
  ShoppingBag,
  Info,
} from "lucide-react";
import type { CartItem } from "../types";

export function CartPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: cartData, isLoading } = useQuery({
    queryKey: ["cart"],
    queryFn: async () => {
      const { data } = await api.get("/cart");
      return data.data;
    },
  });

  const removeItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      await api.delete(`/cart/${itemId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
    },
  });

  const clearCartMutation = useMutation({
    mutationFn: async () => {
      await api.delete("/cart");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
    },
  });

  const checkoutMutation = useMutation({
    mutationFn: async () => {
      if (!cartData?.items || cartData.items.length === 0) return;

      const itemsToBook = cartData.items.map((item: CartItem) => ({
        productId: item.productId,
        quantity: item.quantity,
        startDate: item.startDate,
        endDate: item.endDate,
      }));

      const { data } = await api.post("/bookings", {
        items: itemsToBook,
      });

      // Clear cart on successful booking
      await api.delete("/cart");
      return data.data;
    },
    onSuccess: (booking) => {
      const bookingId = booking?.id || booking?._id;
      if (bookingId) {
        queryClient.invalidateQueries({ queryKey: ["cart"] });
        navigate(`/bookings/${bookingId}`);
      }
    },
    onError: (err: any) => {
      const msg =
        err?.response?.data?.error?.message ||
        err?.message ||
        "Checkout failed. Please try again.";
      alert(msg);
    },
  });

  const items: CartItem[] = cartData?.items || [];
  const summary = cartData?.summary;

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16">
        <div className="h-64 bg-slate-100 rounded-3xl animate-pulse" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
          <ShoppingBag className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900">Your rental cart is empty</h2>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          Browse cameras, laptops, expedition packs, and tools with live availability calendars.
        </p>
        <Link
          to="/products"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 text-white text-xs font-bold shadow-md hover:bg-indigo-700 transition"
        >
          Explore Rental Gear
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Rental Cart</h1>
          <p className="text-xs text-slate-500">{items.length} item(s) selected</p>
        </div>
        <button
          onClick={() => clearCartMutation.mutate()}
          className="text-xs font-semibold text-rose-600 hover:underline"
        >
          Clear Cart
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Items List */}
        <div className="lg:col-span-8 space-y-4">
          {items.map((item) => {
            const primaryImage =
              item.product?.images?.[0]?.url ||
              "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400";
            const deposit = item.product?.pricing?.securityDeposit
              ? parseFloat(item.product.pricing.securityDeposit)
              : 0;

            return (
              <div
                key={item.id || item._id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col sm:flex-row gap-5 items-start sm:items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <img
                    src={primaryImage}
                    alt={item.product?.name}
                    className="w-20 h-20 rounded-xl object-cover bg-slate-100 flex-shrink-0"
                  />
                  <div className="space-y-1">
                    <Link
                      to={`/products/${item.productId}`}
                      className="text-sm font-bold text-slate-900 hover:text-indigo-600 line-clamp-1"
                    >
                      {item.product?.name}
                    </Link>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                      <span>
                        {formatDate(item.startDate)} → {formatDate(item.endDate)}
                      </span>
                    </div>
                    {deposit > 0 && (
                      <div className="text-[11px] font-medium text-emerald-700 flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Deposit: {formatCurrency(deposit * item.quantity)} (Refundable)
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-6 pt-3 sm:pt-0 border-t sm:border-0 border-slate-100">
                  <div className="text-right">
                    <div className="text-sm font-extrabold text-slate-900">
                      {formatCurrency(item.priceCalculation?.baseRentalPrice)}
                    </div>
                    <div className="text-[11px] text-slate-400">Rental fee</div>
                  </div>

                  <button
                    onClick={() => removeItemMutation.mutate(item.id || item._id)}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-4 bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-6">
          <h3 className="text-base font-bold text-slate-900">Rental Summary</h3>

          <div className="space-y-2 text-xs text-slate-600">
            <div className="flex justify-between">
              <span>Rental Charges</span>
              <span className="font-semibold text-slate-900">
                {formatCurrency(summary?.totalRentalPrice)}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Platform Service Fee</span>
              <span className="font-semibold text-slate-900">
                {formatCurrency(summary?.totalServiceFee)}
              </span>
            </div>
            {summary?.totalDeliveryFee > 0 && (
              <div className="flex justify-between">
                <span>Handover / Delivery</span>
                <span className="font-semibold text-slate-900">
                  {formatCurrency(summary?.totalDeliveryFee)}
                </span>
              </div>
            )}
            <div className="pt-2 border-t border-slate-200 flex justify-between font-bold text-sm text-slate-900">
              <span>Total Rental Cost</span>
              <span className="text-indigo-600">{formatCurrency(summary?.grandTotal)}</span>
            </div>
          </div>

          {/* Refundable Deposit Notice */}
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200/80 text-xs space-y-1">
            <div className="flex justify-between font-bold text-emerald-900">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Refundable Deposit
              </span>
              <span>{formatCurrency(summary?.totalDeposit)}</span>
            </div>
            <p className="text-[11px] text-emerald-700">
              Released back to your account when the equipment is returned safely.
            </p>
          </div>

          <div className="pt-3 border-t border-slate-200 flex items-baseline justify-between">
            <span className="text-xs text-slate-500">Total Authorization</span>
            <span className="text-xl font-extrabold text-slate-900">
              {formatCurrency(summary?.totalAuthorization)}
            </span>
          </div>

          <button
            onClick={() => checkoutMutation.mutate()}
            disabled={checkoutMutation.isPending}
            className="w-full py-3.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md shadow-indigo-200 transition flex items-center justify-center gap-2"
          >
            {checkoutMutation.isPending ? "Creating Booking..." : "Proceed to Checkout"}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
