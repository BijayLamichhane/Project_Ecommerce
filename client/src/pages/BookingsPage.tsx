import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/axios";
import { Booking } from "../types";
import { formatCurrency, getEntityId, formatDate } from "../lib/utils";
import { Calendar, ArrowRight } from "lucide-react";

export function BookingsPage() {
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const { data: bookings, isLoading } = useQuery({
    queryKey: ["my-bookings", filterStatus],
    queryFn: async () => {
      const url = filterStatus === "all" ? "/bookings/my-bookings" : `/bookings/my-bookings?status=${filterStatus}`;
      const { data } = await api.get(url); return data.data as Booking[];
    },
  });
  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = { expired: "bg-[#FBE9E5] text-[#A23B2E]", confirmed: "bg-[#F1ECE1] text-[#C17817]", active: "bg-[#E7EFE2] text-[#4B5D3A]", return_requested: "bg-[#F1ECE1] text-[#C17817]", returned: "bg-[#E8E1D5] text-[#514B44]", completed: "bg-[#E8E1D5] text-[#514B44]", pending: "bg-[#F1ECE1] text-[#C17817]", cancelled: "bg-[#FBE9E5] text-[#A23B2E]", rejected: "bg-[#FBE9E5] text-[#A23B2E]" };
    const labels: Record<string, string> = { expired: "Hold Expired", confirmed: "Confirmed", active: "Currently Active", return_requested: "Return Requested", returned: "Completed", completed: "Completed", pending: "Pending Payment", cancelled: "Cancelled", rejected: "Declined" };
    return <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${styles[status] || "bg-[#E8E1D5] text-[#6F685F]"}`}>{labels[status] || status}</span>;
  };

  return <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#C8C0B3]"><div><h1 className="text-2xl font-extrabold text-[#211E1B]">My Rentals & Bookings</h1><p className="text-xs text-[#8B8377]">Track active rentals, handovers, and security deposit refunds</p></div><div className="flex items-center gap-1.5 overflow-x-auto pb-1">{["all", "active", "confirmed", "pending", "expired", "completed"].map((tab) => <button key={tab} onClick={() => setFilterStatus(tab)} className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition ${filterStatus === tab ? "bg-[#C17817] text-white shadow-sm" : "bg-[#E8E1D5] text-[#6F685F] hover:bg-[#DDD5C7]"}`}>{tab}</button>)}</div></div>
    {isLoading ? <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-32 bg-[#E8E1D5] rounded-md animate-pulse" />)}</div> : !bookings || bookings.length === 0 ? <div className="bg-white rounded-md border border-[#C8C0B3] p-16 text-center space-y-4"><div className="w-14 h-14 rounded-full bg-[#F1ECE1] text-[#C17817] flex items-center justify-center mx-auto"><Calendar className="w-7 h-7" /></div><h3 className="text-lg font-bold text-[#211E1B]">No bookings yet</h3><p className="text-xs text-[#8B8377] max-w-sm mx-auto">You haven't rented any equipment yet. Explore our marketplace for high-end gear.</p><Link to="/products" className="inline-flex items-center gap-2 px-6 py-2.5 rounded-md bg-[#C17817] text-white text-xs font-bold shadow-md hover:bg-[#211E1B] transition">Explore Equipment<ArrowRight className="w-4 h-4 pointer-events-none" /></Link></div> : <div className="space-y-4">{bookings.map((booking) => {
      const bookingId = getEntityId(booking); const firstItem = booking.bookingItems?.[0]; const product = firstItem?.product; const productImage = product?.images?.[0]?.url || "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400";
      return <div key={bookingId} className="bg-white rounded-md border border-[#C8C0B3] p-5 shadow-sm hover:shadow-md transition flex flex-col md:flex-row md:items-center justify-between gap-5"><div className="flex items-start gap-4"><img src={productImage} alt={product?.name || "Gear"} className="w-20 h-20 rounded-md object-cover bg-[#E8E1D5] flex-shrink-0" /><div className="space-y-1"><div className="flex items-center gap-2">{getStatusBadge(booking.status)}<span className="text-[11px] text-[#A39A8D]">Booked on {formatDate(booking.createdAt)}</span></div><h3 className="text-sm font-bold text-[#211E1B]">{product?.name || "Rental Package"}</h3>{firstItem && <div className="flex items-center gap-1.5 text-xs text-[#6F685F]"><Calendar className="w-3.5 h-3.5 text-[#C17817]" /><span>{formatDate(firstItem.startDate)} → {formatDate(firstItem.endDate)}</span><span className="text-[#A39A8D]">({firstItem.durationDays} days)</span></div>}</div></div><div className="flex items-center justify-between md:justify-end gap-6 pt-3 md:pt-0 border-t md:border-0 border-[#E6DED1]"><div className="text-right"><div className="text-base font-extrabold text-[#211E1B]">{formatCurrency(booking.totalAmount)}</div><div className="text-[11px] text-[#4B5D3A] font-medium">+ {formatCurrency(booking.totalDeposit)} deposit</div></div><Link to={`/bookings/${bookingId}`} className="px-4 py-2 rounded-md bg-[#F1ECE1] hover:bg-[#E8E1D5] text-[#C17817] text-xs font-bold transition">View Details</Link></div></div>;
    })}</div>}
  </div>;
}
