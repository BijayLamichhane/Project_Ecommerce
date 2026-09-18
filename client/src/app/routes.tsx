import React from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Navbar } from "../components/layout/Navbar";
import { Footer } from "../components/layout/Footer";
import { HomePage } from "../pages/HomePage";
import { ProductsPage } from "../pages/ProductsPage";
import { ProductDetailPage } from "../pages/ProductDetailPage";
import { CartPage } from "../pages/CartPage";
import { BookingsPage } from "../pages/BookingsPage";
import { BookingDetailPage } from "../pages/BookingDetailPage";
import { WishlistPage } from "../pages/WishlistPage";
import { MessagesPage } from "../pages/MessagesPage";
import { DashboardPage } from "../pages/DashboardPage";
import { SellerDashboardPage } from "../pages/SellerDashboardPage";
import { SellerProductEditorPage } from "../pages/SellerProductEditorPage";
import { BecomeSellerPage } from "../pages/BecomeSellerPage";
import { SuspendedAccountPage } from "../pages/SuspendedAccountPage";
import { AdminDashboardPage } from "../pages/AdminDashboardPage";
import { LoginPage } from "../pages/LoginPage";
import { RegisterPage } from "../pages/RegisterPage";
import { useAuth } from "../hooks/useAuth";

function ProtectedRoute({ children, role }: { children: React.ReactNode; role?: "seller" | "admin" }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <div className="w-8 h-8 border-4 border-[#C17817] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  if (user.status === "suspended") return <Navigate to="/account-suspended" replace />;
  if (role === "admin" && user.role !== "admin") return <Navigate to="/dashboard" replace />;
  if (role === "seller" && user.role !== "seller" && user.role !== "admin") return <Navigate to="/become-seller" replace />;

  return <>{children}</>;
}

export function AppRoutes() {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--background)] text-[var(--foreground)]">
      <Navbar />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/products/:id" element={<ProductDetailPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/become-seller" element={<BecomeSellerPage />} />
          <Route path="/account-suspended" element={<SuspendedAccountPage />} />

          <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="/cart" element={<ProtectedRoute><CartPage /></ProtectedRoute>} />
          <Route path="/wishlist" element={<ProtectedRoute><WishlistPage /></ProtectedRoute>} />
          <Route path="/bookings" element={<ProtectedRoute><BookingsPage /></ProtectedRoute>} />
          <Route path="/bookings/:id" element={<ProtectedRoute><BookingDetailPage /></ProtectedRoute>} />
          <Route path="/messages" element={<ProtectedRoute><MessagesPage /></ProtectedRoute>} />

          <Route path="/seller" element={<ProtectedRoute role="seller"><SellerDashboardPage /></ProtectedRoute>} />
          <Route path="/seller/products/new" element={<ProtectedRoute role="seller"><SellerProductEditorPage /></ProtectedRoute>} />
          <Route path="/seller/products/:id/edit" element={<ProtectedRoute role="seller"><SellerProductEditorPage /></ProtectedRoute>} />

          <Route path="/admin" element={<ProtectedRoute role="admin"><AdminDashboardPage /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}
