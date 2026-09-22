import { useState } from "react";
import type { FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PackageOpen, Power, Search, ShieldCheck, Sparkles, Star } from "lucide-react";
import { api } from "../../lib/axios";
import { getEntityId, getErrorMessage } from "../../lib/utils";
import type { Product } from "../../types";

type ProductStatusFilter = "all" | Product["status"];
type FeaturedFilter = "all" | "featured" | "standard";

type AdminProductsResponse = {
  items: Product[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

const statusClasses: Record<Product["status"], string> = {
  active: "bg-[#E7EFE2] text-[#4B5D3A]",
  inactive: "bg-[#E8E1D5] text-[#6F685F]",
  suspended: "bg-[#FBE9E5] text-[#A23B2E]",
  draft: "bg-[#F1ECE1] text-[#8B8377]",
  deleted: "bg-[#EFEAE4] text-[#8B8377]",
};

export function AdminProductManagement() {
  const queryClient = useQueryClient();
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ProductStatusFilter>("all");
  const [featuredFilter, setFeaturedFilter] = useState<FeaturedFilter>("all");
  const [page, setPage] = useState(1);
  const [actionError, setActionError] = useState<string | null>(null);

  const { data, isLoading, isFetching } = useQuery<AdminProductsResponse>({
    queryKey: ["admin-products", { q: searchQuery, status: statusFilter, featured: featuredFilter, page }],
    queryFn: async () => {
      const { data: response } = await api.get("/admin/products", {
        params: {
          q: searchQuery || undefined,
          status: statusFilter,
          featured: featuredFilter,
          page,
          limit: 20,
        },
      });
      return response.data;
    },
  });

  const refreshProductQueries = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-products"] });
    queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
    queryClient.invalidateQueries({ queryKey: ["featured-products"] });
  };

  const featureMutation = useMutation({
    mutationFn: async ({ productId, isFeatured }: { productId: string; isFeatured: boolean }) => {
      await api.patch("/admin/products/" + encodeURIComponent(productId) + "/featured", { isFeatured });
    },
    onSuccess: () => {
      setActionError(null);
      refreshProductQueries();
    },
    onError: (error: unknown) => setActionError(getErrorMessage(error, "Failed to update featured status")),
  });

  const statusMutation = useMutation({
    mutationFn: async ({ productId, status }: { productId: string; status: "active" | "inactive" | "suspended" }) => {
      await api.post("/admin/products/" + encodeURIComponent(productId) + "/toggle", { status });
    },
    onSuccess: () => {
      setActionError(null);
      refreshProductQueries();
    },
    onError: (error: unknown) => setActionError(getErrorMessage(error, "Failed to update product status")),
  });

  const applySearch = (event: FormEvent) => {
    event.preventDefault();
    setPage(1);
    setSearchQuery(searchInput.trim());
  };

  const products = data?.items ?? [];
  const mutationBusy = featureMutation.isPending || statusMutation.isPending;

  return (
    <div className="space-y-6">
      {actionError && (
        <div className="rounded-md border border-[#A23B2E]/30 bg-[#FBE9E5] px-4 py-3 text-xs text-[#A23B2E]">
          {actionError}
        </div>
      )}

      <div className="bg-white rounded-md border border-[#C8C0B3] p-5 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#4B5D3A]" />
              <h3 className="text-base font-bold text-[#211E1B]">Product Governance</h3>
            </div>
            <p className="text-[11px] text-[#8B8377] mt-1">
              Moderate marketplace listings and control which active products receive featured placement.
            </p>
          </div>
          <div className="text-xs font-semibold text-[#6F685F]">
            {isFetching ? "Refreshing..." : String(data?.total ?? 0) + " products"}
          </div>
        </div>

        <form onSubmit={applySearch} className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto_auto] gap-2">
          <div className="relative">
            <Search className="w-4 h-4 text-[#A39A8D] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search by product, brand, or model"
              className="w-full pl-9 pr-3 py-2.5 rounded-md border border-[#C8C0B3] bg-[#F1ECE1] text-xs outline-none focus:border-[#C17817]"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2.5 rounded-md bg-[#211E1B] text-white text-xs font-bold hover:bg-[#332E29]"
          >
            Search
          </button>
          <select
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value as ProductStatusFilter);
              setPage(1);
            }}
            className="px-3 py-2.5 rounded-md border border-[#C8C0B3] bg-white text-xs"
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="suspended">Suspended</option>
            <option value="draft">Draft</option>
            <option value="deleted">Deleted</option>
          </select>
          <select
            value={featuredFilter}
            onChange={(event) => {
              setFeaturedFilter(event.target.value as FeaturedFilter);
              setPage(1);
            }}
            className="px-3 py-2.5 rounded-md border border-[#C8C0B3] bg-white text-xs"
          >
            <option value="all">All listings</option>
            <option value="featured">Featured only</option>
            <option value="standard">Not featured</option>
          </select>
        </form>
      </div>

      <div className="bg-white rounded-md border border-[#C8C0B3] shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center text-xs text-[#8B8377]">Loading products...</div>
        ) : products.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <PackageOpen className="w-8 h-8 text-[#A39A8D] mx-auto" />
            <p className="text-sm font-bold text-[#211E1B]">No products match the current filters</p>
            <p className="text-xs text-[#8B8377]">Try a different search or adjust the filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[#E6DED1] text-[#A39A8D] font-bold uppercase">
                <tr>
                  <th className="px-5 py-3">Product</th>
                  <th className="py-3">Seller</th>
                  <th className="py-3">Category</th>
                  <th className="py-3">Performance</th>
                  <th className="py-3">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E6DED1] text-[#514B44]">
                {products.map((product) => {
                  const productId = getEntityId(product);
                  const isBusy =
                    mutationBusy &&
                    (featureMutation.variables?.productId === productId ||
                      statusMutation.variables?.productId === productId);
                  const statusClass = statusClasses[product.status];

                  return (
                    <tr key={productId || product.slug}>
                      <td className="px-5 py-3 min-w-[260px]">
                        <div className="font-semibold text-[#211E1B]">{product.name}</div>
                        <div className="text-[10px] text-[#8B8377] mt-0.5">
                          {(product.brand || "No brand") + (product.model ? " · " + product.model : "")}
                        </div>
                        {product.isFeatured && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 mt-1 rounded text-[9px] font-bold uppercase bg-[#F1ECE1] text-[#C17817]">
                            <Sparkles className="w-3 h-3" />
                            Featured
                          </span>
                        )}
                      </td>
                      <td className="py-3 pr-4">{product.seller?.name || "Unknown seller"}</td>
                      <td className="py-3 pr-4">{product.category?.name || "Uncategorized"}</td>
                      <td className="py-3 pr-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1">
                          <Star className="w-3 h-3 text-[#C17817]" />
                          {Number(product.averageRating || 0).toFixed(1)}
                        </span>
                        <span className="text-[#A39A8D] ml-2">{product.totalRentals} rentals</span>
                      </td>
                      <td className="py-3 pr-4">
                        <span className={"px-2 py-0.5 rounded text-[10px] font-bold uppercase " + statusClass}>
                          {product.status}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex justify-end gap-2 flex-wrap">
                          <button
                            onClick={() =>
                              productId &&
                              featureMutation.mutate({
                                productId,
                                isFeatured: !product.isFeatured,
                              })
                            }
                            disabled={!productId || isBusy || (product.status !== "active" && !product.isFeatured)}
                            title={
                              product.status !== "active" && !product.isFeatured
                                ? "Only active products can be featured"
                                : undefined
                            }
                            className={"inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-bold transition disabled:opacity-50 " + (
                              product.isFeatured
                                ? "bg-[#F1ECE1] text-[#C17817] hover:bg-[#E8E1D5]"
                                : "bg-[#E7EFE2] text-[#4B5D3A] hover:bg-[#DCE7D4]"
                            )}
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            {product.isFeatured ? "Unfeature" : "Feature"}
                          </button>

                          {product.status !== "deleted" && (
                            <button
                              onClick={() =>
                                productId &&
                                statusMutation.mutate({
                                  productId,
                                  status: product.status === "active" ? "suspended" : "active",
                                })
                              }
                              disabled={!productId || isBusy}
                              className={"inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-bold transition disabled:opacity-50 " + (
                                product.status === "active"
                                  ? "bg-[#FBE9E5] text-[#A23B2E] hover:bg-[#F3D8D2]"
                                  : "bg-[#E7EFE2] text-[#4B5D3A] hover:bg-[#DCE7D4]"
                              )}
                            >
                              <Power className="w-3.5 h-3.5" />
                              {product.status === "active" ? "Suspend" : "Activate"}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-[#8B8377]">
            Page {data.page} of {data.totalPages}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page <= 1 || isFetching}
              className="px-3 py-1.5 rounded-md border border-[#C8C0B3] text-[#514B44] disabled:opacity-40"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((current) => Math.min(data.totalPages, current + 1))}
              disabled={page >= data.totalPages || isFetching}
              className="px-3 py-1.5 rounded-md border border-[#C8C0B3] text-[#514B44] disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
