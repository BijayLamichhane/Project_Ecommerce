import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/axios";
import { Search, ShoppingCart, Heart, User, PlusCircle, ShieldCheck, Menu, X, Layers, LogOut, Package } from "lucide-react";

export function Navbar() {
  const { user, isAuthenticated, isSeller, isAdmin, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setIsUserMenuOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const { data: cartData } = useQuery({
    queryKey: ["cart"],
    queryFn: async () => (await api.get("/cart")).data.data,
    enabled: isAuthenticated,
  });

  const { data: wishlistData } = useQuery({
    queryKey: ["wishlist"],
    queryFn: async () => (await api.get("/wishlist")).data.data,
    enabled: isAuthenticated,
  });

  const cartItemCount = cartData?.items?.length ?? 0;
  const wishlistItemCount = wishlistData?.length ?? 0;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) navigate(`/products?q=${encodeURIComponent(searchQuery.trim())}`);
  };

  return (
    <header className="sticky top-0 z-40 bg-[#070b18]/95 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          <Link to="/" className="flex items-center gap-2 flex-shrink-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-cyan-500 flex items-center justify-center text-white shadow-md shadow-indigo-900/30"><Layers className="w-6 h-6" /></div>
            <span className="text-xl font-extrabold tracking-tight text-white">Rent<span className="text-cyan-400">Hub</span></span>
          </Link>

          <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-lg relative">
            <input type="text" placeholder="Search cameras, laptops, drones, tools..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 text-sm bg-slate-900/80 hover:bg-slate-900 focus:bg-slate-900 border border-slate-700 focus:border-cyan-400 rounded-full outline-none text-slate-100 placeholder:text-slate-500 transition-all" />
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          </form>

          <div className="hidden md:flex items-center gap-4">
            <Link to="/products" className="text-sm font-medium text-slate-300 hover:text-cyan-400 transition">Explore</Link>
            {isAuthenticated ? (
              <>
                {isSeller ? (
                  <Link to="/seller" className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-500/10 text-indigo-300 border border-indigo-400/20 hover:bg-indigo-500/20 transition"><Package className="w-4 h-4" />Seller Hub</Link>
                ) : (
                  <Link to="/become-seller" className="flex items-center gap-1 text-sm font-medium text-slate-300 hover:text-cyan-400 transition"><PlusCircle className="w-4 h-4 text-cyan-400" />Become a Seller</Link>
                )}
                {isAdmin && <Link to="/admin" className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-500/10 text-amber-300 border border-amber-400/20"><ShieldCheck className="w-4 h-4" />Admin</Link>}
                <Link to="/wishlist" className="relative p-2 text-slate-300 hover:text-cyan-400 transition rounded-full hover:bg-slate-800" title="Wishlist"><Heart className="w-5 h-5" />{wishlistItemCount > 0 && <span className="absolute top-1 right-1 w-4 h-4 bg-fuchsia-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">{wishlistItemCount}</span>}</Link>
                <Link to="/cart" className="relative p-2 text-slate-300 hover:text-cyan-400 transition rounded-full hover:bg-slate-800" title="Rental Cart"><ShoppingCart className="w-5 h-5" />{cartItemCount > 0 && <span className="absolute top-1 right-1 w-4 h-4 bg-cyan-500 text-slate-950 text-[10px] font-bold rounded-full flex items-center justify-center">{cartItemCount}</span>}</Link>
                <div className="relative" ref={userMenuRef}>
                  <button onClick={() => setIsUserMenuOpen((v) => !v)} className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full border border-slate-700 bg-slate-900/70 hover:border-cyan-400/50 transition">
                    <div className="w-7 h-7 rounded-full bg-slate-800 overflow-hidden">{user?.avatarUrl ? <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" /> : <User className="w-4 h-4 m-1.5 text-slate-400" />}</div>
                    <span className="text-xs font-semibold text-slate-200 truncate max-w-[100px]">{user?.name?.split(" ")[0]}</span>
                  </button>
                  {isUserMenuOpen && <div className="absolute right-0 top-full mt-2 w-48 bg-slate-900 border border-slate-700 rounded-xl shadow-xl py-1.5 z-50"><Link to="/dashboard" onClick={() => setIsUserMenuOpen(false)} className="block px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800">Dashboard</Link><button onClick={() => { setIsUserMenuOpen(false); logout(); }} className="w-full text-left px-4 py-2 text-xs font-semibold text-rose-400 hover:bg-rose-500/10 flex items-center gap-2"><LogOut className="w-3.5 h-3.5" />Sign Out</button></div>}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2"><Link to="/login" className="px-4 py-2 text-sm font-semibold text-slate-300 hover:text-cyan-400 transition">Sign In</Link><Link to="/register" className="px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-cyan-500 hover:brightness-110 rounded-lg shadow-sm transition">Get Started</Link></div>
            )}
          </div>

          <div className="flex items-center gap-2 md:hidden">
            {isAuthenticated && <Link to="/cart" className="relative p-2 text-slate-300"><ShoppingCart className="w-5 h-5" />{cartItemCount > 0 && <span className="absolute top-1 right-1 w-4 h-4 bg-cyan-500 text-slate-950 text-[10px] font-bold rounded-full flex items-center justify-center">{cartItemCount}</span>}</Link>}
            <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-slate-300 hover:text-white rounded-lg">{isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}</button>
          </div>
        </div>

        <div className="py-2.5 md:hidden border-t border-slate-800"><form onSubmit={handleSearch} className="relative"><input type="text" placeholder="Search gear..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-9 pr-4 py-2 text-sm bg-slate-900 border border-slate-700 rounded-lg outline-none text-slate-100 placeholder:text-slate-500" /><Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" /></form></div>

        {isMobileMenuOpen && <div className="md:hidden py-4 space-y-3 border-t border-slate-800">
          <Link to="/products" onClick={() => setIsMobileMenuOpen(false)} className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-800">Browse All Gear</Link>
          {isAuthenticated ? <>
            <Link to="/dashboard" onClick={() => setIsMobileMenuOpen(false)} className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-800">My Rentals & Bookings</Link>
            <Link to="/wishlist" onClick={() => setIsMobileMenuOpen(false)} className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-800">Saved Wishlist ({wishlistItemCount})</Link>
            <Link to="/messages" onClick={() => setIsMobileMenuOpen(false)} className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-800">Messages</Link>
            {isSeller ? <Link to="/seller" onClick={() => setIsMobileMenuOpen(false)} className="block px-3 py-2 rounded-lg text-sm font-medium text-indigo-300 bg-indigo-500/10">Seller Dashboard</Link> : <Link to="/become-seller" onClick={() => setIsMobileMenuOpen(false)} className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-800">Start Renting Out Your Gear</Link>}
            {isAdmin && <Link to="/admin" onClick={() => setIsMobileMenuOpen(false)} className="block px-3 py-2 rounded-lg text-sm font-medium text-amber-300 bg-amber-500/10">Admin Panel</Link>}
            <button onClick={() => { setIsMobileMenuOpen(false); logout(); }} className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-rose-400 hover:bg-rose-500/10">Sign Out</button>
          </> : <div className="pt-2 flex flex-col gap-2"><Link to="/login" onClick={() => setIsMobileMenuOpen(false)} className="w-full text-center py-2 text-sm font-semibold text-slate-200 border border-slate-700 rounded-lg">Sign In</Link><Link to="/register" onClick={() => setIsMobileMenuOpen(false)} className="w-full text-center py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg">Create Account</Link></div>}
        </div>}
      </div>
    </header>
  );
}
