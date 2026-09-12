import React from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/axios";
import { ProductCard } from "../components/shared/ProductCard";
import { Product, Category } from "../types";
import {
  Camera,
  Laptop,
  Tent,
  Music,
  Wrench,
  Sparkles,
  Gamepad2,
  Navigation,
  Projector,
  Bike,
  ShieldCheck,
  Zap,
  RotateCcw,
  Search,
  ArrowRight,
  TrendingUp,
  Award,
  CheckCircle2,
} from "lucide-react";

export function HomePage() {
  const { data: featuredProducts, isLoading: loadingFeatured } = useQuery({
    queryKey: ["featured-products"],
    queryFn: async () => {
      const { data } = await api.get("/products/featured");
      return data.data as Product[];
    },
  });

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data } = await api.get("/categories");
      return data.data as Category[];
    },
  });

  const categoryIcons: Record<string, React.ReactNode> = {
    "cameras-lenses": <Camera className="w-6 h-6" />,
    "laptops-computers": <Laptop className="w-6 h-6" />,
    "camping-outdoors": <Tent className="w-6 h-6" />,
    "musical-instruments": <Music className="w-6 h-6" />,
    "power-tools": <Wrench className="w-6 h-6" />,
    "party-events": <Sparkles className="w-6 h-6" />,
    "gaming-vr": <Gamepad2 className="w-6 h-6" />,
    "drones-aerial": <Navigation className="w-6 h-6" />,
    "projectors-av": <Projector className="w-6 h-6" />,
    "sports-fitness": <Bike className="w-6 h-6" />,
  };

  return (
    <div className="space-y-20 pb-16">
      {/* ─── Hero Section ────────────────────────────────────────── */}
      <section className="relative overflow-hidden pt-12 pb-20 md:py-28 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-white">
        {/* Ambient Glows */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-indigo-600/20 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute top-1/2 right-10 w-[400px] h-[300px] bg-teal-500/10 blur-[120px] rounded-full pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-800/80 border border-slate-700/80 text-xs font-semibold text-indigo-300">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            The Smart Rental Marketplace
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-7xl font-extrabold tracking-tight text-balance max-w-4xl mx-auto leading-[1.1]">
            Rent what you need. <br />
            <span className="bg-gradient-to-r from-indigo-400 via-indigo-200 to-teal-300 bg-clip-text text-transparent">
              Without buying what you don't.
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto font-normal leading-relaxed text-balance">
            Discover mirrorless cameras, MacBooks, high-altitude expedition tents, drones, and pro audio gear — available right when you need them.
          </p>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <Link
              to="/products"
              className="w-full sm:w-auto px-8 py-3.5 text-base font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-lg shadow-indigo-600/30 transition transform hover:-translate-y-0.5 flex items-center justify-center gap-2"
            >
              Explore Products
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/become-seller"
              className="w-full sm:w-auto px-8 py-3.5 text-base font-bold text-slate-200 hover:text-white bg-slate-800/80 hover:bg-slate-800 border border-slate-700 rounded-xl transition"
            >
              Start Renting Out Your Gear
            </Link>
          </div>

          {/* Trust points strip */}
          <div className="pt-10 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400 font-medium">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Protected Security Deposits</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Verified Community Lenders</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Zero Overlapping Bookings</span>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Popular Categories ──────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Popular Categories
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Browse top equipment rentals across Nepal
            </p>
          </div>
          <Link
            to="/products"
            className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
          >
            View all <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          {(categories || []).map((category) => (
            <Link
              key={category.id}
              to={`/products?category=${category.slug}`}
              className="group p-5 rounded-2xl bg-white border border-slate-200/80 hover:border-indigo-300 hover:shadow-md transition-all flex flex-col items-center text-center gap-3"
            >
              <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors flex items-center justify-center shadow-sm">
                {categoryIcons[category.slug] || <Camera className="w-6 h-6" />}
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition">
                  {category.name}
                </h3>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ─── Featured Products Near You ──────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between mb-8">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-indigo-600 mb-1">
              <TrendingUp className="w-4 h-4" />
              High Demand
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Popular Gear Near You
            </h2>
          </div>
          <Link
            to="/products"
            className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
          >
            Browse all gear <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {loadingFeatured ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-80 rounded-2xl bg-slate-100 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {(featuredProducts || []).slice(0, 8).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>

      {/* ─── How RentHub Works ───────────────────────────────────── */}
      <section className="bg-slate-100/70 py-16 border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14 space-y-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              How RentHub Works
            </h2>
            <p className="text-sm text-slate-500">
              Simple 4-step process designed for safety and peace of mind.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative">
            {/* Step 1 */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm relative">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white font-extrabold flex items-center justify-center mb-4 text-base">
                1
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2">Find Your Gear</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Search verified gear, inspect live availability calendar, and calculate transparent rental pricing.
              </p>
            </div>

            {/* Step 2 */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm relative">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white font-extrabold flex items-center justify-center mb-4 text-base">
                2
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2">Book with Deposit</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Confirm your dates with security deposit protection. Instant date lock prevents conflicting bookings.
              </p>
            </div>

            {/* Step 3 */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm relative">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white font-extrabold flex items-center justify-center mb-4 text-base">
                3
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2">Pickup & Create</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Meet the verified lender, inspect gear condition, and make your creative project or trek a reality.
              </p>
            </div>

            {/* Step 4 */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm relative">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white font-extrabold flex items-center justify-center mb-4 text-base">
                4
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2">Return & Refund</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Return the gear on schedule. Your security deposit is automatically refunded in full.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Lender CTA Banner ───────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-3xl bg-indigo-900 overflow-hidden text-white p-8 sm:p-12 lg:p-16">
          <div className="relative z-10 max-w-2xl space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-800 text-indigo-200 text-xs font-semibold">
              <Award className="w-4 h-4 text-amber-400" />
              Lender Protection Guarantee
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Have equipment sitting unused? Turn it into income.
            </h2>
            <p className="text-sm sm:text-base text-indigo-100 leading-relaxed">
              List your camera kits, MacBooks, camping gear, and power tools on RentHub. Set your custom rates, require refundable deposits, and approve who rents your equipment.
            </p>
            <div className="pt-2">
              <Link
                to="/become-seller"
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-white text-indigo-900 hover:bg-indigo-50 font-bold text-sm shadow-md transition"
              >
                Start Renting Out Now
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Decorative graphic element */}
          <div className="absolute right-0 bottom-0 w-96 h-96 bg-indigo-600/30 rounded-full blur-3xl pointer-events-none" />
        </div>
      </section>
    </div>
  );
}
