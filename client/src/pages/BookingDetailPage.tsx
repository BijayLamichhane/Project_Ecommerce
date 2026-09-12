import React, { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/axios";
import { Booking, BookingStatus } from "../types";
import { formatCurrency, formatDate } from "../lib/utils";
import { useAuth } from "../hooks/useAuth";
import {
  Calendar,
  Clock,
  ShieldCheck,
  CreditCard,
  RotateCcw,
  CheckCircle,
  AlertTriangle,
  Star,
  MessageSquare,
  Sparkles,
} from "lucide-react";

export function BookingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [returnNotes, setReturnNotes] = useState("");
  const [returnCondition, setReturnCondition] = useState<string>("like_new");
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewTitle, setReviewTitle] = useState("");
  const [reviewComment, setReviewComment] = useState("");

  const { data: booking, isLoading } = useQuery({
    queryKey: ["booking", id],
    queryFn: async () => {
      const { data } = await api.get(`/bookings/${id}`);
      return data.data as Booking;
    },
    enabled: !!id,
  });

  const { data: paymentInfo } = useQuery({
    queryKey: ["booking-payment", id],
    queryFn: async () => {
      const { data } = await api.get(`/payments/booking/${id}`);
      return data.data;
    },
    enabled: !!id,
  });

  // Payment Mutation
  const payMutation = useMutation({
    mutationFn: async () => {
      await api.post("/payments/process", {
        bookingId: id,
        paymentMethod: "simulated_card",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["booking", id] });
      queryClient.invalidateQueries({ queryKey: ["booking-payment", id] });
    },
  });

  // Return Mutation
  const returnMutation = useMutation({
    mutationFn: async () => {
      await api.post(`/bookings/${id}/return`, {
        condition: returnCondition,
        notes: returnNotes,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["booking", id] });
    },
  });

  // Review Submission Mutation
  const reviewMutation = useMutation({
    mutationFn: async () => {
      const firstItem = booking?.bookingItems?.[0];
      if (!firstItem) return;
      await api.post("/reviews", {
        productId: firstItem.productId,
        bookingId: id,
        rating: reviewRating,
        title: reviewTitle,
        comment: reviewComment,
      });
    },
    onSuccess: () => {
      setIsReviewOpen(false);
      queryClient.invalidateQueries({ queryKey: ["booking", id] });
    },
  });

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="h-96 bg-slate-100 rounded-3xl animate-pulse" />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center space-y-4">
        <h2 className="text-xl font-bold text-slate-900">Booking not found</h2>
        <Link to="/bookings" className="text-sm font-semibold text-indigo-600">
          Back to my bookings
        </Link>
      </div>
    );
  }

  const isCustomer = user?.id === booking.customerId;
  const isSeller = user?.id === booking.sellerId;
  const firstItem = booking.bookingItems?.[0];
  const product = firstItem?.product;

  const steps = [
    { label: "Booked", status: "pending", date: booking.createdAt },
    { label: "Payment & Confirmed", status: "confirmed", date: booking.confirmedAt },
    { label: "Active Rental", status: "active", date: booking.activatedAt },
    { label: "Return Handover", status: "return_requested", date: booking.returnRequestedAt },
    { label: "Deposit Refunded", status: "completed", date: booking.completedAt },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider">
            Booking ID: {booking.id.substring(0, 13)}
          </span>
          <h1 className="text-2xl font-extrabold text-slate-900 mt-0.5">Rental Details</h1>
        </div>

        <div className="flex items-center gap-2">
          {booking.status === "pending" && isCustomer && (
            <button
              onClick={() => payMutation.mutate()}
              disabled={payMutation.isPending}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-200 transition flex items-center gap-2"
            >
              <CreditCard className="w-4 h-4" />
              {payMutation.isPending ? "Processing..." : "Authorize Payment Now"}
            </button>
          )}

          {booking.status === "active" && isCustomer && (
            <button
              onClick={() => returnMutation.mutate()}
              disabled={returnMutation.isPending}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Request Return Handover
            </button>
          )}

          {booking.status === "completed" && isCustomer && (
            <button
              onClick={() => setIsReviewOpen(true)}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition flex items-center gap-1.5"
            >
              <Star className="w-4 h-4" />
              Leave a Review
            </button>
          )}
        </div>
      </div>

      {/* ─── State Machine Timeline ────────────────────────────── */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-6">
          Rental Status Lifecycle
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          {steps.map((step, idx) => {
            const isCompleted =
              (step.status === "pending" && booking.status !== "rejected" && booking.status !== "cancelled") ||
              (step.status === "confirmed" && ["confirmed", "active", "return_requested", "returned", "completed"].includes(booking.status)) ||
              (step.status === "active" && ["active", "return_requested", "returned", "completed"].includes(booking.status)) ||
              (step.status === "return_requested" && ["return_requested", "returned", "completed"].includes(booking.status)) ||
              (step.status === "completed" && booking.status === "completed");

            return (
              <div key={idx} className="space-y-2">
                <div
                  className={`h-2 rounded-full transition ${
                    isCompleted ? "bg-indigo-600" : "bg-slate-100"
                  }`}
                />
                <div>
                  <h4
                    className={`text-xs font-bold ${
                      isCompleted ? "text-slate-900" : "text-slate-400"
                    }`}
                  >
                    {step.label}
                  </h4>
                  {step.date && (
                    <span className="text-[10px] text-slate-400">
                      {formatDate(step.date, "MMM d, h:mm a")}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── Item Details & Price Breakdown ───────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        <div className="md:col-span-7 bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-6">
          <h3 className="text-base font-bold text-slate-900">Rented Item</h3>

          {product && (
            <div className="flex items-start gap-4">
              <img
                src={product.images?.[0]?.url || "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400"}
                alt={product.name}
                className="w-24 h-24 rounded-2xl object-cover bg-slate-100 flex-shrink-0"
              />
              <div className="space-y-1">
                <Link
                  to={`/products/${product.id}`}
                  className="text-sm font-bold text-slate-900 hover:text-indigo-600"
                >
                  {product.name}
                </Link>
                {firstItem && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                    <span>
                      {formatDate(firstItem.startDate)} → {formatDate(firstItem.endDate)}
                    </span>
                    <span className="text-slate-400">({firstItem.durationDays} days)</span>
                  </div>
                )}
                {firstItem?.dailyRate && (
                  <div className="text-xs text-slate-700 font-medium">
                    Rate: {formatCurrency(firstItem.dailyRate)} / day
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Special Requests */}
          {booking.specialRequests && (
            <div className="pt-4 border-t border-slate-100 space-y-1 text-xs">
              <span className="font-bold text-slate-700">Special Notes:</span>
              <p className="text-slate-600">{booking.specialRequests}</p>
            </div>
          )}
        </div>

        {/* Financial Breakdown */}
        <div className="md:col-span-5 bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-slate-900">Charges & Security Deposit</h3>

          <div className="space-y-2 text-xs text-slate-600">
            <div className="flex justify-between">
              <span>Rental Charges</span>
              <span className="font-bold text-slate-900">
                {formatCurrency(booking.totalRentalPrice)}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Service Fee</span>
              <span className="font-bold text-slate-900">
                {formatCurrency(booking.serviceFee)}
              </span>
            </div>
            {Number(booking.deliveryFee) > 0 && (
              <div className="flex justify-between">
                <span>Delivery</span>
                <span className="font-bold text-slate-900">
                  {formatCurrency(booking.deliveryFee)}
                </span>
              </div>
            )}
            <div className="pt-2 border-t border-slate-100 flex justify-between font-bold text-sm text-slate-900">
              <span>Rental Total</span>
              <span className="text-indigo-600">{formatCurrency(booking.totalAmount)}</span>
            </div>
          </div>

          {/* Security deposit card */}
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200/80 text-xs space-y-1">
            <div className="flex justify-between font-bold text-emerald-900">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Security Deposit
              </span>
              <span>{formatCurrency(booking.totalDeposit)}</span>
            </div>
            <div className="text-[11px] text-emerald-700">
              Status: <span className="capitalize font-bold">{paymentInfo?.deposit?.status || "Held"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Review Modal ──────────────────────────────────────── */}
      {isReviewOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Review this Rental</h3>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-600">Rating</label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setReviewRating(star)}
                    className="p-1"
                  >
                    <Star
                      className={`w-6 h-6 ${
                        star <= reviewRating
                          ? "fill-amber-400 text-amber-400"
                          : "text-slate-200"
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600">Review Headline</label>
              <input
                type="text"
                placeholder="e.g. Flawless camera condition!"
                value={reviewTitle}
                onChange={(e) => setReviewTitle(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600">Your Experience</label>
              <textarea
                rows={3}
                placeholder="Describe gear performance, lender communication, handover ease..."
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsReviewOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => reviewMutation.mutate()}
                disabled={reviewMutation.isPending || !reviewComment}
                className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md"
              >
                {reviewMutation.isPending ? "Submitting..." : "Submit Review"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
