import React from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/axios";
import { ProductCard } from "../components/shared/ProductCard";
import { Heart, ArrowRight } from "lucide-react";

export function WishlistPage() {
  const { data: wishlistItemsData, isLoading } = useQuery({ queryKey: ["wishlist"], queryFn: async () => { const { data } = await api.get("/wishlist"); return data.data || []; } });
  const wishlistItems = (wishlistItemsData || []).filter((item: any) => !!item.product);
  if (isLoading) return <div className="max-w-7xl mx-auto px-4 py-16"><div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 animate-pulse">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-80 bg-slate-100 rounded-2xl" />)}</div></div>;
  return <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
    <div className="pb-4 border-b border-slate-200"><h1 className="text-2xl font-extrabold text-slate-900">Saved Wishlist</h1><p className="text-xs text-slate-500">{wishlistItems.length} gear item(s) saved for your future projects</p></div>
    {wishlistItems.length === 0 ? <div className="bg-white rounded-3xl border border-slate-200 p-16 text-center space-y-4 max-w-xl mx-auto"><div className="w-14 h-14 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center mx-auto"><Heart className="w-7 h-7" /></div><h3 className="text-lg font-bold text-slate-900">Your wishlist is empty</h3><p className="text-xs text-slate-500">Save cameras, lenses, tents, or instruments by clicking the heart icon on any product card.</p><Link to="/products" className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-bold shadow-md hover:bg-indigo-700 transition">Explore Equipment<ArrowRight className="w-4 h-4" /></Link></div> : <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">{wishlistItems.map((item: any) => <ProductCard key={item.id || item._id || item.product?.id || item.product?._id} product={item.product} isInWishlist={true} />)}</div>}
  </div>;
}
