import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Product } from "../../types";
import { getEntityId, formatCurrency } from "../../lib/utils";
import { Star, Heart, MapPin, ShieldCheck, Sparkles } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/axios";
import { useAuth } from "../../hooks/useAuth";

interface ProductCardProps {
  product: Product;
  isInWishlist?: boolean;
}

export function ProductCard({ product, isInWishlist = false }: ProductCardProps) {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const productId = getEntityId(product);

  const toggleWishlistMutation = useMutation({
    mutationFn: async () => {
      await api.post("/wishlist/toggle", { productId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wishlist"] });
    },
  });

  const primaryImage =
    product.images?.find((img) => img.isPrimary)?.url ||
    product.images?.[0]?.url ||
    "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600";

  const dailyRate = product.pricing?.dailyRate ? parseFloat(product.pricing.dailyRate) : null;
  const deposit = product.pricing?.securityDeposit ? parseFloat(product.pricing.securityDeposit) : 0;

  return (
    <div className="group relative bg-[#F7F3EA] rounded-md border border-[#C8C0B3]/80 hover:border-[#B8B0A3] transition-all duration-300 flex flex-col overflow-hidden">
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#E8E1D5]">
        <Link to={`/products/${productId}`} className="block w-full h-full">
          <img
            src={primaryImage}
            alt={product.name}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        </Link>

        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 pointer-events-none">
          {product.isFeatured && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500 text-white ">
              <Sparkles className="w-3 h-3" />
              Featured
            </span>
          )}
          {product.condition === "like_new" && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[#E4E8DE] text-[#4B5D3A] border border-[#AEB9A1]">
              Like New
            </span>
          )}
        </div>

        <button
          onClick={(e) => {
            e.preventDefault();
            if (!isAuthenticated) {
              navigate(`/login?redirect=${encodeURIComponent(`/products/${productId}`)}`);
              return;
            }
            toggleWishlistMutation.mutate();
          }}
          className="absolute top-3 right-3 p-2 rounded-full bg-[#F7F3EA]/95   hover:bg-[#F7F3EA] text-[#514B44] hover:text-[#A23B2E] transition"
          title="Save to Wishlist"
        >
          <Heart
            className={`w-4 h-4 transition ${
              isInWishlist ? "fill-[#A23B2E] text-[#A23B2E]" : ""
            }`}
          />
        </button>

        {product.city && (
          <div className="absolute bottom-2.5 left-2.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-[#F7F3EA]/90 text-[#211E1B] border border-[#C8C0B3]/70">
            <MapPin className="w-3 h-3 text-[#C17817]" />
            {product.city}
          </div>
        )}
      </div>

      <div className="p-4 flex flex-col flex-1 justify-between gap-3">
        <div>
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-medium truncate max-w-[140px]">
              {product.category?.name || product.brand || "Rental Gear"}
            </span>
            <div className="flex items-center gap-1 font-semibold text-slate-800">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span>{parseFloat(product.averageRating || "0").toFixed(1)}</span>
              {product.totalRatings > 0 && (
                <span className="text-[#8B8377] font-normal text-[11px]">
                  ({product.totalRatings})
                </span>
              )}
            </div>
          </div>

          <Link to={`/products/${productId}`}>
            <h3 className="text-sm font-bold text-slate-900 line-clamp-2 hover:text-[#C17817] transition leading-snug">
              {product.name}
            </h3>
          </Link>
        </div>

        <div className="pt-2 border-t border-slate-100 flex items-end justify-between gap-2">
          <div>
            <div className="text-base font-extrabold text-slate-900">
              {formatCurrency(dailyRate)}
              <span className="text-xs font-normal text-slate-500"> / day</span>
            </div>
            {deposit > 0 && (
              <div className="text-[11px] font-medium text-slate-500 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                Deposit: {formatCurrency(deposit)}
              </div>
            )}
          </div>

          <Link
            to={`/products/${productId}`}
            className="px-3 py-1.5 text-xs font-semibold text-[#C17817] hover:text-white bg-[#F1E0C8] hover:bg-[#C17817] rounded-lg transition"
          >
            Rent Now
          </Link>
        </div>
      </div>
    </div>
  );
}
