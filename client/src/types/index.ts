export type UserRole = "customer" | "seller" | "admin";
export type BookingStatus =
  | "pending"
  | "confirmed"
  | "rejected"
  | "cancelled"
  | "active"
  | "return_requested"
  | "returned"
  | "completed"
  | "disputed"
  | "expired";

export interface User {
  _id: string;
  id?: string;
  email: string;
  name: string;
  role: UserRole;
  status: string;
  avatarUrl?: string;
  phone?: string;
  profile?: Profile;
  sellerProfile?: SellerProfile;
  createdAt: string;
}

export interface Profile {
  _id: string;
  id?: string;
  userId: string;
  bio?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
}

export interface SellerProfile {
  _id: string;
  id?: string;
  userId?: string;
  businessName: string;
  businessDescription?: string;
  businessAddress?: string;
  businessCity?: string;
  panNumber?: string;
  isVerified: boolean;
  status?: "pending" | "approved" | "rejected" | "suspended";
  rejectionReason?: string;
  applicationRequestedAt?: string;
  rejectedAt?: string;
  disbandRequested?: boolean;
  disbandRequestedAt?: string;
  disbandedAt?: string;
  averageRating: string;
  totalRatings: number;
  totalEarnings: string;
}

export interface Category {
  _id: string;
  id?: string;
  name: string;
  slug: string;
  description?: string;
  iconName?: string;
  imageUrl?: string;
  sortOrder: number;
}

export interface ProductPricing {
  hourlyRate?: string | null;
  dailyRate?: string | null;
  weeklyRate?: string | null;
  monthlyRate?: string | null;
  securityDeposit: string;
  serviceFeePercent?: string;
  deliveryFee?: string;
  minimumRentalDays?: number;
  maximumRentalDays?: number;
}

export interface ProductImage {
  _id: string;
  id?: string;
  product_Id?: string;
  productId?: string;
  url: string;
  altText?: string;
  isPrimary: boolean;
  sortOrder: number;
}

export interface ProductRules {
  _id?: string;
  id?: string;
  rules?: string[];
  restrictions?: string[];
  requirements?: string[];
  cancellationPolicy?: string;
  advanceBookingDays?: number;
  instantBook?: boolean;
}

export interface Product {
  _id: string;
  id?: string;
  sellerId: string;
  categoryId: string;
  name: string;
  slug: string;
  description: string;
  shortDescription?: string;
  brand?: string;
  model?: string;
  condition: "new" | "like_new" | "good" | "fair" | "poor";
  status: "active" | "inactive" | "suspended" | "draft" | "deleted";
  city?: string;
  state?: string;
  totalQuantity: number;
  totalRentals: number;
  totalRatings: number;
  averageRating: string;
  viewCount: number;
  isFeatured: boolean;
  images: ProductImage[];
  pricing?: ProductPricing;
  rules?: ProductRules;
  category?: Category;
  seller?: {
    _id: string;
    id?: string;
    name: string;
    avatarUrl?: string;
  };
}

export interface BookingItem {
  _id: string;
  id?: string;
  bookingId: string;
  productId: string;
  quantity: number;
  startDate: string;
  endDate: string;
  dailyRate?: string;
  baseRentalPrice: string;
  securityDeposit: string;
  durationDays: number;
  product?: Product;
}

export interface Booking {
  _id: string;
  id?: string;
  customerId: string;
  sellerId: string;
  status: BookingStatus;
  totalRentalPrice: string;
  totalDeposit: string;
  serviceFee: string;
  deliveryFee: string;
  totalAmount: string;
  specialRequests?: string;
  expiresAt?: string;
  confirmedAt?: string;
  activatedAt?: string;
  returnRequestedAt?: string;
  returnedAt?: string;
  completedAt?: string;
  disputeReason?: string;
  disputeRaisedBy?: string | { id?: string; name?: string; email?: string };
  disputePreviousStatus?: "active" | "return_requested" | "returned";
  disputedAt?: string;
  disputeResolutionNotes?: string;
  disputeResolvedBy?: string | { id?: string; name?: string; email?: string };
  disputeResolvedAt?: string;
  createdAt: string;
  bookingItems: BookingItem[];
  customer?: { _id: string; id?: string; name: string; email: string; avatarUrl?: string };
  seller?: { _id: string; id?: string; name: string; email: string; avatarUrl?: string };
}

export interface Review {
  _id: string;
  id?: string;
  productId: string;
  bookingId?: string;
  reviewerId: string;
  rating: number;
  title?: string;
  comment: string;
  sellerResponse?: string;
  createdAt: string;
  reviewer?: {
    _id: string;
    id?: string;
    name: string;
    avatarUrl?: string;
  };
}

export type NotificationType =
  | "booking_created"
  | "booking_payment_success"
  | "booking_payment_received"
  | "booking_expired"
  | "booking_rejected"
  | "booking_cancelled"
  | "booking_active"
  | "booking_return_requested"
  | "booking_returned"
  | "booking_completed"
  | "booking_dispute_opened"
  | "booking_dispute_resolved"
  | "booking_dispute_dismissed"
  | "report_submitted"
  | "report_resolved"
  | "report_dismissed"
  | "seller_application_submitted"
  | "seller_application_approved"
  | "seller_application_rejected"
  | "seller_status_approved"
  | "seller_status_rejected"
  | "account_suspended"
  | "account_reactivated"
  | "product_featured"
  | "product_unfeatured"
  | "product_activated"
  | "product_suspended"
  | "wishlisted_product_available"
  | "wishlisted_product_unavailable"
  | "review_created"
  | "review_reply"
  | "new_message"
  | (string & {});

export interface Notification {
  _id: string;
  id?: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  actionUrl?: string;
  isRead: boolean;
  createdAt: string;
}

export interface Conversation {
  _id: string;
  id?: string;
  customerId: string;
  sellerId: string;
  productId?: string;
  lastMessageAt?: string;
  customer?: { _id: string; id?: string; name: string; avatarUrl?: string };
  seller?: { _id: string; id?: string; name: string; avatarUrl?: string };
  product?: { _id: string; id?: string; name: string; slug: string; images?: { url: string }[] };
  messages?: Message[];
}

export interface Message {
  _id: string;
  id?: string;
  conversationId: string;
  senderId: string;
  content: string;
  imageUrl?: string;
  isRead: boolean;
  createdAt: string;
  sender?: { _id: string; id?: string; name: string; avatarUrl?: string };
}

export interface CartItem {
  _id: string;
  id?: string;
  productId: string;
  quantity: number;
  startDate: string;
  endDate: string;
  product: Product;
  priceCalculation?: {
    baseRentalPrice: number;
    serviceFee: number;
    deliveryFee: number;
    totalRentalPrice: number;
    securityDeposit: number;
    grandTotal: number;
  };
}

export interface RentalPriceCalculation {
  startDate: string;
  endDate: string;
  durationUnit: string;
  durationValue: number;
  baseRentalPrice: number;
  serviceFee: number;
  deliveryFee: number;
  totalRentalPrice: number;
  securityDeposit: number;
  grandTotal: number;
  breakdown: { label: string; amount: number }[];
}


export type ReportStatus = "pending" | "reviewed" | "resolved" | "dismissed";
export type ReportTargetType = "product" | "user" | "review";

export interface Report {
  _id: string;
  id?: string;
  reporterId: string | { id?: string; name?: string; email?: string };
  reportedUserId?: { id?: string; name?: string; email?: string };
  reportedProductId?: { id?: string; name?: string; slug?: string; status?: string };
  reportedReviewId?: {
    id?: string;
    rating?: number;
    title?: string;
    comment?: string;
    productId?: string;
    reviewerId?: string;
    createdAt?: string;
  };
  targetType: ReportTargetType;
  reason: string;
  details?: string;
  status: ReportStatus;
  resolvedBy?: { id?: string; name?: string; email?: string };
  resolutionNotes?: string;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
}
