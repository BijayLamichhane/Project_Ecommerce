import React, { lazy, Suspense } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Navbar } from "../components/layout/Navbar";
import { Footer } from "../components/layout/Footer";
import { HomePage } from "../pages/HomePage";
import { ProductsPage } from "../pages/ProductsPage";
import { ProductDetailPage } from "../pages/ProductDetailPage";
import { LoginPage } from "../pages/LoginPage";
import { RegisterPage } from "../pages/RegisterPage";
import { useAuth } from "../hooks/useAuth";

const DashboardPage = lazy(() => import("../pages/DashboardPage").then((module) => ({ default: module.DashboardPage })));
const CartPage = lazy(() => import("../pages/CartPage").then((module) => ({ default: module.CartPage })));
const BookingsPage = lazy(() => import("../pages/BookingsPage").then((module) => ({ default: module.BookingsPage })));
const BookingDetailPage = lazy(() => import("../pages/BookingDetailPage").then((module) => ({ default: module.BookingDetailPage })));
const WishlistPage = lazy(() => import("../pages/WishlistPage").then((module) => ({ default: module.WishlistPage })));
const MessagesPage = lazy(() => import("../pages/MessagesPage").then((module) => ({ default: module.MessagesPage })));
const NotificationsPage = lazy(() => import("../pages/NotificationsPage").then((module) => ({ default: module.NotificationsPage })));
const ReportsPage = lazy(() => import("../pages/ReportsPage").then((module) => ({ default: module.ReportsPage })));
const SellerDashboardPage = lazy(() => import("../pages/SellerDashboardPage").then((module) => ({ default: module.SellerDashboardPage })));
const SellerProductEditorPage = lazy(() => import("../pages/SellerProductEditorPage").then((module) => ({ default: module.SellerProductEditorPage })));
const BecomeSellerPage = lazy(() => import("../pages/BecomeSellerPage").then((module) => ({ default: module.BecomeSellerPage })));
const SuspendedAccountPage = lazy(() => import("../pages/SuspendedAccountPage").then((module) => ({ default: module.SuspendedAccountPage })));
const AdminDashboardPage = lazy(() => import("../pages/AdminDashboardPage").then((module) => ({ default: module.AdminDashboardPage })));

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

function RouteLoading() {
  return (
    <div className="min-h-[50vh] flex items-center justify-center bg-[var(--background)]">
      <div className="w-8 h-8 border-4 border-[#C17817] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export function AppRoutes() {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--background)] text-[var(--foreground)]">
      <Navbar />
      <main className="flex-1">
        <Suspense fallback={<RouteLoading />}>
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
            <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
            <Route path="/reports" element={<ProtectedRoute><ReportsPage /></ProtectedRoute>} />

            <Route path="/seller" element={<ProtectedRoute role="seller"><SellerDashboardPage /></ProtectedRoute>} />
            <Route path="/seller/products/new" element={<ProtectedRoute role="seller"><SellerProductEditorPage /></ProtectedRoute>} />
            <Route path="/seller/products/:id/edit" element={<ProtectedRoute role="seller"><SellerProductEditorPage /></ProtectedRoute>} />

            <Route path="/admin" element={<ProtectedRoute role="admin"><AdminDashboardPage /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
