import React from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Sparkles } from "lucide-react";
import { api } from "../../lib/axios";
import { Product } from "../../types";
import { ProductCard } from "./ProductCard";

interface RecommendedProductsProps {
  mode: "personalized" | "similar";
  productId?: string;
  title: string;
  subtitle: string;
  limit?: number;
}

export function RecommendedProducts({
  mode,
  productId,
  title,
  subtitle,
  limit = 4,
}: RecommendedProductsProps) {
  const enabled = mode === "personalized" || Boolean(productId);

  const { data: products = [], isLoading } = useQuery<Product[]>({
    queryKey: ["recommendations", mode, productId, limit],
    queryFn: async () => {
      const url =
        mode === "personalized"
          ? `/recommendations/personalized?limit=${limit}`
          : `/recommendations/similar/${productId}?limit=${limit}`;

      const { data } = await api.get(url);
      return (data.data || []) as Product[];
    },
    enabled,
  });

  if (isLoading) {
    return (
      <section className="space-y-5">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#C17817]" />
            <h3 className="text-lg font-bold text-[#211E1B]">{title}</h3>
          </div>
          <p className="text-xs text-[#8B8377] mt-1">{subtitle}</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: limit }).map((_, index) => (
            <div
              key={index}
              className="h-80 rounded-md bg-[#E8E1D5] animate-pulse"
            />
          ))}
        </div>
      </section>
    );
  }

  if (products.length === 0) return null;

  return (
    <section className="space-y-5">
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#C17817]" />
            <h3 className="text-lg font-bold text-[#211E1B]">{title}</h3>
          </div>
          <p className="text-xs text-[#8B8377] mt-1">{subtitle}</p>
        </div>
        <Link
          to="/products"
          className="hidden sm:inline-flex items-center gap-1 text-xs font-semibold text-[#C17817] hover:text-[#A66314]"
        >
          Explore all
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {products.map((product) => (
          <ProductCard key={product.id || product._id} product={product} />
        ))}
      </div>
    </section>
  );
}
