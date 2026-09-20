import React from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/axios";
import { ProductCard } from "../components/shared/ProductCard";
import { Heart, ArrowRight } from "lucide-react";
import { getEntityId } from "../lib/utils";
import type { Product } from "../types";

type WishlistItem = { _id: string; id?: string; product: Product };

export function WishlistPage() {
  const { data: wishlistItemsData, isLoading } = useQuery<WishlistItem[]>({ queryKey: ["wishlist"], queryFn: async () => { const { data } = await api.get("/wishlist"); return data.data || []; } });
  const wishlistItems = (wishlistItemsData || []).filter((item) => !!item.product);
  if (isLoading) return <div className="max-w-7xl mx-auto px-4 py-16"><div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 animate-pulse">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-80 bg-[#E8E1D5] rounded-md" />)}</div></div>;
  return <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
    <div className="pb-4 border-b border-[#C8C0B3]"><h1 className="text-2xl font-extrabold text-[#211E1B]">Saved Wishlist</h1><p className="text-xs text-[#8B8377]">{wishlistItems.length} gear item(s) saved for your future projects</p></div>
    {wishlistItems.length === 0 ? <div className="bg-white rounded-md border border-[#C8C0B3] p-16 text-center space-y-4 max-w-xl mx-auto"><div className="w-14 h-14 rounded-full bg-[#FBE9E5] text-[#A23B2E] flex items-center justify-center mx-auto"><Heart className="w-7 h-7" /></div><h3 className="text-lg font-bold text-[#211E1B]">Your wishlist is empty</h3><p className="text-xs text-[#8B8377]">Save cameras, lenses, tents, or instruments by clicking the heart icon on any product card.</p><Link to="/products" className="inline-flex items-center gap-2 px-6 py-2.5 rounded-md bg-[#C17817] text-white text-xs font-bold shadow-md hover:bg-[#211E1B] transition">Explore Equipment<ArrowRight className="w-4 h-4" /></Link></div> : <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">{wishlistItems.map((item) => <ProductCard key={getEntityId(item)} product={item.product} isInWishlist={true} />)}</div>}
  </div>;
}
