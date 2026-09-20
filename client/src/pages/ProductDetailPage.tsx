import React, { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/axios";
import { Product, Review, RentalPriceCalculation } from "../types";
import { RentalCalendar } from "../components/shared/RentalCalendar";
import { PriceSummary } from "../components/shared/PriceSummary";
import { formatCurrency, formatDate, getErrorMessage } from "../lib/utils";
import { useAuth } from "../hooks/useAuth";
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
} from "lucide-react";

export function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
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
    queryKey: ["product-availability", id],
    queryFn: async () => {
      const { data } = await api.get(`/bookings/availability/${id}`);
      return data.data || [];
    },
    enabled: !!id,
  });

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
      await api.post("/reviews", {
        productId: id,
        rating: reviewRating,
        title: reviewTitle || undefined,
        comment: reviewComment,
      });
    },
    onSuccess: () => {
      setReviewSuccess(true);
      setShowReviewForm(false);
      setReviewTitle("");
      setReviewComment("");
      setReviewRating(5);
      queryClient.invalidateQueries({ queryKey: ["product-reviews", id] });
      queryClient.invalidateQueries({ queryKey: ["product", id] });
    },
    onError: (err: any) => {
      setReviewError(getErrorMessage(err, "Failed to submit review"));
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
    onError: (err: any) => {
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
      const bookingId = booking?.id || booking?._id;
      if (bookingId) {
        navigate(`/bookings/${bookingId}`);
      }
    },
    onError: (err: any) => {
      setBookingError(getErrorMessage(err, "Booking creation failed"));
    },
  });

  if (loadingProduct) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 animate-pulse">
          <div className="h-[450px] bg-slate-200 rounded-3xl" />
          <div className="space-y-4">
            <div className="h-8 bg-slate-200 rounded-lg w-3/4" />
            <div className="h-4 bg-slate-200 rounded-lg w-1/2" />
            <div className="h-48 bg-slate-200 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center space-y-4">
        <h2 className="text-2xl font-bold text-slate-900">Product not found</h2>
        <Link to="/products" className="text-sm font-semibold text-indigo-600">
          Return to catalog
        </Link>
      </div>
    );
  }

  const images = product.images?.length > 0 ? product.images : [{ id: "1", url: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800", isPrimary: true, sortOrder: 0, productId: product.id }];
  const currentImage = images[selectedImageIndex]?.url || images[0]?.url;
  const deposit = product.pricing?.securityDeposit ? parseFloat(product.pricing.securityDeposit) : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
      {/* ─── Main Product Overview & Booking Widget ────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        {/* Left Column: Image Gallery & Details (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Main Large Image Display */}
          <div className="relative aspect-[4/3] rounded-3xl overflow-hidden bg-slate-100 border border-slate-200/80 shadow-sm">
            <img
              src={currentImage}
              alt={product.name}
              className="w-full h-full object-cover"
            />
            {product.isFeatured && (
              <span className="absolute top-4 left-4 inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-500 text-white shadow-md">
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
                  className={`relative w-20 h-20 rounded-xl overflow-hidden border-2 flex-shrink-0 transition ${
                    selectedImageIndex === idx
                      ? "border-indigo-600 shadow-sm"
                      : "border-slate-200 hover:border-slate-300 opacity-70 hover:opacity-100"
                  }`}
                >
                  <img src={img.url} alt={`Thumbnail ${idx}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}

          {/* Product Description */}
          <div className="pt-6 border-t border-slate-200 space-y-4">
            <h3 className="text-lg font-bold text-slate-900">About this gear</h3>
            <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
              {product.description}
            </p>
          </div>

          {/* Rental Rules & Cancellation Policy */}
          <div className="pt-6 border-t border-slate-200 space-y-3">
            <h3 className="text-lg font-bold text-slate-900">Rental Rules</h3>
            <ul className="space-y-2 text-sm text-slate-600">
              {(product.rules?.rules || [
                "Valid ID proof required upon handover",
                "Handle with care and return in original protective case",
                "Late returns subject to daily extension charges",
              ]).map((rule, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                  <span>{rule}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Right Column: Booking Widget & Dynamic Pricing (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="sticky top-24 bg-white rounded-3xl border border-slate-200 p-6 shadow-lg shadow-slate-100 space-y-6">
            {/* Header: Title, Rating, City */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span className="font-semibold uppercase tracking-wider text-indigo-600">
                  {product.category?.name || "Rental"}
                </span>
                <div className="flex items-center gap-1 font-bold text-slate-900">
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                  <span>{parseFloat(product.averageRating || "0").toFixed(1)}</span>
                  <span className="text-slate-400 font-normal">
                    ({product.totalRatings} reviews)
                  </span>
                </div>
              </div>

              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 leading-snug">
                {product.name}
              </h1>

              {product.city && (
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>Available in {product.city}, Nepal</span>
                </div>
              )}
            </div>

            {/* Rates Banner */}
            <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-100 flex items-baseline justify-between">
              <div>
                <span className="text-2xl font-extrabold text-indigo-900">
                  {formatCurrency(product.pricing?.dailyRate)}
                </span>
                <span className="text-xs text-indigo-700 font-medium"> / day</span>
              </div>

              {product.pricing?.weeklyRate && (
                <div className="text-right">
                  <div className="text-xs font-bold text-indigo-900">
                    {formatCurrency(product.pricing.weeklyRate)}
                  </div>
                  <div className="text-[10px] text-indigo-600">weekly special rate</div>
                </div>
              )}
            </div>

            {/* Rental Calendar */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Select Rental Dates
              </label>
              <RentalCalendar
                bookedRanges={bookedRanges}
                startDate={startDate}
                endDate={endDate}
                onChange={(start, end) => {
                  setStartDate(start);
                  setEndDate(end);
                }}
              />
            </div>

            {/* Error prompt */}
            {bookingError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
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
                className="w-full py-3.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm shadow-md shadow-indigo-200 transition flex items-center justify-center gap-2"
              >
                <Zap className="w-4 h-4 fill-white" />
                {bookNowMutation.isPending ? "Securing Booking..." : "Book Now"}
              </button>

              <button
                type="button"
                disabled={!startDate || !endDate || addToCartMutation.isPending || cartAdded}
                onClick={() => (isAuthenticated ? addToCartMutation.mutate() : redirectToLogin())}
                className={`w-full py-3 px-4 rounded-xl bg-[#F1E0C8] hover:bg-[#E8D2B0] disabled:opacity-50 disabled:cursor-not-allowed text-[#211E1B] font-semibold text-xs transition-all duration-200 flex items-center justify-center gap-2 ${cartAdded ? "ring-2 ring-[#C17817]/30" : ""}`}
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
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-slate-200 overflow-hidden flex items-center justify-center">
                    {product.seller?.avatarUrl ? (
                      <img
                        src={product.seller.avatarUrl}
                        alt={product.seller.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="font-bold text-slate-600">
                        {product.seller?.name?.charAt(0)?.toUpperCase() || "L"}
                      </span>
                    )}
                  </div>
                  <span className="font-semibold text-slate-700">
                    {product.seller?.name || "Lender"}
                  </span>
                </div>
                <Link
                  to={`/messages?recipient=${product.sellerId}&product=${product.id}`}
                  className="text-indigo-600 font-bold hover:underline flex items-center gap-1"
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
      <section className="pt-10 border-t border-slate-200 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="text-xl font-bold text-slate-900">Customer Reviews</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Share your rental experience with this listing
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 font-bold text-sm">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
              <span>{parseFloat(product.averageRating || "0").toFixed(1)} / 5.0</span>
            </div>
            {isAuthenticated && user?.role !== "seller" && user?.role !== "admin" && (
              <button
                onClick={() => setShowReviewForm(!showReviewForm)}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition"
              >
                {showReviewForm ? "Cancel" : "Write a Review"}
              </button>
            )}
          </div>
        </div>

        {reviewSuccess && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 font-medium">
            ✓ Your review has been submitted successfully. Thank you!
          </div>
        )}

        {showReviewForm && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <h4 className="text-sm font-bold text-slate-900">Write Your Review</h4>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600">Rating *</label>
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
                          ? "fill-amber-400 text-amber-400"
                          : "text-slate-200"
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600">Review Headline (optional)</label>
              <input
                type="text"
                placeholder="e.g. Excellent condition, smooth pickup!"
                value={reviewTitle}
                onChange={(e) => setReviewTitle(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600">Your Experience *</label>
              <textarea
                rows={3}
                placeholder="Describe gear performance, lender communication, handover ease..."
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>

            {reviewError && (
              <p className="text-xs text-rose-600 font-medium">{reviewError}</p>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => { setShowReviewForm(false); setReviewError(null); }}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => submitReviewMutation.mutate()}
                disabled={submitReviewMutation.isPending || reviewComment.trim().length < 5}
                className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md disabled:opacity-50"
              >
                {submitReviewMutation.isPending ? "Submitting..." : "Submit Review"}
              </button>
            </div>
          </div>
        )}

        {reviews && reviews.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {reviews.map((rev) => (
              <div
                key={rev.id || rev._id}
                className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center font-bold text-indigo-700 text-xs">
                      {rev.reviewer?.name?.charAt(0) || "U"}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">
                        {rev.reviewer?.name || "Verified Renter"}
                      </h4>
                      <span className="text-[10px] text-slate-400">
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
                            ? "fill-amber-400 text-amber-400"
                            : "text-slate-200"
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {rev.title && (
                  <h5 className="text-xs font-bold text-slate-900">{rev.title}</h5>
                )}

                <p className="text-xs text-slate-600 leading-relaxed">{rev.comment}</p>

                {rev.sellerResponse && (
                  <div className="mt-3 p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-[11px] space-y-1">
                    <span className="font-bold text-slate-800">Lender response:</span>
                    <p className="text-slate-600">{rev.sellerResponse}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-slate-50 p-8 rounded-2xl border border-slate-200 text-center text-xs text-slate-500">
            No reviews yet for this listing. Be the first to review!
          </div>
        )}
      </section>
    </div>
  );
}
