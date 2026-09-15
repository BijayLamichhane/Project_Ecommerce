import React from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/axios";
import { useAuth } from "../hooks/useAuth";
import { ProductCard } from "../components/shared/ProductCard";
import { formatCurrency, formatDate } from "../lib/utils";
import { Calendar, Clock, CheckCircle2, ArrowRight, Sparkles, Package, History, ChevronRight } from "lucide-react";

const previousStatuses = new Set(["completed", "returned", "cancelled", "rejected"]);

const statusStyles: Record<string, string> = {
  completed: "bg-emerald-950/70 text-emerald-300 border-emerald-800",
  returned: "bg-cyan-950/70 text-cyan-300 border-cyan-800",
  cancelled: "bg-rose-950/70 text-rose-300 border-rose-800",
  rejected: "bg-orange-950/70 text-orange-300 border-orange-800",
};

export function DashboardPage() {
  const { user } = useAuth();

  const { data: statsData, isLoading: loadingStats } = useQuery({
    queryKey: ["customer-stats"],
    queryFn: async () => {
      const { data } = await api.get("/users/customer/stats");
      return data.data;
    },
  });

  const { data: allBookings = [], isLoading: loadingBookings } = useQuery({
    queryKey: ["customer-bookings", "dashboard"],
    queryFn: async () => {
      const { data } = await api.get("/bookings/my-bookings");
      return data.data || [];
    },
  });

  const { data: featuredProducts } = useQuery({
    queryKey: ["featured-products"],
    queryFn: async () => {
      const { data } = await api.get("/products/featured");
      return data.data || [];
    },
  });

  const previousBookings = allBookings.filter((booking: any) => previousStatuses.has(booking.status)).slice(0, 5);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
        <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950 border border-indigo-900/70 rounded-3xl p-8 text-white flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-2xl shadow-indigo-950/30">
          <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-cyan-500/10 blur-3xl" />
          <div className="relative space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-950/70 border border-cyan-800 text-xs font-semibold text-cyan-300"><Sparkles className="w-3.5 h-3.5" /> Renter Account</div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Welcome back, {user?.name}!</h1>
            <p className="text-xs sm:text-sm text-slate-400 max-w-md">Manage ongoing rentals, returns, booking history, and discover equipment from trusted sellers.</p>
          </div>
          <div className="relative flex flex-wrap items-center gap-3">
            <Link to="/products" className="px-5 py-2.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 text-xs font-extrabold shadow-lg shadow-cyan-500/20 transition flex items-center gap-1.5"><Package className="w-4 h-4" />Rent More Gear</Link>
            <Link to="/bookings" className="px-5 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-white text-xs font-bold transition">View All Bookings</Link>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 shadow-xl flex items-center justify-between"><div><div className="text-xs font-bold uppercase tracking-wider text-slate-500">Active Rentals</div><div className="text-3xl font-extrabold text-white mt-1">{loadingStats ? "—" : statsData?.activeRentalsCount ?? 0}</div><p className="text-[11px] text-emerald-400 font-medium mt-1">Currently in your possession</p></div><div className="w-12 h-12 rounded-2xl bg-violet-950 text-violet-300 flex items-center justify-center"><Clock className="w-6 h-6" /></div></div>
          <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 shadow-xl flex items-center justify-between"><div><div className="text-xs font-bold uppercase tracking-wider text-slate-500">Upcoming Bookings</div><div className="text-3xl font-extrabold text-white mt-1">{loadingStats ? "—" : statsData?.upcomingBookingsCount ?? 0}</div><p className="text-[11px] text-cyan-400 font-medium mt-1">Confirmed for upcoming dates</p></div><div className="w-12 h-12 rounded-2xl bg-cyan-950 text-cyan-300 flex items-center justify-center"><Calendar className="w-6 h-6" /></div></div>
          <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 shadow-xl flex items-center justify-between"><div><div className="text-xs font-bold uppercase tracking-wider text-slate-500">Completed Rentals</div><div className="text-3xl font-extrabold text-white mt-1">{loadingStats ? "—" : statsData?.completedRentalsCount ?? 0}</div><p className="text-[11px] text-slate-500 font-medium mt-1">Deposits successfully returned</p></div><div className="w-12 h-12 rounded-2xl bg-emerald-950 text-emerald-300 flex items-center justify-center"><CheckCircle2 className="w-6 h-6" /></div></div>
        </div>

        {statsData?.currentRentals && statsData.currentRentals.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white">Ongoing Rentals</h3>
            <div className="space-y-3">
              {statsData.currentRentals.map((rental: any) => {
                const rentalId = rental.id || rental._id;
                return <div key={rentalId} className="bg-slate-900 rounded-2xl border border-violet-900/60 p-5 shadow-xl flex items-center justify-between gap-4"><div className="space-y-1"><div className="text-xs font-bold text-violet-400">ACTIVE RENTAL</div><h4 className="text-sm font-bold text-white">Booking #{String(rentalId || "").substring(0, 8)}</h4><div className="text-xs text-slate-500">Rental Fee: {formatCurrency(rental.totalAmount)}</div></div><Link to={`/bookings/${rentalId}`} className="px-4 py-2 rounded-xl bg-violet-500 text-white text-xs font-bold hover:bg-violet-400 transition whitespace-nowrap">View / Return Item</Link></div>;
              })}
            </div>
          </div>
        )}

        <section className="bg-slate-900 rounded-3xl border border-slate-800 shadow-xl overflow-hidden">
          <div className="p-6 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div><div className="flex items-center gap-2"><History className="w-5 h-5 text-cyan-400" /><h3 className="text-lg font-bold text-white">Previous Bookings</h3></div><p className="text-xs text-slate-500 mt-1">Open any completed, returned, cancelled, or rejected rental to view its full details.</p></div>
            <Link to="/bookings" className="text-xs font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1">View booking history <ArrowRight className="w-3.5 h-3.5" /></Link>
          </div>
          <div className="p-4 sm:p-6">
            {loadingBookings ? <div className="space-y-3">{[1,2,3].map((item) => <div key={item} className="h-20 rounded-2xl bg-slate-950 animate-pulse" />)}</div> : previousBookings.length === 0 ? <div className="py-10 text-center"><History className="w-9 h-9 mx-auto text-slate-700" /><p className="text-sm font-semibold text-slate-400 mt-3">No previous bookings yet</p><p className="text-xs text-slate-600 mt-1">Your completed rentals will appear here.</p></div> : <div className="space-y-3">{previousBookings.map((booking: any) => { const bookingId = booking.id || booking._id; const item = booking.bookingItems?.[0]; const product = item?.product; return <Link key={bookingId} to={`/bookings/${bookingId}`} className="group flex items-center gap-4 rounded-2xl border border-slate-800 bg-slate-950/70 hover:bg-slate-800/80 hover:border-cyan-800 p-4 transition"><div className="w-14 h-14 rounded-xl bg-slate-800 overflow-hidden flex-shrink-0">{product?.images?.[0]?.url ? <img src={product.images[0].url} alt={product.name || "Rental"} className="w-full h-full object-cover" /> : <Package className="w-6 h-6 m-4 text-slate-600" />}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="text-[11px] font-bold text-slate-500">BOOKING #{String(bookingId || "").substring(0, 8)}</span><span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold capitalize ${statusStyles[booking.status] || "bg-slate-900 text-slate-400 border-slate-700"}`}>{booking.status}</span></div><h4 className="text-sm font-bold text-white truncate mt-1">{product?.name || "Rental booking"}</h4><p className="text-[11px] text-slate-500 mt-1">{booking.createdAt ? formatDate(booking.createdAt, "MMM d, yyyy") : ""} · {formatCurrency(booking.totalAmount)}</p></div><ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-cyan-400 transition" /></Link>; })}</div>}
          </div>
        </section>

        <div className="space-y-6">
          <div className="flex items-center justify-between"><div><h3 className="text-lg font-bold text-white">Recommended Gear For You</h3><p className="text-xs text-slate-500">Top rated cameras, drones, and instruments</p></div><Link to="/products" className="text-xs font-semibold text-cyan-400 hover:underline flex items-center gap-1">Explore all <ArrowRight className="w-3.5 h-3.5" /></Link></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">{(featuredProducts || []).slice(0, 4).map((product: any) => <ProductCard key={product.id || product._id} product={product} />)}</div>
        </div>
      </div>
    </div>
  );
}
