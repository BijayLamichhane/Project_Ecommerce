import React from "react";
import { Link } from "react-router-dom";
import { Layers, Shield, Clock, RotateCcw, HeartHandshake } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-[#F7F3EA] text-[#8B8377] text-sm mt-20 border-t border-slate-800">
      {/* Value props strip */}
      <div className="border-b border-slate-800 py-8 bg-slate-950/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-950/80 border border-indigo-800/40 flex items-center justify-center text-indigo-400 flex-shrink-0">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-white text-sm font-semibold">Protected Security Deposits</h4>
                <p className="text-xs text-[#8B8377]">Held securely until safe return</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-950/80 border border-indigo-800/40 flex items-center justify-center text-indigo-400 flex-shrink-0">
                <HeartHandshake className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-white text-sm font-semibold">Verified Renters & Lenders</h4>
                <p className="text-xs text-[#8B8377]">Community trust and identity checks</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-950/80 border border-indigo-800/40 flex items-center justify-center text-indigo-400 flex-shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-white text-sm font-semibold">Flexible Rental Duration</h4>
                <p className="text-xs text-[#8B8377]">Hourly, daily, weekly, or monthly</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-950/80 border border-indigo-800/40 flex items-center justify-center text-indigo-400 flex-shrink-0">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-white text-sm font-semibold">Hassle-Free Handover</h4>
                <p className="text-xs text-[#8B8377]">Clear return terms & inspections</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          {/* Brand Col */}
          <div className="col-span-2 space-y-4">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#C17817] flex items-center justify-center text-white font-bold">
                <Layers className="w-5 h-5" />
              </div>
              <span className="text-xl font-extrabold text-white tracking-tight">
                Rent<span className="text-indigo-400">Hub</span>
              </span>
            </Link>
            <p className="text-xs text-[#8B8377] max-w-sm leading-relaxed">
              RentHub is the modern circular economy rental marketplace. Rent premium cameras, laptops, expedition camping gear, and instruments when you need them.
            </p>
            <div className="text-xs text-slate-500">
              © {new Date().getFullYear()} RentHub Technologies. All rights reserved.
            </div>
          </div>

          {/* Categories */}
          <div>
            <h5 className="text-xs font-bold text-white uppercase tracking-wider mb-3">
              Explore Gear
            </h5>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/products?category=cameras-lenses" className="hover:text-white transition">
                  Cameras & Cinema
                </Link>
              </li>
              <li>
                <Link to="/products?category=laptops-computers" className="hover:text-white transition">
                  Laptops & MacBooks
                </Link>
              </li>
              <li>
                <Link to="/products?category=camping-outdoors" className="hover:text-white transition">
                  Expedition Camping
                </Link>
              </li>
              <li>
                <Link to="/products?category=drones-aerial" className="hover:text-white transition">
                  Drones & Aerial
                </Link>
              </li>
              <li>
                <Link to="/products?category=gaming-vr" className="hover:text-white transition">
                  Gaming & VR
                </Link>
              </li>
            </ul>
          </div>

          {/* Platform */}
          <div>
            <h5 className="text-xs font-bold text-white uppercase tracking-wider mb-3">
              Lenders & Renters
            </h5>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/become-seller" className="hover:text-white transition">
                  Become a Seller
                </Link>
              </li>
              <li>
                <Link to="/how-it-works" className="hover:text-white transition">
                  How RentHub Works
                </Link>
              </li>
              <li>
                <Link to="/security-deposits" className="hover:text-white transition">
                  Deposit Protection
                </Link>
              </li>
              <li>
                <Link to="/dashboard" className="hover:text-white transition">
                  Customer Dashboard
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal / Company */}
          <div>
            <h5 className="text-xs font-bold text-white uppercase tracking-wider mb-3">
              Company & Help
            </h5>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/about" className="hover:text-white transition">
                  About Us
                </Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-white transition">
                  Contact Support
                </Link>
              </li>
              <li>
                <Link to="/terms" className="hover:text-white transition">
                  Rental Terms
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="hover:text-white transition">
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}
