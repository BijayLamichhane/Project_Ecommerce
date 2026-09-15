import React from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/axios";
import { useAuth } from "../hooks/useAuth";
import { ProductCard } from "../components/shared/ProductCard";
import { formatCurrency, formatDate } from "../lib/utils";
import { Calendar, Clock, CheckCircle2, ArrowRight, Sparkles, Package } from "lucide-react";

export function DashboardPage() {
  const { user } = useAuth();

  const { data: statsData, isLoading: loadingStats } = useQuery({
    queryKey: ["customer-stats"],
    queryFn: async () => {
      const { data } = await api.get("/users/customer/stats");
      return data.data;
    },
  });

  const { data: featuredProducts } = useQuery({
    queryKey: ["featured-products"],
    queryFn: async () => {
      const { data } = await api.get("/products/featured");
      return data.data || [];
    },
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-8 text-white flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-800/60 border border-indigo-700/60 text-xs font-semibold text-indigo-300">
            <Sparkles className="w-3.5 h-3.5" /> Renter Account
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Welcome back, {user?.name}!</h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-md">Manage your ongoing equipment rentals, returns, and explore thousands of items near you.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/products" className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/30 transition flex items-center gap-1.5"><Package className="w-4 h-4" />Rent More Gear</Link>
          <Link to="/bookings" className="px-5 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-white text-xs font-bold transition">View All Bookings</Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex items-center justify-between"><div><div className="text-xs font-bold uppercase tracking-wider text-slate-400">Active Rentals</div><div className="text-3xl font-extrabold text-slate-900 mt-1">{statsData?.activeRentalsCount ?? 0}</div><p className="text-[11px] text-emerald-600 font-medium mt-1">Currently in your possession</p></div><div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center"><Clock className="w-6 h-6" /></div></div>
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex items-center justify-between"><div><div className="text-xs font-bold uppercase tracking-wider text-slate-400">Upcoming Bookings</div><div className="text-3xl font-extrabold text-slate-900 mt-1">{statsData?.upcomingBookingsCount ?? 0}</div><p className="text-[11px] text-indigo-600 font-medium mt-1">Confirmed for upcoming dates</p></div><div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center"><Calendar className="w-6 h-6" /></div></div>
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex items-center justify-between"><div><div className="text-xs font-bold uppercase tracking-wider text-slate-400">Completed Rentals</div><div className="text-3xl font-extrabold text-slate-900 mt-1">{statsData?.completedRentalsCount ?? 0}</div><p className="text-[11px] text-slate-500 font-medium mt-1">Deposits successfully returned</p></div><div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center"><CheckCircle2 className="w-6 h-6" /></div></div>
      </div>

      {statsData?.currentRentals && statsData.currentRentals.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-slate-900">Ongoing Rentals</h3>
          <div className="space-y-3">
            {statsData.currentRentals.map((rental: any) => {
              const rentalId = rental.id || rental._id;
              return <div key={rentalId} className="bg-white rounded-2xl border border-indigo-100 p-5 shadow-sm flex items-center justify-between">
                <div className="space-y-1"><div className="text-xs font-bold text-indigo-600">ACTIVE RENTAL</div><h4 className="text-sm font-bold text-slate-900">Booking #{String(rentalId || "").substring(0, 8)}</h4><div className="text-xs text-slate-500">Rental Fee: {formatCurrency(rental.totalAmount)}</div></div>
                <Link to={`/bookings/${rentalId}`} className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition">View / Return Item</Link>
              </div>;
            })}
          </div>
        </div>
      )}

      <div className="space-y-6">
        <div className="flex items-center justify-between"><div><h3 className="text-lg font-bold text-slate-900">Recommended Gear For You</h3><p className="text-xs text-slate-500">Top rated cameras, drones, and instruments</p></div><Link to="/products" className="text-xs font-semibold text-indigo-600 hover:underline flex items-center gap-1">Explore all <ArrowRight className="w-3.5 h-3.5" /></Link></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">{(featuredProducts || []).slice(0, 4).map((product: any) => <ProductCard key={product.id || product._id} product={product} />)}</div>
      </div>
    </div>
  );
}
