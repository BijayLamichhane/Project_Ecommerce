import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/axios";
import { Product, Review, RentalPriceCalculation } from "../types";
import { RentalCalendar } from "../components/shared/RentalCalendar";
import { PriceSummary } from "../components/shared/PriceSummary";
import { RecommendedProducts } from "../components/shared/RecommendedProducts";
import { formatCurrency, getEntityId, formatDate, getErrorMessage } from "../lib/utils";
import { useAuth } from "../hooks/useAuth";
import { useSocket } from "../hooks/useSocket";
import {
  Star,
  ShieldCheck,
  MapPin,
  MessageSquare,
  Sparkles,
  CheckCircle,
  AlertCircle,
  Clock,
  Heart,
  ShoppingCart,
  Zap,
  Info,
  Flag,
  X,
} from "lucide-react";

export function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const socket = useSocket();

  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [availabilityMonth, setAvailabilityMonth] = useState(() => new Date());
  const [quantity, setQuantity] = useState(1);
  const [isSubmittingBooking, setIsSubmittingBooking] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [cartAdded, setCartAdded] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewTitle, setReviewTitle] = useState("");
  const [reviewComment, setReviewComment] = useState("");
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [reviewSuccess, setReviewSuccess] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("Inaccurate or misleading listing");
  const [reportDetails, setReportDetails] = useState("");
  const [reportError, setReportError] = useState<string | null>(null);
  const [reportSuccess, setReportSuccess] = useState(false);

  // 1. Fetch Product
  const { data: product, isLoading: loadingProduct } = useQuery({
    queryKey: ["product", id],
    queryFn: async () => {
      const { data } = await api.get(`/products/${id}`);
      return data.data as Product;
    },
    enabled: !!id,
  });

  // 2. Fetch Availability / Booked ranges
  const { data: bookedRanges } = useQuery({
    queryKey: [
      "product-availability",
      id,
      availabilityMonth.getFullYear(),
      availabilityMonth.getMonth() + 1,
    ],
    queryFn: async () => {
      const year = availabilityMonth.getFullYear();
      const month = availabilityMonth.getMonth() + 1;
      const { data } = await api.get(
        `/bookings/availability/${id}?year=${year}&month=${month}`
      );
      return data.data || [];
    },
    enabled: !!id,
  });

  const currentBookingRange = (bookedRanges || []).find((range: { startDate: string; endDate: string }) => {
    const now = new Date();
    return (
      new Date(range.startDate) <= now &&
      now < new Date(range.endDate)
    );
  });

  useEffect(() => {
    if (!socket || !id) return;

    socket.emit("join_product", id);
    const onAvailabilityChanged = (payload: { productId?: string }) => {
      if (!payload?.productId || String(payload.productId) === String(id)) {
        queryClient.invalidateQueries({ queryKey: ["product-availability", id] });
      }
    };

    socket.on("availability_changed", onAvailabilityChanged);
    return () => {
      socket.off("availability_changed", onAvailabilityChanged);
      socket.emit("leave_product", id);
    };
  }, [socket, id, queryClient]);

  // 3. Fetch Product Reviews
  const { data: reviews } = useQuery({
    queryKey: ["product-reviews", id],
    queryFn: async () => {
      const { data } = await api.get(`/reviews/product/${id}`);
      return data.data as Review[];
    },
    enabled: !!id,
  });

  // 4. Calculate Dynamic Rental Price on Date Range Selection
  const { data: priceCalculation, isLoading: calculatingPrice } = useQuery({
    queryKey: ["price-calculation", id, startDate?.toISOString(), endDate?.toISOString()],
    queryFn: async () => {
      if (!startDate || !endDate || !id) return null;
      const { data } = await api.get(
        `/bookings/price-estimate?productId=${id}&startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
      );
      return data.data as RentalPriceCalculation;
    },
    enabled: !!startDate && !!endDate && !!id,
  });

  // Redirects to login, remembering this listing so the user lands back
  // here — rather than /cart or /dashboard — once they've signed in.
  const redirectToLogin = () => {
    navigate(`/login?redirect=${encodeURIComponent(`/products/${id}`)}`);
  };

  // Review Submission Mutation (from product detail page — no bookingId required)
  const submitReviewMutation = useMutation({
    mutationFn: async () => {
      setReviewError(null);
      const payload = {
        rating: reviewRating,
        title: reviewTitle.trim() || undefined,
        comment: reviewComment.trim(),
      };

      if (editingReviewId) {
        await api.patch(`/reviews/${editingReviewId}`, payload);
        return;
      }

      await api.post("/reviews", {
        productId: id,
        ...payload,
      });
    },
    onSuccess: () => {
      setReviewSuccess(true);
      setShowReviewForm(false);
      setEditingReviewId(null);
      setReviewTitle("");
      setReviewComment("");
      setReviewRating(5);
      queryClient.invalidateQueries({ queryKey: ["product-reviews", id] });
      queryClient.invalidateQueries({ queryKey: ["product", id] });
    },
    onError: (err: unknown) => {
      setReviewError(getErrorMessage(err, "Failed to submit review"));
    },
  });

  const reportMutation = useMutation({
    mutationFn: async () => {
      if (!id) throw new Error("Product could not be found.");
      const details = reportDetails.trim();
      await api.post("/reports", {
        targetType: "product",
        targetId: id,
        reason: reportReason,
        details: details || undefined,
      });
    },
    onSuccess: () => {
      setIsReportOpen(false);
      setReportDetails("");
      setReportError(null);
      setReportSuccess(true);
      window.setTimeout(() => setReportSuccess(false), 2500);
    },
    onError: (err: unknown) => {
      setReportError(getErrorMessage(err, "Failed to submit the report."));
    },
  });

  // Add to Cart Mutation
  const addToCartMutation = useMutation({
    mutationFn: async () => {
      if (!startDate || !endDate) {
        setBookingError("Please select both pickup and return dates on the calendar");
        return;
      }
      await api.post("/cart", {
        productId: id,
        quantity,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
      setCartAdded(true);
      window.setTimeout(() => setCartAdded(false), 1400);
    },
    onError: (err: unknown) => {
      setBookingError(getErrorMessage(err, "Failed to add item to cart"));
    },
  });

  // Direct Book / Instant Checkout Mutation
  const bookNowMutation = useMutation({
    mutationFn: async () => {
      if (!startDate || !endDate) {
        setBookingError("Please select both pickup and return dates");
        return;
      }
      setBookingError(null);
      const { data } = await api.post("/bookings", {
        items: [
          {
            productId: id,
            quantity,
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
          },
        ],
      });
      return data.data;
    },
    onSuccess: (booking) => {
      const bookingId = getEntityId(booking);
      if (bookingId) {
        navigate(`/bookings/${bookingId}`);
      }
    },
    onError: (err: unknown) => {
      setBookingError(getErrorMessage(err, "Booking creation failed"));
    },
  });

  if (loadingProduct) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 animate-pulse">
          <div className="h-[450px] bg-[#DDD5C7] rounded-md" />
          <div className="space-y-4">
            <div className="h-8 bg-[#DDD5C7] rounded-lg w-3/4" />
            <div className="h-4 bg-[#DDD5C7] rounded-lg w-1/2" />
            <div className="h-48 bg-[#DDD5C7] rounded-md" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center space-y-4">
        <h2 className="text-2xl font-bold text-[#211E1B]">Product not found</h2>
        <Link to="/products" className="text-sm font-semibold text-[#C17817]">
          Return to catalog
        </Link>
      </div>
    );
  }

  const images = product.images?.length > 0 ? product.images : [{ id: "1", url: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800", isPrimary: true, sortOrder: 0, productId: product.id }];
  const currentImage = images[selectedImageIndex]?.url || images[0]?.url;
  const deposit = product.pricing?.securityDeposit ? parseFloat(product.pricing.securityDeposit) : 0;
  const myReview = reviews?.find(
    (review) =>
      isAuthenticated &&
      user &&
      String(review.reviewerId) === String(user.id ?? user._id)
  );
  const hasReviewedProduct = Boolean(myReview);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
      {/* ─── Main Product Overview & Booking Widget ────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        {/* Left Column: Image Gallery & Details (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Main Large Image Display */}
          <div className="relative aspect-[4/3] rounded-md overflow-hidden bg-[#E8E1D5] border border-[#C8C0B3]/80 shadow-sm">
            <img
              src={currentImage}
              alt={product.name}
              className="w-full h-full object-cover"
            />
            {product.isFeatured && (
              <span className="absolute top-4 left-4 inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-[#F1ECE1]0 text-white shadow-md">
                <Sparkles className="w-3.5 h-3.5" />
                Featured Equipment
              </span>
            )}
          </div>

          {/* Thumbnails list */}
          {images.length > 1 && (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {images.map((img, idx) => (
                <button
                  key={img.id}
                  type="button"
                  onClick={() => setSelectedImageIndex(idx)}
                  className={`relative w-20 h-20 rounded-md overflow-hidden border-2 flex-shrink-0 transition ${
                    selectedImageIndex === idx
                      ? "border-[#C17817] shadow-sm"
                      : "border-[#C8C0B3] hover:border-[#B8B0A3] opacity-70 hover:opacity-100"
                  }`}
                >
                  <img src={img.url} alt={`Thumbnail ${idx}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}

          {/* Product Description */}
          <div className="pt-6 border-t border-[#C8C0B3] space-y-4">
            <h3 className="text-lg font-bold text-[#211E1B]">About this gear</h3>
            <p className="text-sm text-[#6F685F] leading-relaxed whitespace-pre-line">
              {product.description}
            </p>
          </div>

          {/* Rental Rules & Cancellation Policy */}
          <div className="pt-6 border-t border-[#C8C0B3] space-y-3">
            <h3 className="text-lg font-bold text-[#211E1B]">Rental Rules</h3>
            <ul className="space-y-2 text-sm text-[#6F685F]">
              {(product.rules?.rules || [
                "Valid ID proof required upon handover",
                "Handle with care and return in original protective case",
                "Late returns subject to daily extension charges",
              ]).map((rule, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-[#4B5D3A] mt-0.5 flex-shrink-0" />
                  <span>{rule}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Right Column: Booking Widget & Dynamic Pricing (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="sticky top-24 bg-white rounded-md border border-[#C8C0B3] p-6 shadow-sm space-y-6">
            {/* Header: Title, Rating, City */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-[#8B8377]">
                <span className="font-semibold uppercase tracking-wider text-[#C17817]">
                  {product.category?.name || "Rental"}
                </span>
                <div className="flex items-center gap-1 font-bold text-[#211E1B]">
                  <Star className="w-4 h-4 fill-[#C17817] text-[#C17817]" />
                  <span>{parseFloat(product.averageRating || "0").toFixed(1)}</span>
                  <span className="text-[#A39A8D] font-normal">
                    ({product.totalRatings} reviews)
                  </span>
                </div>
              </div>

              <h1 className="text-xl sm:text-2xl font-extrabold text-[#211E1B] leading-snug">
                {product.name}
              </h1>

              {product.city && (
                <div className="flex items-center gap-1.5 text-xs text-[#8B8377]">
                  <MapPin className="w-3.5 h-3.5 text-[#A39A8D]" />
                  <span>Available in {product.city}, Nepal</span>
                </div>
              )}
            </div>

            {/* Rates Banner */}
            <div className="p-4 rounded-md bg-[#F1ECE1]/70 border border-[#C17817]/30 flex items-baseline justify-between">
              <div>
                <span className="text-2xl font-extrabold text-[#211E1B]">
                  {formatCurrency(product.pricing?.dailyRate)}
                </span>
                <span className="text-xs text-[#C17817] font-medium"> / day</span>
              </div>

              {product.pricing?.weeklyRate && (
                <div className="text-right">
                  <div className="text-xs font-bold text-[#211E1B]">
                    {formatCurrency(product.pricing.weeklyRate)}
                  </div>
                  <div className="text-[10px] text-[#C17817]">weekly special rate</div>
                </div>
              )}
            </div>

            {/* Rental Calendar */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-[#6F685F]">
                Select Rental Dates
              </label>
              <RentalCalendar
                bookedRanges={bookedRanges}
                startDate={startDate}
                endDate={endDate}
                onMonthChange={setAvailabilityMonth}
                onChange={(start, end) => {
                  setStartDate(start);
                  setEndDate(end);
                }}
              />
              {currentBookingRange && (
                <div className="rounded-md border border-[#C17817]/30 bg-[#F1E0C8]/60 p-3">
                  <p className="text-xs font-semibold text-[#211E1B]">
                    Currently rented
                  </p>
                  <p className="text-[11px] text-[#6F685F] mt-1">
                    This product is scheduled to return on {formatDate(currentBookingRange.endDate)}. You can select that date or any later available date to reserve it in advance.
                  </p>
                </div>
              )}
            </div>

            {/* Error prompt */}
            {bookingError && (
              <div className="p-3 rounded-md bg-[#FBE9E5] border border-[#A23B2E]/30 text-xs text-[#A23B2E] flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-[#A23B2E] flex-shrink-0 mt-0.5" />
                <span>{bookingError}</span>
              </div>
            )}

            {/* Dynamic Price Breakdown Summary */}
            {priceCalculation && (
              <PriceSummary
                calculation={priceCalculation}
                securityDeposit={deposit}
              />
            )}

            {/* Action Buttons */}
            <div className="space-y-2 pt-2">
              <button
                type="button"
                disabled={!startDate || !endDate || bookNowMutation.isPending}
                onClick={() => (isAuthenticated ? bookNowMutation.mutate() : redirectToLogin())}
                className="w-full py-3.5 px-4 rounded-md bg-[#C17817] hover:bg-[#211E1B] disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm shadow-md shadow-none transition flex items-center justify-center gap-2"
              >
                <Zap className="w-4 h-4 fill-white" />
                {bookNowMutation.isPending ? "Securing Booking..." : "Book Now"}
              </button>

              <button
                type="button"
                disabled={!startDate || !endDate || addToCartMutation.isPending || cartAdded}
                onClick={() => (isAuthenticated ? addToCartMutation.mutate() : redirectToLogin())}
                className={`w-full py-3 px-4 rounded-md bg-[#F1E0C8] hover:bg-[#E8D2B0] disabled:opacity-50 disabled:cursor-not-allowed text-[#211E1B] font-semibold text-xs transition-all duration-200 flex items-center justify-center gap-2 ${cartAdded ? "ring-2 ring-[#C17817]/30" : ""}`}
              >
                {cartAdded ? (
                  <CheckCircle className="w-4 h-4 animate-bounce text-[#4B5D3A]" />
                ) : (
                  <ShoppingCart className="w-4 h-4" />
                )}
                {cartAdded ? "Added to Cart" : "Add to Rental Cart"}
              </button>
            </div>

            {/* Lender Contact */}
            {product.sellerId && (
              <div className="pt-4 border-t border-[#E6DED1] flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-[#DDD5C7] overflow-hidden flex items-center justify-center">
                    {product.seller?.avatarUrl ? (
                      <img
                        src={product.seller.avatarUrl}
                        alt={product.seller.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="font-bold text-[#6F685F]">
                        {product.seller?.name?.charAt(0)?.toUpperCase() || "L"}
                      </span>
                    )}
                  </div>
                  <span className="font-semibold text-[#514B44]">
                    {product.seller?.name || "Lender"}
                  </span>
                </div>
                <Link
                  to={`/messages?recipient=${product.sellerId}&product=${product.id}`}
                  className="text-[#C17817] font-bold hover:underline flex items-center gap-1"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  Ask Question
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── Customer Reviews Section ──────────────────────────── */}
      <section className="pt-10 border-t border-[#C8C0B3] space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="text-xl font-bold text-[#211E1B]">Customer Reviews</h3>
            <p className="text-xs text-[#8B8377] mt-0.5">
              Share your rental experience with this listing
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {isAuthenticated && String(product.sellerId) !== String(user?.id ?? user?._id) && (
              <button
                type="button"
                onClick={() => {
                  setBookingError(null);
                  setIsReportOpen(true);
                }}
                className="px-3 py-2 rounded-md border border-[#C8C0B3] bg-white hover:bg-[#F1ECE1] text-[#6F685F] text-xs font-bold transition flex items-center gap-1.5"
              >
                <Flag className="w-3.5 h-3.5" />
                Report Listing
              </button>
            )}
            <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#F1ECE1] border border-[#C17817]/30 text-[#211E1B] font-bold text-sm">
              <Star className="w-4 h-4 fill-[#C17817] text-[#C17817]" />
              <span>{parseFloat(product.averageRating || "0").toFixed(1)} / 5.0</span>
            </div>
            {isAuthenticated && user?.role !== "seller" && user?.role !== "admin" && reviews && (
              <button
                onClick={() => {
                  if (myReview) {
                    setEditingReviewId(getEntityId(myReview));
                    setReviewRating(myReview.rating);
                    setReviewTitle(myReview.title || "");
                    setReviewComment(myReview.comment);
                  } else {
                    setEditingReviewId(null);
                    setReviewRating(5);
                    setReviewTitle("");
                    setReviewComment("");
                  }
                  setReviewError(null);
                  setShowReviewForm((current) => !current);
                }}
                className="px-4 py-2 rounded-md bg-[#C17817] hover:bg-[#211E1B] text-white text-xs font-bold transition"
              >
                {showReviewForm ? "Cancel" : hasReviewedProduct ? "Edit Your Review" : "Write a Review"}
              </button>
            )}
          </div>
        </div>

        {reviewSuccess && (
          <div className="p-3 rounded-md bg-[#E7EFE2] border border-[#4B5D3A]/30 text-xs text-[#4B5D3A] font-medium">
            ✓ Your review has been submitted successfully. Thank you!
          </div>
        )}

        {showReviewForm && (
          <div className="bg-white rounded-md border border-[#C8C0B3] shadow-sm p-6 space-y-4">
            <h4 className="text-sm font-bold text-[#211E1B]">{editingReviewId ? "Edit Your Review" : "Write Your Review"}</h4>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#6F685F]">Rating *</label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setReviewRating(star)}
                    className="p-1 transition"
                  >
                    <Star
                      className={`w-6 h-6 ${
                        star <= reviewRating
                          ? "fill-[#C17817] text-[#C17817]"
                          : "text-[#DDD5C7]"
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#6F685F]">Review Headline (optional)</label>
              <input
                type="text"
                placeholder="e.g. Excellent condition, smooth pickup!"
                value={reviewTitle}
                onChange={(e) => setReviewTitle(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-[#F1ECE1] border border-[#C8C0B3] rounded-md outline-none focus:ring-2 focus:ring-[#C17817]/30"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#6F685F]">Your Experience *</label>
              <textarea
                rows={3}
                placeholder="Describe gear performance, lender communication, handover ease..."
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-[#F1ECE1] border border-[#C8C0B3] rounded-md outline-none focus:ring-2 focus:ring-[#C17817]/30"
              />
            </div>

            {reviewError && (
              <p className="text-xs text-[#A23B2E] font-medium">{reviewError}</p>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => { setShowReviewForm(false); setReviewError(null); }}
                className="px-4 py-2 text-xs font-semibold text-[#6F685F] hover:bg-[#E8E1D5] rounded-md"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => submitReviewMutation.mutate()}
                disabled={submitReviewMutation.isPending || reviewComment.trim().length < 5}
                className="px-4 py-2 text-xs font-bold text-white bg-[#C17817] hover:bg-[#211E1B] rounded-md shadow-md disabled:opacity-50"
              >
                {submitReviewMutation.isPending ? "Saving..." : editingReviewId ? "Save Changes" : "Submit Review"}
              </button>
            </div>
          </div>
        )}

        {reviews && reviews.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {reviews.map((rev) => (
              <div
                key={getEntityId(rev)}
                className="bg-white p-5 rounded-md border border-[#C8C0B3] shadow-sm space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-[#E8E1D5] flex items-center justify-center font-bold text-[#C17817] text-xs">
                      {rev.reviewer?.name?.charAt(0) || "U"}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-[#211E1B]">
                        {rev.reviewer?.name || "Verified Renter"}
                      </h4>
                      <span className="text-[10px] text-[#A39A8D]">
                        {formatDate(rev.createdAt)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`w-3.5 h-3.5 ${
                          i < rev.rating
                            ? "fill-[#C17817] text-[#C17817]"
                            : "text-[#DDD5C7]"
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {rev.title && (
                  <h5 className="text-xs font-bold text-[#211E1B]">{rev.title}</h5>
                )}

                <p className="text-xs text-[#6F685F] leading-relaxed">{rev.comment}</p>

                {rev.sellerResponse && (
                  <div className="mt-3 p-3 rounded-md bg-[#F1ECE1] border border-[#C8C0B3]/80 text-[11px] space-y-1">
                    <span className="font-bold text-[#211E1B]">Lender response:</span>
                    <p className="text-[#6F685F]">{rev.sellerResponse}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-[#F1ECE1] p-8 rounded-md border border-[#C8C0B3] text-center text-xs text-[#8B8377]">
            No reviews yet for this listing. Be the first to review!
          </div>
        )}
      </section>
      {isReportOpen && (
        <div className="fixed inset-0 z-50 bg-[#211E1B]/75 flex items-center justify-center p-4">
          <div className="bg-white border border-[#DDD5C7] rounded-md p-6 max-w-lg w-full shadow-sm space-y-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-[#211E1B]">Report Listing</h3>
                <p className="text-xs text-[#8B8377] mt-1">Tell the RentHub team what needs review.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsReportOpen(false)}
                disabled={reportMutation.isPending}
                className="p-2 rounded-lg hover:bg-[#E8E1D5] text-[#8B8377]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <select
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              disabled={reportMutation.isPending}
              className="w-full px-4 py-3 text-sm bg-[#F7F3EA] border border-[#B8B0A3] rounded-md text-[#211E1B] outline-none focus:border-[#C17817]"
            >
              <option>Inaccurate or misleading listing</option>
              <option>Prohibited or unsafe item</option>
              <option>Fraud or suspicious activity</option>
              <option>Incorrect pricing or availability</option>
              <option>Other policy concern</option>
            </select>
            <textarea
              rows={5}
              maxLength={2000}
              value={reportDetails}
              onChange={(e) => setReportDetails(e.target.value)}
              disabled={reportMutation.isPending}
              placeholder="Add details that will help the admin review this listing..."
              className="w-full px-4 py-3 text-sm bg-[#F7F3EA] border border-[#B8B0A3] rounded-md text-[#211E1B] placeholder:text-[#8B8377] outline-none focus:border-[#C17817] resize-none"
            />
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-[#8B8377]">{reportDetails.length}/2000</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsReportOpen(false)}
                  disabled={reportMutation.isPending}
                  className="px-4 py-2.5 rounded-md text-xs font-bold text-[#8B8377] hover:bg-[#E8E1D5]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => reportMutation.mutate()}
                  disabled={reportMutation.isPending}
                  className="px-4 py-2.5 rounded-md bg-[#211E1B] hover:bg-[#C17817] disabled:opacity-50 text-white text-xs font-extrabold"
                >
                  {reportMutation.isPending ? "Submitting..." : "Submit Report"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {reportSuccess && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#4B5D3A] text-white px-4 py-3 rounded-md shadow-sm text-xs font-bold">
          Report submitted for admin review.
        </div>
      )}

      <RecommendedProducts
        mode="similar"
        productId={id}
        title="You May Also Like"
        subtitle="Similar rental gear based on category, brand, location, and price"
        limit={4}
      />

    </div>
  );
}
