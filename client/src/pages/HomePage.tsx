import React from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/axios";
import { ProductCard } from "../components/shared/ProductCard";
import { RecommendedProducts } from "../components/shared/RecommendedProducts";
import { useAuth } from "../hooks/useAuth";
import { Product, Category } from "../types";
import {
  ArrowRight,
  Award,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { getCategoryIcon } from "../lib/categoryIcons";

export function HomePage() {
  const { isAuthenticated, isSeller, isAdmin } = useAuth();

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

  return (
    <div className="space-y-20 pb-16">
      {/* ─── Hero Section ────────────────────────────────────────── */}
      <section className="relative overflow-hidden pt-12 pb-20 md:py-28 bg-[#211E1B] text-white">
        {/* Ambient Glows */}
        <div className="absolute top-1/2 right-10 w-[400px] h-[300px]  blur-[120px] rounded-full pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#E8E1D5] border border-[#B8B0A3]/80 text-xs font-semibold text-[#211E1B]">
            <Sparkles className="w-3.5 h-3.5 text-[#C17817]" />
            The Smart Rental Marketplace
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-7xl font-extrabold tracking-tight text-balance max-w-4xl mx-auto leading-[1.1]">
            Rent what you need. <br />
            <span className="text-[#C17817]">
              Without buying what you don't.
            </span>
          </h1>

          <p className="text-base sm:text-lg text-[#D9D0C4] max-w-2xl mx-auto font-normal leading-relaxed text-balance">
            Discover mirrorless cameras, MacBooks, high-altitude expedition tents, drones, and pro audio gear — available right when you need them.
          </p>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <Link
              to="/products"
              className="w-full sm:w-auto px-8 py-3.5 text-base font-bold text-[#211E1B] bg-[#C17817] hover:bg-[#A66314] rounded-xl shadow-none transition flex items-center justify-center gap-2"
            >
              Explore Products
              <ArrowRight className="w-4 h-4 pointer-events-none" />
            </Link>
            <Link
              to="/become-seller"
              className="w-full sm:w-auto px-8 py-3.5 text-base font-bold text-[#211E1B] hover:text-[#211E1B] bg-[#F7F3EA] hover:bg-[#F1E0C8] border border-[#B8B0A3] rounded-xl transition"
            >
              Start Renting Out Your Gear
            </Link>
          </div>

          {/* Trust points strip */}
          <div className="pt-10 flex flex-wrap items-center justify-center gap-6 text-xs text-[#8B8377] font-medium">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#4B5D3A]" />
              <span>Protected Security Deposits</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#4B5D3A]" />
              <span>Verified Community Lenders</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#4B5D3A]" />
              <span>Zero Overlapping Bookings</span>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Popular Categories ──────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#211E1B] tracking-tight">
              Popular Categories
            </h2>
            <p className="text-sm text-[#6F685F] mt-1">
              Browse top equipment rentals across Nepal
            </p>
          </div>
          <Link
            to="/products"
            className="text-sm font-semibold text-[#C17817] hover:text-[#A66314] flex items-center gap-1"
          >
            View all <ArrowRight className="w-4 h-4 pointer-events-none" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          {(categories || []).map((category) => (
            <Link
              key={category.id}
              to={`/products?category=${category.slug}`}
              className="group p-5 rounded-md bg-[#F7F3EA] border border-[#C8C0B3]/80 hover:border-[#C17817]  transition-all flex flex-col items-center text-center gap-3"
            >
              <div className="w-12 h-12 rounded-xl bg-[#F1E0C8] text-[#C17817] group-hover:bg-[#C17817] group-hover:text-[#F7F3EA] transition-colors flex items-center justify-center ">
                {React.createElement(getCategoryIcon(category.iconName), { className: "w-6 h-6" })}
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#211E1B] group-hover:text-[#C17817] transition">
                  {category.name}
                </h3>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ─── Personalized Recommendations ───────────────────────── */}
      {isAuthenticated && !isSeller && !isAdmin && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <RecommendedProducts
            mode="personalized"
            title="Recommended For You"
            subtitle="Suggestions based on your rental history and saved equipment."
            limit={4}
          />
        </section>
      )}

      {/* ─── Featured Products ───────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#211E1B] tracking-tight">
              Featured Gear
            </h2>
          </div>
          <Link
            to="/products"
            className="text-sm font-semibold text-[#C17817] hover:text-[#A66314] flex items-center gap-1"
          >
            Browse all gear <ArrowRight className="w-4 h-4 pointer-events-none" />
          </Link>
        </div>

        {loadingFeatured ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-80 rounded-md bg-[#E8E1D5] animate-pulse" />
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
      <section className="bg-[#E8E1D5]/70 py-16 border-y border-[#C8C0B3]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14 space-y-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#211E1B] tracking-tight">
              How RentHub Works
            </h2>
            <p className="text-sm text-[#6F685F]">
              Simple 4-step process designed for safety and peace of mind.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative">
            {/* Step 1 */}
            <div className="bg-[#F7F3EA] rounded-md p-6 border border-[#C8C0B3]  relative">
              <div className="font-mono text-xs font-medium text-[#C17817] mb-4">
                1
              </div>
              <h3 className="text-base font-bold text-[#211E1B] mb-2">Find Your Gear</h3>
              <p className="text-xs text-[#6F685F] leading-relaxed">
                Search verified gear, inspect live availability calendar, and calculate transparent rental pricing.
              </p>
            </div>

            {/* Step 2 */}
            <div className="bg-[#F7F3EA] rounded-md p-6 border border-[#C8C0B3]  relative">
              <div className="font-mono text-xs font-medium text-[#C17817] mb-4">
                2
              </div>
              <h3 className="text-base font-bold text-[#211E1B] mb-2">Book with Deposit</h3>
              <p className="text-xs text-[#6F685F] leading-relaxed">
                Confirm your dates with security deposit protection. Instant date lock prevents conflicting bookings.
              </p>
            </div>

            {/* Step 3 */}
            <div className="bg-[#F7F3EA] rounded-md p-6 border border-[#C8C0B3]  relative">
              <div className="font-mono text-xs font-medium text-[#C17817] mb-4">
                3
              </div>
              <h3 className="text-base font-bold text-[#211E1B] mb-2">Pickup & Create</h3>
              <p className="text-xs text-[#6F685F] leading-relaxed">
                Meet the verified lender, inspect gear condition, and make your creative project or trek a reality.
              </p>
            </div>

            {/* Step 4 */}
            <div className="bg-[#F7F3EA] rounded-md p-6 border border-[#C8C0B3]  relative">
              <div className="font-mono text-xs font-medium text-[#C17817] mb-4">
                4
              </div>
              <h3 className="text-base font-bold text-[#211E1B] mb-2">Return & Refund</h3>
              <p className="text-xs text-[#6F685F] leading-relaxed">
                Return the gear on schedule. Your security deposit is automatically refunded in full.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Lender CTA Banner ───────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-md bg-[#211E1B] overflow-hidden text-white p-8 sm:p-12 lg:p-16">
          <div className="relative z-10 max-w-2xl space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#2F2B27] text-[#D9D0C4] text-xs font-semibold">
              <Award className="w-4 h-4 text-[#C17817]" />
              Lender Protection Guarantee
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Have equipment sitting unused? Turn it into income.
            </h2>
            <p className="text-sm sm:text-base text-[#D9D0C4] leading-relaxed">
              List your camera kits, MacBooks, camping gear, and power tools on RentHub. Set your custom rates, require refundable deposits, and approve who rents your equipment.
            </p>
            <div className="pt-2">
              <Link
                to="/become-seller"
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-[#F7F3EA] text-[#211E1B] hover:bg-[#F1E0C8] font-bold text-sm shadow-md transition"
              >
                Start Renting Out Now
                <ArrowRight className="w-4 h-4 pointer-events-none" />
              </Link>
            </div>
          </div>

          {/* Decorative graphic element */}
          <div className="absolute right-0 bottom-0 w-96 h-96 bg-[#C17817]/20 rounded-full blur-3xl pointer-events-none" />
        </div>
      </section>
    </div>
  );
}
