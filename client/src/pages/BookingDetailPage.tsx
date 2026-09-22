import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/axios";
import { Booking } from "../types";
import { formatCurrency, getEntityId, formatDate, getErrorMessage } from "../lib/utils";
import { useAuth } from "../hooks/useAuth";
import { Calendar, Clock, ShieldCheck, CreditCard, RotateCcw, AlertTriangle, Star, MessageSquare, Send, X, LockKeyhole } from "lucide-react";

const statusLabel: Record<string, string> = { pending: "Payment Pending", confirmed: "Confirmed", active: "Active Rental", return_requested: "Return Requested", returned: "Returned", completed: "Completed", cancelled: "Cancelled", rejected: "Rejected", expired: "Hold Expired" };
const lifecycleStatuses = ["pending", "confirmed", "active", "return_requested", "returned", "completed"];
const formatHoldTime = (milliseconds: number) => {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
};

export function BookingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [returnNotes, setReturnNotes] = useState("");
  const [returnCondition, setReturnCondition] = useState("like_new");
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [isQuestionOpen, setIsQuestionOpen] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewTitle, setReviewTitle] = useState("");
  const [reviewComment, setReviewComment] = useState("");
  const [question, setQuestion] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [remainingHoldMs, setRemainingHoldMs] = useState<number | null>(null);
  const [isCancelPaymentOpen, setIsCancelPaymentOpen] = useState(false);
  const [isDisputeOpen, setIsDisputeOpen] = useState(false);
  const [disputeReason, setDisputeReason] = useState("");

  const { data: booking, isLoading } = useQuery({ queryKey: ["booking", id], queryFn: async () => { const { data } = await api.get(`/bookings/${id}`); return data.data as Booking; }, enabled: !!id });
  const reviewProductId = booking?.bookingItems?.[0]?.productId || getEntityId(booking?.bookingItems?.[0]?.product);
  const { data: productReviews } = useQuery({
    queryKey: ["booking-product-reviews", reviewProductId],
    queryFn: async () => (await api.get(`/reviews/product/${reviewProductId}`)).data.data,
    enabled: !!reviewProductId,
  });
  const { data: paymentInfo } = useQuery({ queryKey: ["booking-payment", id], queryFn: async () => { const { data } = await api.get(`/payments/booking/${id}`); return data.data; }, enabled: !!id });

  useEffect(() => {
    if (booking?.status !== "pending" || !booking.expiresAt) {
      setRemainingHoldMs(null);
      return;
    }

    const updateCountdown = () => {
      const remaining = Math.max(0, new Date(booking.expiresAt!).getTime() - Date.now());
      setRemainingHoldMs(remaining);

      if (remaining === 0 && id) {
        queryClient.invalidateQueries({ queryKey: ["booking", id] });
        queryClient.invalidateQueries({ queryKey: ["booking-payment", id] });
      }
    };

    updateCountdown();
    const timer = window.setInterval(updateCountdown, 1000);
    return () => window.clearInterval(timer);
  }, [booking?.status, booking?.expiresAt, id, queryClient]);

  const payMutation = useMutation({
    mutationFn: async (method: "esewa" | "card") => {
      setErrorMsg(null);
      const { data } = await api.post("/payments/process", { bookingId: id, paymentMethod: method });
      const payment = data.data;
      if (method === "esewa") {
        if (!payment?.action || !payment?.fields) throw new Error("eSewa payment gateway could not be initialized.");
        const form = document.createElement("form");
        form.method = "POST";
        form.action = payment.action;
        form.style.display = "none";
        Object.entries(payment.fields).forEach(([name, value]) => {
          const input = document.createElement("input");
          input.type = "hidden";
          input.name = name;
          input.value = String(value);
          form.appendChild(input);
        });
        document.body.appendChild(form);
        form.submit();
        return;
      }
      if (!payment?.payment_url) throw new Error("Debit/credit card gateway could not be initialized.");
      window.location.assign(payment.payment_url);
    },
    onError: (err: unknown) => {
      const message = getErrorMessage(err, "Unable to start payment. Please try again.");
      setErrorMsg(
        message.toLowerCase().includes("expired")
          ? "This booking hold expired. Please rebook the equipment for your dates."
          : message
      );
    },
  });

  const disputeMutation = useMutation({
    mutationFn: async () => {
      if (!id) throw new Error("Booking could not be found.");
      const reason = disputeReason.trim();
      if (reason.length < 3) throw new Error("Please explain the issue before raising a dispute.");
      await api.patch(`/bookings/${id}/status`, {
        status: "disputed",
        reason,
      });
    },
    onSuccess: () => {
      setIsDisputeOpen(false);
      setDisputeReason("");
      setErrorMsg(null);
      queryClient.invalidateQueries({ queryKey: ["booking", id] });
      queryClient.invalidateQueries({ queryKey: ["my-bookings"] });
      queryClient.invalidateQueries({ queryKey: ["customer-stats"] });
    },
    onError: (err: unknown) => setErrorMsg(getErrorMessage(err, "Failed to raise the dispute.")),
  });

  const cancelPaymentMutation = useMutation({
    mutationFn: async () => {
      setErrorMsg(null);
      if (!id) throw new Error("Booking could not be found.");
      await api.post(`/payments/booking/${id}/cancel`, {
        reason: "Payment cancelled by customer",
      });
    },
    onSuccess: () => {
      setIsCancelPaymentOpen(false);
      setErrorMsg(null);
      queryClient.invalidateQueries({ queryKey: ["booking", id] });
      queryClient.invalidateQueries({ queryKey: ["booking-payment", id] });
      queryClient.invalidateQueries({ queryKey: ["my-bookings"] });
      queryClient.invalidateQueries({ queryKey: ["pending-bookings-nav"] });
      queryClient.invalidateQueries({ queryKey: ["customer-stats"] });
    },
    onError: (err: unknown) => {
      setErrorMsg(getErrorMessage(err, "Failed to cancel the payment."));
    },
  });

  const returnMutation = useMutation({ mutationFn: async () => { setErrorMsg(null); await api.post(`/bookings/${id}/return`, { condition: returnCondition, notes: returnNotes }); }, onSuccess: () => { setReturnNotes(""); queryClient.invalidateQueries({ queryKey: ["booking", id] }); queryClient.invalidateQueries({ queryKey: ["customer-stats"] }); }, onError: (err: unknown) => setErrorMsg(getErrorMessage(err, "Failed to submit the return request.")) });

  const reviewMutation = useMutation({
    mutationFn: async () => {
      setErrorMsg(null);
      const item = booking?.bookingItems?.[0];
      const productId = item?.productId || getEntityId(item?.product);
      if (!productId || !id) throw new Error("This booking does not contain a reviewable product.");
      if (!reviewComment.trim() || reviewComment.trim().length < 5) throw new Error("Review must be at least 5 characters.");

      const payload = {
        rating: reviewRating,
        title: reviewTitle.trim() || undefined,
        comment: reviewComment.trim(),
      };

      if (editingReviewId) {
        await api.patch(`/reviews/${editingReviewId}`, payload);
      } else {
        await api.post("/reviews", { productId, bookingId: id, ...payload });
      }
    },
    onSuccess: () => {
      setIsReviewOpen(false);
      setEditingReviewId(null);
      setReviewTitle("");
      setReviewComment("");
      setReviewRating(5);
      setErrorMsg(null);
      queryClient.invalidateQueries({ queryKey: ["booking", id] });
      queryClient.invalidateQueries({ queryKey: ["customer-stats"] });
      queryClient.invalidateQueries({ queryKey: ["booking-product-reviews", reviewProductId] });
      queryClient.invalidateQueries({ queryKey: ["product-reviews", reviewProductId] });
      queryClient.invalidateQueries({ queryKey: ["product", reviewProductId] });
    },
    onError: (err: unknown) => setErrorMsg(getErrorMessage(err, "Failed to save your review.")),
  });

  const questionMutation = useMutation({
    mutationFn: async () => {
      setErrorMsg(null);
      const item = booking?.bookingItems?.[0];
      const productId = item?.productId || getEntityId(item?.product);
      const recipientId = booking?.sellerId || getEntityId(booking?.seller);
      if (!recipientId) throw new Error("The seller for this booking could not be found.");
      if (!question.trim()) throw new Error("Please enter your question.");
      const { data } = await api.post("/messages/start", { recipientId, productId, bookingId: id, initialMessage: question.trim() });
      return data.data;
    },
    onSuccess: () => { setQuestion(""); setIsQuestionOpen(false); navigate("/messages"); },
    onError: (err: unknown) => setErrorMsg(getErrorMessage(err, "Failed to send your question.")),
  });

  if (isLoading) return <div className="min-h-screen bg-[var(--background)] px-4 py-16"><div className="max-w-5xl mx-auto h-96 rounded-md bg-[#E8E1D5] border border-[#DDD5C7] animate-pulse" /></div>;
  if (!booking) return <div className="min-h-screen bg-[var(--background)] px-4 py-20 text-center text-[#514B44]"><h2 className="text-xl font-bold text-[#211E1B]">Booking not found</h2><Link to="/bookings" className="inline-block mt-4 text-sm font-semibold text-[#C17817] hover:text-[#A66314]">Back to my bookings</Link></div>;

  const userId = getEntityId(user);
  const isCustomer = String(userId) === String(booking.customerId);
  const isSeller = String(userId) === String(booking.sellerId);
  const canRaiseDispute =
    (isCustomer || isSeller) &&
    ["active", "return_requested", "returned"].includes(booking.status);
  const firstItem = booking.bookingItems?.[0];
  const product = firstItem?.product;
  const bookingId = getEntityId(booking);
  const currentIndex = lifecycleStatuses.indexOf(booking.status);
  const holdExpired = booking.status === "expired" || (booking.status === "pending" && remainingHoldMs === 0);
  const canReview = isCustomer && ["returned", "completed"].includes(booking.status);
  const existingReview = productReviews?.find((review: { reviewerId?: string }) => String(review.reviewerId) === String(userId));
  const sellerName = booking.seller?.name || "Seller";

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-7">
        {errorMsg && <div className="p-4 rounded-md bg-[#FBE9E5] border border-[#A23B2E]/30 text-sm text-[#8F3328] flex items-start gap-3"><AlertTriangle className="w-5 h-5 text-[#A23B2E] flex-shrink-0" /><span>{errorMsg}</span></div>}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 pb-5 border-b border-[#DDD5C7]">
          <div><span className="text-[11px] font-bold text-[#C17817] font-mono">Booking ID: {bookingId.substring(0, 13)}</span><h1 className="text-3xl font-extrabold text-[#211E1B] mt-1">Rental Details</h1><p className="text-xs text-[#8B8377] mt-1">Created {formatDate(booking.createdAt, "MMM d, yyyy h:mm a")}</p></div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-2 rounded-md bg-[#F1E0C8] border border-[#C17817]/30 text-[#A66314] text-xs font-bold">{statusLabel[booking.status] || booking.status}</span>
            {booking.status === "pending" && isCustomer && !holdExpired && <div className="flex flex-wrap gap-2"><button onClick={() => payMutation.mutate("esewa")} disabled={payMutation.isPending || cancelPaymentMutation.isPending} className="px-4 py-2.5 rounded-md bg-[#C17817] hover:bg-[#A66314] disabled:opacity-50 text-[#211E1B] text-xs font-extrabold transition flex items-center gap-2"><CreditCard className="w-4 h-4" />{payMutation.isPending ? "Opening payment..." : "Pay with eSewa"}</button><button onClick={() => payMutation.mutate("card")} disabled={payMutation.isPending || cancelPaymentMutation.isPending} className="px-4 py-2.5 rounded-md bg-[#C17817] hover:bg-[#A66314] disabled:opacity-50 text-[#211E1B] text-xs font-extrabold transition flex items-center gap-2"><CreditCard className="w-4 h-4" />{payMutation.isPending ? "Opening payment..." : "Debit / Credit Card"}</button><button onClick={() => setIsCancelPaymentOpen(true)} disabled={payMutation.isPending || cancelPaymentMutation.isPending} className="px-4 py-2.5 rounded-md border border-[#A23B2E]/40 bg-white hover:bg-[#FBE9E5] disabled:opacity-50 text-[#A23B2E] text-xs font-extrabold transition flex items-center gap-2"><X className="w-4 h-4" />{cancelPaymentMutation.isPending ? "Cancelling..." : "Cancel Payment"}</button></div>}
            {booking.status === "active" && isCustomer && <button onClick={() => returnMutation.mutate()} disabled={returnMutation.isPending} className="px-4 py-2.5 rounded-md bg-[#C17817] hover:bg-[#A66314] disabled:opacity-50 text-[#211E1B] text-xs font-extrabold transition flex items-center gap-2"><RotateCcw className="w-4 h-4" />{returnMutation.isPending ? "Requesting..." : "Request Return"}</button>}
            {canReview && (
              <button
                onClick={() => {
                  setEditingReviewId(existingReview ? getEntityId(existingReview) : null);
                  setReviewRating(existingReview?.rating || 5);
                  setReviewTitle(existingReview?.title || "");
                  setReviewComment(existingReview?.comment || "");
                  setErrorMsg(null);
                  setIsReviewOpen(true);
                }}
                className="px-4 py-2.5 rounded-md bg-[#C17817] hover:bg-[#211E1B] text-[#211E1B] text-xs font-extrabold transition flex items-center gap-2"
              >
                <Star className="w-4 h-4" />
                {existingReview ? "Edit Review" : "Leave a Review"}
              </button>
            )}
          </div>
        </div>
        {booking.status === "pending" && isCustomer && !holdExpired && <div className="bg-white rounded-md border border-[#DDD5C7] p-5"><div className="flex items-start gap-3"><LockKeyhole className="w-5 h-5 text-[#4B5D3A] mt-0.5" /><div><p className="text-sm font-bold text-[#211E1B]">Complete payment within {remainingHoldMs !== null ? formatHoldTime(remainingHoldMs) : "—"}</p><p className="text-xs text-[#8B8377] mt-1">Your selected dates are temporarily held while you complete payment. RentHub never asks you to enter or store your full card number or CVV.</p></div></div></div>}
        {holdExpired && isCustomer && <div className="bg-white rounded-md border border-[#A23B2E]/30 p-5"><div className="flex items-start gap-3"><AlertTriangle className="w-5 h-5 text-[#A23B2E] mt-0.5" /><div><p className="text-sm font-bold text-[#211E1B]">This booking hold expired</p><p className="text-xs text-[#8B8377] mt-1">The payment window ended and these dates were released. Please rebook if you still need this equipment.</p>{firstItem?.productId && <Link to={`/products/${firstItem.productId}`} className="inline-block mt-3 text-xs font-bold text-[#C17817] hover:text-[#A66314]">Rebook these dates</Link>}</div></div></div>}
        <div className="bg-white rounded-md border border-[#DDD5C7] p-6"><div className="flex items-center justify-between gap-3 mb-6"><div><h3 className="text-sm font-bold text-[#211E1B]">Rental Lifecycle</h3><p className="text-[11px] text-[#8B8377] mt-1">Track every stage of your rental</p></div><Clock className="w-5 h-5 text-[#C17817]" /></div><div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">{["Booked", "Confirmed", "Active", "Return Requested", "Returned", "Completed"].map((label, index) => { const complete = currentIndex >= index && currentIndex !== -1 && !["cancelled", "rejected"].includes(booking.status); return <div key={label} className="space-y-2"><div className={`h-1.5 rounded-full ${complete ? "bg-[#C17817]" : "bg-[#E8E1D5]"}`} /><p className={`text-[11px] font-bold ${complete ? "text-[#211E1B]" : "text-[#8B8377]"}`}>{label}</p></div>; })}</div></div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 bg-white rounded-md border border-[#DDD5C7] p-6  space-y-6">
            <div className="flex items-center justify-between"><h3 className="text-base font-bold text-[#211E1B]">Rented Item</h3>{product && <Link to={`/products/${getEntityId(product)}`} className="text-xs font-bold text-[#C17817] hover:text-[#A66314]">View listing</Link>}</div>
            {product ? <div className="flex items-start gap-4"><img src={product.images?.[0]?.url || "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400"} alt={product.name} className="w-24 h-24 rounded-md object-cover bg-[#E8E1D5] flex-shrink-0" /><div className="space-y-2 min-w-0"><Link to={`/products/${getEntityId(product)}`} className="text-base font-bold text-[#211E1B] hover:text-[#A66314]">{product.name}</Link>{firstItem && <div className="flex items-center gap-2 text-xs text-[#8B8377]"><Calendar className="w-4 h-4 text-[#C17817]" /><span>{formatDate(firstItem.startDate)} → {formatDate(firstItem.endDate)}</span><span>({firstItem.durationDays} days)</span></div>}{firstItem?.dailyRate && <p className="text-xs text-[#514B44]">Rate: <span className="font-bold text-[#A66314]">{formatCurrency(firstItem.dailyRate)}</span> / day</p>}</div></div> : <p className="text-sm text-[#8B8377]">Product information is unavailable.</p>}
            {booking.specialRequests && <div className="pt-5 border-t border-[#DDD5C7]"><span className="text-xs font-bold text-[#8B8377]">Special Notes</span><p className="text-sm text-[#514B44] mt-1">{booking.specialRequests}</p></div>}
            {isCustomer && booking.sellerId && <div className="pt-5 border-t border-[#DDD5C7] flex flex-col sm:flex-row sm:items-center justify-between gap-4"><div><p className="text-sm font-bold text-[#211E1B]">Have a question for {sellerName}?</p><p className="text-xs text-[#8B8377] mt-1">Ask about pickup, condition, timing, or your rental.</p></div><button onClick={() => setIsQuestionOpen(true)} className="px-4 py-2.5 rounded-md bg-[#C17817] hover:bg-[#A66314] text-[#211E1B] text-xs font-extrabold transition flex items-center gap-2"><MessageSquare className="w-4 h-4" />Ask a Question</button></div>}
          </div>
          <div className="lg:col-span-5 bg-white rounded-md border border-[#DDD5C7] p-6  space-y-5"><h3 className="text-base font-bold text-[#211E1B]">Charges & Security Deposit</h3><div className="space-y-3 text-xs text-[#8B8377]"><div className="flex justify-between"><span>Rental Charges</span><span className="font-bold text-[#211E1B]">{formatCurrency(booking.totalRentalPrice)}</span></div><div className="flex justify-between"><span>Service Fee</span><span className="font-bold text-[#211E1B]">{formatCurrency(booking.serviceFee)}</span></div>{Number(booking.deliveryFee) > 0 && <div className="flex justify-between"><span>Delivery</span><span className="font-bold text-[#211E1B]">{formatCurrency(booking.deliveryFee)}</span></div>}<div className="pt-3 border-t border-[#DDD5C7] flex justify-between text-sm font-extrabold"><span className="text-[#211E1B]">Rental Total</span><span className="text-[#A66314]">{formatCurrency(booking.totalAmount)}</span></div></div><div className="p-4 rounded-md bg-[#E7EFE2] border border-[#4B5D3A]/30"><div className="flex justify-between font-bold text-[#4B5D3A]"><span className="flex items-center gap-2"><ShieldCheck className="w-4 h-4" />Security Deposit</span><span>{formatCurrency(booking.totalDeposit)}</span></div><p className="text-[11px] text-[#4B5D3A] mt-2">Status: <span className="font-bold capitalize">{paymentInfo?.deposit?.status || "Held"}</span></p></div></div>
        </div>
        {booking.status === "active" && isCustomer && <div className="bg-white rounded-md border border-[#DDD5C7] p-6"><h3 className="text-sm font-bold text-[#211E1B]">Return Handover Details</h3><div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4"><select value={returnCondition} onChange={(e) => setReturnCondition(e.target.value)} className="px-4 py-3 rounded-md bg-[#F7F3EA] border border-[#B8B0A3] text-sm text-[#211E1B] outline-none focus:border-[#C17817]"><option value="like_new">Like New</option><option value="good">Good</option><option value="fair">Fair</option><option value="damaged">Damaged</option></select><input value={returnNotes} onChange={(e) => setReturnNotes(e.target.value)} placeholder="Optional return notes" className="px-4 py-3 rounded-md bg-[#F7F3EA] border border-[#B8B0A3] text-sm text-[#211E1B] placeholder:text-[#8B8377] outline-none focus:border-[#C17817]" /></div><p className="text-[11px] text-[#8B8377] mt-3">Your return request will be reviewed by the seller before the booking is marked returned.</p></div>}
        {isCancelPaymentOpen && <div className="fixed inset-0 z-50 bg-[#211E1B]/75 flex items-center justify-center p-4">
          <div className="bg-white border border-[#DDD5C7] rounded-md p-6 max-w-md w-full shadow-sm space-y-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-[#211E1B]">Cancel Payment?</h3>
                <p className="text-xs text-[#8B8377] mt-1">This will cancel the pending booking and release the selected dates.</p>
              </div>
              <button onClick={() => setIsCancelPaymentOpen(false)} disabled={cancelPaymentMutation.isPending} className="p-2 rounded-lg hover:bg-[#E8E1D5] text-[#8B8377]"><X className="w-4 h-4" /></button>
            </div>
            <p className="text-sm text-[#514B44]">Any unfinished payment attempt will be cancelled. You can create a new booking later if you still need the equipment.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setIsCancelPaymentOpen(false)} disabled={cancelPaymentMutation.isPending} className="px-4 py-2.5 rounded-md text-xs font-bold text-[#8B8377] hover:bg-[#E8E1D5]">Keep Payment</button>
              <button onClick={() => cancelPaymentMutation.mutate()} disabled={cancelPaymentMutation.isPending} className="px-4 py-2.5 rounded-md bg-[#A23B2E] hover:bg-[#8F3328] disabled:opacity-50 text-white text-xs font-extrabold">{cancelPaymentMutation.isPending ? "Cancelling..." : "Cancel Payment"}</button>
            </div>
          </div>
        </div>}
        {isReviewOpen && <div className="fixed inset-0 z-50 bg-[#211E1B]/75 flex items-center justify-center p-4"><div className="bg-white border border-[#DDD5C7] rounded-md p-6 max-w-md w-full shadow-sm space-y-5"><div className="flex items-center justify-between"><h3 className="text-lg font-bold text-[#211E1B]">{editingReviewId ? "Edit Your Review" : "Review this Rental"}</h3><button onClick={() => setIsReviewOpen(false)} className="p-2 rounded-lg hover:bg-[#E8E1D5] text-[#8B8377]"><X className="w-4 h-4" /></button></div><div><label className="text-xs font-bold text-[#8B8377]">Rating</label><div className="flex gap-1 mt-2">{[1,2,3,4,5].map((star) => <button key={star} type="button" onClick={() => setReviewRating(star)} className="p-1"><Star className={`w-7 h-7 ${star <= reviewRating ? "fill-[#C17817] text-[#C17817]" : "text-[#B8B0A3]"}`} /></button>)}</div></div><input value={reviewTitle} onChange={(e) => setReviewTitle(e.target.value)} placeholder="Review headline (optional)" className="w-full px-4 py-3 text-sm bg-[#F7F3EA] border border-[#B8B0A3] rounded-md text-[#211E1B] placeholder:text-[#8B8377] outline-none focus:border-[#C17817]" /><textarea rows={4} value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} placeholder="Describe your rental experience..." className="w-full px-4 py-3 text-sm bg-[#F7F3EA] border border-[#B8B0A3] rounded-md text-[#211E1B] placeholder:text-[#8B8377] outline-none focus:border-[#C17817]" /><div className="flex justify-end gap-2"><button onClick={() => setIsReviewOpen(false)} className="px-4 py-2.5 rounded-md text-xs font-bold text-[#8B8377] hover:bg-[#E8E1D5]">Cancel</button><button onClick={() => reviewMutation.mutate()} disabled={reviewMutation.isPending || reviewComment.trim().length < 5} className="px-4 py-2.5 rounded-md bg-[#C17817] hover:bg-[#A66314] disabled:opacity-50 text-[#211E1B] text-xs font-extrabold">{reviewMutation.isPending ? "Saving..." : editingReviewId ? "Save Changes" : "Submit Review"}</button></div></div></div>}
        {isQuestionOpen && <div className="fixed inset-0 z-50 bg-[#211E1B]/75 flex items-center justify-center p-4"><div className="bg-white border border-[#DDD5C7] rounded-md p-6 max-w-lg w-full shadow-sm space-y-5"><div className="flex items-center justify-between"><div><h3 className="text-lg font-bold text-[#211E1B]">Ask {sellerName} a Question</h3><p className="text-xs text-[#8B8377] mt-1">Your message will open a conversation in Messages.</p></div><button onClick={() => setIsQuestionOpen(false)} className="p-2 rounded-lg hover:bg-[#E8E1D5] text-[#8B8377]"><X className="w-4 h-4" /></button></div><textarea autoFocus rows={5} value={question} onChange={(e) => setQuestion(e.target.value)} maxLength={3000} placeholder="e.g. What time can I pick up the equipment?" className="w-full px-4 py-3 text-sm bg-[#F7F3EA] border border-[#B8B0A3] rounded-md text-[#211E1B] placeholder:text-[#8B8377] outline-none focus:border-[#C17817] resize-none" /><div className="flex items-center justify-between"><span className="text-[11px] text-[#8B8377]">{question.length}/3000</span><div className="flex gap-2"><button onClick={() => setIsQuestionOpen(false)} className="px-4 py-2.5 rounded-md text-xs font-bold text-[#8B8377] hover:bg-[#E8E1D5]">Cancel</button><button onClick={() => questionMutation.mutate()} disabled={questionMutation.isPending || !question.trim()} className="px-4 py-2.5 rounded-md bg-[#C17817] hover:bg-[#A66314] disabled:opacity-50 text-[#211E1B] text-xs font-extrabold flex items-center gap-2"><Send className="w-4 h-4" />{questionMutation.isPending ? "Sending..." : "Send Question"}</button></div></div></div></div>}
      </div>
    </div>
  );
}
