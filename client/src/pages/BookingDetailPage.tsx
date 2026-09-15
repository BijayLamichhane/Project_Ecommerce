import React, { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/axios";
import { Booking } from "../types";
import { formatCurrency, formatDate, getErrorMessage } from "../lib/utils";
import { useAuth } from "../hooks/useAuth";
import { Calendar, Clock, ShieldCheck, CreditCard, RotateCcw, AlertTriangle, Star, MessageSquare, Send, X } from "lucide-react";

const statusLabel: Record<string, string> = { pending: "Payment Pending", confirmed: "Confirmed", active: "Active Rental", return_requested: "Return Requested", returned: "Returned", completed: "Completed", cancelled: "Cancelled", rejected: "Rejected" };
const lifecycleStatuses = ["pending", "confirmed", "active", "return_requested", "returned", "completed"];

export function BookingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [returnNotes, setReturnNotes] = useState("");
  const [returnCondition, setReturnCondition] = useState("like_new");
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [isQuestionOpen, setIsQuestionOpen] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewTitle, setReviewTitle] = useState("");
  const [reviewComment, setReviewComment] = useState("");
  const [question, setQuestion] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { data: booking, isLoading } = useQuery({ queryKey: ["booking", id], queryFn: async () => { const { data } = await api.get(`/bookings/${id}`); return data.data as Booking; }, enabled: !!id });
  const { data: paymentInfo } = useQuery({ queryKey: ["booking-payment", id], queryFn: async () => { const { data } = await api.get(`/payments/booking/${id}`); return data.data; }, enabled: !!id });

  const payMutation = useMutation({
    mutationFn: async () => {
      setErrorMsg(null);
      const { data } = await api.post("/payments/process", { bookingId: id, paymentMethod: "esewa" });
      const payment = data.data;
      if (!payment?.action || !payment?.fields) throw new Error("Payment gateway could not be initialized.");
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
    },
    onError: (err: any) => setErrorMsg(getErrorMessage(err, "Unable to start eSewa payment. Please try again.")),
  });

  const returnMutation = useMutation({ mutationFn: async () => { setErrorMsg(null); await api.post(`/bookings/${id}/return`, { condition: returnCondition, notes: returnNotes }); }, onSuccess: () => { setReturnNotes(""); queryClient.invalidateQueries({ queryKey: ["booking", id] }); queryClient.invalidateQueries({ queryKey: ["customer-stats"] }); }, onError: (err: any) => setErrorMsg(getErrorMessage(err, "Failed to submit the return request.")) });

  const reviewMutation = useMutation({
    mutationFn: async () => {
      setErrorMsg(null);
      const item = booking?.bookingItems?.[0];
      const productId = item?.productId || item?.product?.id || item?.product?._id;
      if (!productId || !id) throw new Error("This booking does not contain a reviewable product.");
      if (!reviewComment.trim() || reviewComment.trim().length < 5) throw new Error("Review must be at least 5 characters.");
      await api.post("/reviews", { productId, bookingId: id, rating: reviewRating, title: reviewTitle.trim() || undefined, comment: reviewComment.trim() });
    },
    onSuccess: () => { setIsReviewOpen(false); setReviewTitle(""); setReviewComment(""); setReviewRating(5); setErrorMsg(null); queryClient.invalidateQueries({ queryKey: ["booking", id] }); queryClient.invalidateQueries({ queryKey: ["customer-stats"] }); },
    onError: (err: any) => setErrorMsg(getErrorMessage(err, "Failed to submit your review.")),
  });

  const questionMutation = useMutation({
    mutationFn: async () => {
      setErrorMsg(null);
      const item = booking?.bookingItems?.[0];
      const productId = item?.productId || item?.product?.id || item?.product?._id;
      const recipientId = booking?.sellerId || booking?.seller?.id || booking?.seller?._id;
      if (!recipientId) throw new Error("The seller for this booking could not be found.");
      if (!question.trim()) throw new Error("Please enter your question.");
      const { data } = await api.post("/messages/start", { recipientId, productId, bookingId: id, initialMessage: question.trim() });
      return data.data;
    },
    onSuccess: () => { setQuestion(""); setIsQuestionOpen(false); navigate("/messages"); },
    onError: (err: any) => setErrorMsg(getErrorMessage(err, "Failed to send your question.")),
  });

  if (isLoading) return <div className="min-h-screen bg-slate-950 px-4 py-16"><div className="max-w-5xl mx-auto h-96 rounded-3xl bg-slate-900 border border-slate-800 animate-pulse" /></div>;
  if (!booking) return <div className="min-h-screen bg-slate-950 px-4 py-20 text-center text-slate-300"><h2 className="text-xl font-bold text-white">Booking not found</h2><Link to="/bookings" className="inline-block mt-4 text-sm font-semibold text-cyan-400 hover:text-cyan-300">Back to my bookings</Link></div>;

  const userId = user?.id || user?._id;
  const isCustomer = String(userId) === String(booking.customerId);
  const firstItem = booking.bookingItems?.[0];
  const product = firstItem?.product;
  const bookingId = booking.id || booking._id || "";
  const currentIndex = lifecycleStatuses.indexOf(booking.status);
  const canReview = isCustomer && ["returned", "completed"].includes(booking.status);
  const sellerName = booking.seller?.name || "Seller";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-7">
        {errorMsg && <div className="p-4 rounded-2xl bg-rose-950/60 border border-rose-800 text-sm text-rose-200 flex items-start gap-3"><AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0" /><span>{errorMsg}</span></div>}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 pb-5 border-b border-slate-800">
          <div><span className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider">Booking ID: {bookingId.substring(0, 13)}</span><h1 className="text-3xl font-extrabold text-white mt-1">Rental Details</h1><p className="text-xs text-slate-500 mt-1">Created {formatDate(booking.createdAt, "MMM d, yyyy h:mm a")}</p></div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-2 rounded-xl bg-cyan-950/70 border border-cyan-800 text-cyan-300 text-xs font-bold">{statusLabel[booking.status] || booking.status}</span>
            {booking.status === "pending" && isCustomer && <button onClick={() => payMutation.mutate()} disabled={payMutation.isPending} className="px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 text-xs font-extrabold shadow-lg shadow-cyan-500/20 transition flex items-center gap-2"><CreditCard className="w-4 h-4" />{payMutation.isPending ? "Opening eSewa..." : "Pay with eSewa"}</button>}
            {booking.status === "active" && isCustomer && <button onClick={() => returnMutation.mutate()} disabled={returnMutation.isPending} className="px-4 py-2.5 rounded-xl bg-violet-500 hover:bg-violet-400 disabled:opacity-50 text-white text-xs font-extrabold shadow-lg shadow-violet-500/20 transition flex items-center gap-2"><RotateCcw className="w-4 h-4" />{returnMutation.isPending ? "Requesting..." : "Request Return"}</button>}
            {canReview && <button onClick={() => setIsReviewOpen(true)} className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-extrabold transition flex items-center gap-2"><Star className="w-4 h-4" />Leave a Review</button>}
          </div>
        </div>
        <div className="bg-slate-900 rounded-3xl border border-slate-800 p-6 shadow-2xl shadow-black/20"><div className="flex items-center justify-between gap-3 mb-6"><div><h3 className="text-sm font-bold text-white">Rental Lifecycle</h3><p className="text-[11px] text-slate-500 mt-1">Track every stage of your rental</p></div><Clock className="w-5 h-5 text-cyan-400" /></div><div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">{["Booked", "Confirmed", "Active", "Return Requested", "Returned", "Completed"].map((label, index) => { const complete = currentIndex >= index && currentIndex !== -1 && !["cancelled", "rejected"].includes(booking.status); return <div key={label} className="space-y-2"><div className={`h-1.5 rounded-full ${complete ? "bg-cyan-400" : "bg-slate-800"}`} /><p className={`text-[11px] font-bold ${complete ? "text-white" : "text-slate-600"}`}>{label}</p></div>; })}</div></div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 bg-slate-900 rounded-3xl border border-slate-800 p-6 shadow-xl space-y-6">
            <div className="flex items-center justify-between"><h3 className="text-base font-bold text-white">Rented Item</h3>{product && <Link to={`/products/${product.id || product._id}`} className="text-xs font-bold text-cyan-400 hover:text-cyan-300">View listing</Link>}</div>
            {product ? <div className="flex items-start gap-4"><img src={product.images?.[0]?.url || "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400"} alt={product.name} className="w-24 h-24 rounded-2xl object-cover bg-slate-800 flex-shrink-0" /><div className="space-y-2 min-w-0"><Link to={`/products/${product.id || product._id}`} className="text-base font-bold text-white hover:text-cyan-300">{product.name}</Link>{firstItem && <div className="flex items-center gap-2 text-xs text-slate-400"><Calendar className="w-4 h-4 text-cyan-400" /><span>{formatDate(firstItem.startDate)} → {formatDate(firstItem.endDate)}</span><span>({firstItem.durationDays} days)</span></div>}{firstItem?.dailyRate && <p className="text-xs text-slate-300">Rate: <span className="font-bold text-cyan-300">{formatCurrency(firstItem.dailyRate)}</span> / day</p>}</div></div> : <p className="text-sm text-slate-500">Product information is unavailable.</p>}
            {booking.specialRequests && <div className="pt-5 border-t border-slate-800"><span className="text-xs font-bold text-slate-400">Special Notes</span><p className="text-sm text-slate-300 mt-1">{booking.specialRequests}</p></div>}
            {isCustomer && booking.sellerId && <div className="pt-5 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4"><div><p className="text-sm font-bold text-white">Have a question for {sellerName}?</p><p className="text-xs text-slate-500 mt-1">Ask about pickup, condition, timing, or your rental.</p></div><button onClick={() => setIsQuestionOpen(true)} className="px-4 py-2.5 rounded-xl bg-violet-500 hover:bg-violet-400 text-white text-xs font-extrabold transition flex items-center gap-2"><MessageSquare className="w-4 h-4" />Ask a Question</button></div>}
          </div>
          <div className="lg:col-span-5 bg-slate-900 rounded-3xl border border-slate-800 p-6 shadow-xl space-y-5"><h3 className="text-base font-bold text-white">Charges & Security Deposit</h3><div className="space-y-3 text-xs text-slate-400"><div className="flex justify-between"><span>Rental Charges</span><span className="font-bold text-white">{formatCurrency(booking.totalRentalPrice)}</span></div><div className="flex justify-between"><span>Service Fee</span><span className="font-bold text-white">{formatCurrency(booking.serviceFee)}</span></div>{Number(booking.deliveryFee) > 0 && <div className="flex justify-between"><span>Delivery</span><span className="font-bold text-white">{formatCurrency(booking.deliveryFee)}</span></div>}<div className="pt-3 border-t border-slate-800 flex justify-between text-sm font-extrabold"><span className="text-white">Rental Total</span><span className="text-cyan-300">{formatCurrency(booking.totalAmount)}</span></div></div><div className="p-4 rounded-2xl bg-emerald-950/50 border border-emerald-800/70"><div className="flex justify-between font-bold text-emerald-300"><span className="flex items-center gap-2"><ShieldCheck className="w-4 h-4" />Security Deposit</span><span>{formatCurrency(booking.totalDeposit)}</span></div><p className="text-[11px] text-emerald-500 mt-2">Status: <span className="font-bold capitalize">{paymentInfo?.deposit?.status || "Held"}</span></p></div></div>
        </div>
        {booking.status === "active" && isCustomer && <div className="bg-slate-900 rounded-3xl border border-slate-800 p-6"><h3 className="text-sm font-bold text-white">Return Handover Details</h3><div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4"><select value={returnCondition} onChange={(e) => setReturnCondition(e.target.value)} className="px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-sm text-slate-200 outline-none focus:border-cyan-500"><option value="like_new">Like New</option><option value="good">Good</option><option value="fair">Fair</option><option value="damaged">Damaged</option></select><input value={returnNotes} onChange={(e) => setReturnNotes(e.target.value)} placeholder="Optional return notes" className="px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-sm text-slate-200 placeholder:text-slate-600 outline-none focus:border-cyan-500" /></div><p className="text-[11px] text-slate-500 mt-3">Your return request will be reviewed by the seller before the booking is marked returned.</p></div>}
        {isReviewOpen && <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4"><div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5"><div className="flex items-center justify-between"><h3 className="text-lg font-bold text-white">Review this Rental</h3><button onClick={() => setIsReviewOpen(false)} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400"><X className="w-4 h-4" /></button></div><div><label className="text-xs font-bold text-slate-400">Rating</label><div className="flex gap-1 mt-2">{[1,2,3,4,5].map((star) => <button key={star} type="button" onClick={() => setReviewRating(star)} className="p-1"><Star className={`w-7 h-7 ${star <= reviewRating ? "fill-amber-400 text-amber-400" : "text-slate-700"}`} /></button>)}</div></div><input value={reviewTitle} onChange={(e) => setReviewTitle(e.target.value)} placeholder="Review headline (optional)" className="w-full px-4 py-3 text-sm bg-slate-950 border border-slate-700 rounded-xl text-white placeholder:text-slate-600 outline-none focus:border-cyan-500" /><textarea rows={4} value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} placeholder="Describe your rental experience..." className="w-full px-4 py-3 text-sm bg-slate-950 border border-slate-700 rounded-xl text-white placeholder:text-slate-600 outline-none focus:border-cyan-500" /><div className="flex justify-end gap-2"><button onClick={() => setIsReviewOpen(false)} className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:bg-slate-800">Cancel</button><button onClick={() => reviewMutation.mutate()} disabled={reviewMutation.isPending || reviewComment.trim().length < 5} className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-slate-950 text-xs font-extrabold">{reviewMutation.isPending ? "Submitting..." : "Submit Review"}</button></div></div></div>}
        {isQuestionOpen && <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4"><div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-5"><div className="flex items-center justify-between"><div><h3 className="text-lg font-bold text-white">Ask {sellerName} a Question</h3><p className="text-xs text-slate-500 mt-1">Your message will open a conversation in Messages.</p></div><button onClick={() => setIsQuestionOpen(false)} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400"><X className="w-4 h-4" /></button></div><textarea autoFocus rows={5} value={question} onChange={(e) => setQuestion(e.target.value)} maxLength={3000} placeholder="e.g. What time can I pick up the equipment?" className="w-full px-4 py-3 text-sm bg-slate-950 border border-slate-700 rounded-xl text-white placeholder:text-slate-600 outline-none focus:border-violet-500 resize-none" /><div className="flex items-center justify-between"><span className="text-[11px] text-slate-600">{question.length}/3000</span><div className="flex gap-2"><button onClick={() => setIsQuestionOpen(false)} className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:bg-slate-800">Cancel</button><button onClick={() => questionMutation.mutate()} disabled={questionMutation.isPending || !question.trim()} className="px-4 py-2.5 rounded-xl bg-violet-500 hover:bg-violet-400 disabled:opacity-50 text-white text-xs font-extrabold flex items-center gap-2"><Send className="w-4 h-4" />{questionMutation.isPending ? "Sending..." : "Send Question"}</button></div></div></div></div>}
      </div>
    </div>
  );
}
