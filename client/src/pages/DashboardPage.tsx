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
  completed: "bg-[#E7EFE2] text-[#4B5D3A] border-[#4B5D3A]/30",
  returned: "bg-[#F1E0C8] text-[#A66314] border-[#C17817]/30",
  cancelled: "bg-[#FBE9E5] text-[#A23B2E] border-[#A23B2E]/30",
  rejected: "bg-[#F7EADB] text-[#8F5510] border-[#C17817]/30",
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
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
        <div className="relative overflow-hidden bg-[#211E1B] border border-[#5E574F] rounded-md p-8 text-[#FFF8ED] flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="hidden" />
          <div className="relative space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-[#F1E0C8] border border-[#C17817]/35 text-xs font-semibold text-[#C17817]"><Sparkles className="w-3.5 h-3.5" /> Renter Account</div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Welcome back, {user?.name}!</h1>
            <p className="text-xs sm:text-sm text-[#D9D0C4] max-w-md">Manage ongoing rentals, returns, booking history, and discover equipment from trusted sellers.</p>
          </div>
          <div className="relative flex flex-wrap items-center gap-3">
            <Link to="/products" className="px-5 py-2.5 rounded-md bg-[#C17817] hover:bg-[#A66314] text-[#211E1B] text-xs font-extrabold transition flex items-center gap-1.5"><Package className="w-4 h-4" />Rent More Gear</Link>
            <Link to="/bookings" className="px-5 py-2.5 rounded-md bg-[#F7F3EA] hover:bg-[#E8E1D5] border border-[#B8B0A3] text-[#211E1B] text-xs font-bold transition">View All Bookings</Link>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="bg-white rounded-md border border-[#DDD5C7] p-6 flex items-center justify-between"><div><div className="text-xs font-bold text-[#8B8377]">Active Rentals</div><div className="text-3xl font-extrabold text-[#211E1B] mt-1">{loadingStats ? "—" : statsData?.activeRentalsCount ?? 0}</div><p className="text-[11px] text-[#4B5D3A] font-medium mt-1">Currently in your possession</p></div><div className="w-12 h-12 rounded-md bg-[#E8E1D5] text-[#514B44] flex items-center justify-center"><Clock className="w-6 h-6" /></div></div>
          <div className="bg-white rounded-md border border-[#DDD5C7] p-6 flex items-center justify-between"><div><div className="text-xs font-bold text-[#8B8377]">Upcoming Bookings</div><div className="text-3xl font-extrabold text-[#211E1B] mt-1">{loadingStats ? "—" : statsData?.upcomingBookingsCount ?? 0}</div><p className="text-[11px] text-[#A66314] font-medium mt-1">Confirmed for upcoming dates</p></div><div className="w-12 h-12 rounded-md bg-[#F1E0C8] text-[#C17817] flex items-center justify-center"><Calendar className="w-6 h-6" /></div></div>
          <div className="bg-white rounded-md border border-[#DDD5C7] p-6 flex items-center justify-between"><div><div className="text-xs font-bold text-[#8B8377]">Completed Rentals</div><div className="text-3xl font-extrabold text-[#211E1B] mt-1">{loadingStats ? "—" : statsData?.completedRentalsCount ?? 0}</div><p className="text-[11px] text-[#8B8377] font-medium mt-1">Deposits successfully returned</p></div><div className="w-12 h-12 rounded-md bg-[#E7EFE2] text-[#4B5D3A] flex items-center justify-center"><CheckCircle2 className="w-6 h-6" /></div></div>
        </div>

        {statsData?.currentRentals && statsData.currentRentals.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-[#211E1B]">Ongoing Rentals</h3>
            <div className="space-y-3">
              {statsData.currentRentals.map((rental: any) => {
                const rentalId = rental.id || rental._id;
                return <div key={rentalId} className="bg-[#F7F3EA] rounded-md border border-[#C17817]/40 p-5 flex items-center justify-between gap-4"><div className="space-y-1"><div className="text-xs font-bold text-[#C17817]">ACTIVE RENTAL</div><h4 className="text-sm font-bold text-[#211E1B]">Booking #{String(rentalId || "").substring(0, 8)}</h4><div className="text-xs text-[#8B8377]">Rental Fee: {formatCurrency(rental.totalAmount)}</div></div><Link to={`/bookings/${rentalId}`} className="px-4 py-2 rounded-md bg-[#C17817] text-[#211E1B] text-xs font-bold hover:bg-[#A66314] transition whitespace-nowrap">View / Return Item</Link></div>;
              })}
            </div>
          </div>
        )}

        <section className="bg-white rounded-md border border-[#DDD5C7] overflow-hidden">
          <div className="p-6 border-b border-[#DDD5C7] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div><div className="flex items-center gap-2"><History className="w-5 h-5 text-[#C17817]" /><h3 className="text-lg font-bold text-[#211E1B]">Previous Bookings</h3></div><p className="text-xs text-[#8B8377] mt-1">Open any completed, returned, cancelled, or rejected rental to view its full details.</p></div>
            <Link to="/bookings" className="text-xs font-bold text-[#C17817] hover:text-[#A66314] flex items-center gap-1">View booking history <ArrowRight className="w-3.5 h-3.5" /></Link>
          </div>
          <div className="p-4 sm:p-6">
            {loadingBookings ? <div className="space-y-3">{[1,2,3].map((item) => <div key={item} className="h-20 rounded-md bg-[#E8E1D5] animate-pulse" />)}</div> : previousBookings.length === 0 ? <div className="py-10 text-center"><History className="w-9 h-9 mx-auto text-[#8B8377]" /><p className="text-sm font-semibold text-[#514B44] mt-3">No previous bookings yet</p><p className="text-xs text-[#8B8377] mt-1">Your completed rentals will appear here.</p></div> : <div className="space-y-3">{previousBookings.map((booking: any) => { const bookingId = booking.id || booking._id; const item = booking.bookingItems?.[0]; const product = item?.product; return <Link key={bookingId} to={`/bookings/${bookingId}`} className="group flex items-center gap-4 rounded-md border border-[#DDD5C7] bg-[#F7F3EA] hover:bg-[#EFE8DB] hover:border-[#C17817]/50 p-4 transition"><div className="w-14 h-14 rounded-md bg-[#E8E1D5] overflow-hidden flex-shrink-0">{product?.images?.[0]?.url ? <img src={product.images[0].url} alt={product.name || "Rental"} className="w-full h-full object-cover" /> : <Package className="w-6 h-6 m-4 text-[#8B8377]" />}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="text-[11px] font-bold text-[#8B8377]">BOOKING #{String(bookingId || "").substring(0, 8)}</span><span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold capitalize ${statusStyles[booking.status] || "bg-[#E8E1D5] text-[#8B8377] border-[#B8B0A3]"}`}>{booking.status}</span></div><h4 className="text-sm font-bold text-[#211E1B] truncate mt-1">{product?.name || "Rental booking"}</h4><p className="text-[11px] text-[#8B8377] mt-1">{booking.createdAt ? formatDate(booking.createdAt, "MMM d, yyyy") : ""} · {formatCurrency(booking.totalAmount)}</p></div><ChevronRight className="w-5 h-5 text-[#8B8377] group-hover:text-[#C17817] transition" /></Link>; })}</div>}
          </div>
        </section>

        <div className="space-y-6">
          <div className="flex items-center justify-between"><div><h3 className="text-lg font-bold text-[#211E1B]">Recommended Gear For You</h3><p className="text-xs text-[#8B8377]">Top rated cameras, drones, and instruments</p></div><Link to="/products" className="text-xs font-semibold text-[#C17817] hover:underline flex items-center gap-1">Explore all <ArrowRight className="w-3.5 h-3.5" /></Link></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">{(featuredProducts || []).slice(0, 4).map((product: any) => <ProductCard key={product.id || product._id} product={product} />)}</div>
        </div>
      </div>
    </div>
  );
}
