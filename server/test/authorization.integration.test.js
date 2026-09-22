import { once } from "node:events";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const authSession = vi.fn();
const getAccountStatus = vi.fn();
const bookingFindById = vi.fn();
const bookingUpdateStatus = vi.fn();
const bookingResolveDispute = vi.fn();
const productFindById = vi.fn();
const productUpdate = vi.fn();
const productDelete = vi.fn();
const inventoryReleaseBooking = vi.fn();
const notificationCreate = vi.fn();
const adminGetProducts = vi.fn();
const adminGetReports = vi.fn();
const adminUpdateReportStatus = vi.fn();
const adminGetDisputes = vi.fn();
const adminLogAdminAction = vi.fn();
const reportGetTarget = vi.fn();
const reportFindPendingDuplicate = vi.fn();
const reportCreate = vi.fn();

vi.mock("../src/config/auth.js", () => ({
  auth: {
    api: {
      getSession: authSession,
    },
  },
}));

vi.mock("../src/middleware/accountStatus.js", () => ({
  getAccountStatus,
  ACCOUNT_SUSPENDED_CODE: "ACCOUNT_SUSPENDED",
  ACCOUNT_SUSPENDED_MESSAGE: "Account is suspended",
}));

vi.mock("better-auth/node", () => ({
  toNodeHandler: () => (_req, _res, next) => next(),
}));

vi.mock("../src/modules/bookings/booking.repository.js", () => ({
  bookingRepository: {
    findById: bookingFindById,
    updateStatus: bookingUpdateStatus,
    resolveDispute: bookingResolveDispute,
    findByCustomer: vi.fn(),
    findBySeller: vi.fn(),
    findOverlappingBookings: vi.fn(),
    createWithTransaction: vi.fn(),
  },
}));

vi.mock("../src/modules/admin/admin.repository.js", () => ({
  adminRepository: {
    getProducts: adminGetProducts,
    getReports: adminGetReports,
    updateReportStatus: adminUpdateReportStatus,
    getDisputes: adminGetDisputes,
    logAdminAction: adminLogAdminAction,
  },
}));

vi.mock("../src/modules/bookings/booking.inventory.repository.js", () => ({
  bookingInventoryRepository: {
    releaseBooking: inventoryReleaseBooking,
  },
}));

vi.mock("../src/modules/notifications/notification.service.js", () => ({
  notificationService: {
    createNotification: notificationCreate,
  },
}));

vi.mock("../src/sockets/index.js", () => ({
  emitProductAvailabilityChanged: vi.fn(),
  emitToUser: vi.fn(),
}));

vi.mock("../src/modules/products/product.repository.js", () => ({
  productRepository: {
    findById: productFindById,
    update: productUpdate,
    delete: productDelete,
    create: vi.fn(),
    findBySeller: vi.fn(),
    findBySlug: vi.fn(),
    search: vi.fn(),
    getFeatured: vi.fn(),
    addImage: vi.fn(),
    deleteImage: vi.fn(),
    incrementViewCount: vi.fn(),
  },
}));

const { createApp } = await import("../src/app.js");

const app = createApp();
let server;
let baseUrl;

beforeAll(async () => {
  server = app.listen(0);
  await once(server, "listening");
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

afterAll(() => {
  server.close();
});

beforeEach(() => {
  vi.clearAllMocks();
  getAccountStatus.mockResolvedValue("active");
  authSession.mockImplementation(async ({ headers }) => {
    const userId = headers["x-test-user-id"];
    if (!userId) return null;

    return {
      user: {
        id: userId,
        role: headers["x-test-role"] || "customer",
      },
      session: { id: "integration-test-session" },
    };
  });
});

async function request(path, { userId, role, method = "GET", body } = {}) {
  const headers = {};
  if (userId) {
    headers["x-test-user-id"] = userId;
    headers["x-test-role"] = role || "customer";
  }
  if (body !== undefined) headers["content-type"] = "application/json";

  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = await response.json().catch(() => null);

  return { response, json };
}

describe("HTTP authorization boundaries", () => {
  it("blocks customer A from reading customer B's booking", async () => {
    bookingFindById.mockResolvedValue({
      id: "booking-1",
      customerId: "customer-b",
      sellerId: "seller-c",
      status: "pending",
    });

    const { response, json } = await request("/api/v1/bookings/booking-1", {
      userId: "customer-a",
      role: "customer",
    });

    expect(response.status).toBe(403);
    expect(json?.error?.code).toBe("FORBIDDEN");
  });

  it("blocks customer A from patching customer B's booking", async () => {
    bookingFindById.mockResolvedValue({
      id: "booking-1",
      customerId: "customer-b",
      sellerId: "seller-c",
      status: "pending",
    });

    const { response, json } = await request("/api/v1/bookings/booking-1/status", {
      userId: "customer-a",
      role: "customer",
      method: "PATCH",
      body: { status: "cancelled" },
    });

    expect(response.status).toBe(403);
    expect(json?.error?.code).toBe("FORBIDDEN");
    expect(bookingUpdateStatus).not.toHaveBeenCalled();
  });

  it("allows a seller to pause their own product", async () => {
    productFindById.mockResolvedValue({
      id: "product-1",
      sellerId: "seller-a",
      status: "active",
      isFeatured: true,
    });
    productUpdate.mockResolvedValue({
      id: "product-1",
      sellerId: "seller-a",
      status: "inactive",
      isFeatured: false,
    });

    const { response, json } = await request("/api/v1/products/product-1/status", {
      userId: "seller-a",
      role: "seller",
      method: "PATCH",
      body: { status: "inactive" },
    });

    expect(response.status).toBe(200);
    expect(json?.data?.status).toBe("inactive");
    expect(json?.data?.isFeatured).toBe(false);
    expect(productUpdate).toHaveBeenCalledWith("product-1", { status: "inactive", isFeatured: false });
  });

  it("blocks a seller from changing another seller's product status", async () => {
    productFindById.mockResolvedValue({
      id: "product-1",
      sellerId: "seller-b",
      status: "active",
    });

    const { response, json } = await request("/api/v1/products/product-1/status", {
      userId: "seller-a",
      role: "seller",
      method: "PATCH",
      body: { status: "inactive" },
    });

    expect(response.status).toBe(403);
    expect(json?.error?.code).toBe("FORBIDDEN");
    expect(productUpdate).not.toHaveBeenCalled();
  });
  it("blocks a seller from editing another seller's product", async () => {
    productFindById.mockResolvedValue({
      id: "product-1",
      sellerId: "seller-b",
      status: "active",
    });

    const { response, json } = await request("/api/v1/products/product-1", {
      userId: "seller-a",
      role: "seller",
      method: "PATCH",
      body: { name: "Updated Camera" },
    });

    expect(response.status).toBe(403);
    expect(json?.error?.code).toBe("FORBIDDEN");
    expect(productUpdate).not.toHaveBeenCalled();
  });

  it("blocks a seller from deleting another seller's product", async () => {
    productFindById.mockResolvedValue({
      id: "product-1",
      sellerId: "seller-b",
      status: "active",
    });

    const { response, json } = await request("/api/v1/products/product-1", {
      userId: "seller-a",
      role: "seller",
      method: "DELETE",
    });

    expect(response.status).toBe(403);
    expect(json?.error?.code).toBe("FORBIDDEN");
    expect(productDelete).not.toHaveBeenCalled();
  });

  it("blocks non-admin access to the admin API", async () => {
    const { response, json } = await request("/api/v1/admin/users", {
      userId: "customer-a",
      role: "customer",
    });

    expect(response.status).toBe(403);
    expect(json?.error?.code).toBe("FORBIDDEN");
  });


  it("allows an admin to load product governance data", async () => {
    adminGetProducts.mockResolvedValue({
      items: [{ id: "product-1", name: "Camera", status: "active", isFeatured: false }],
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    });

    const { response, json } = await request("/api/v1/admin/products", {
      userId: "admin-1",
      role: "admin",
    });

    expect(response.status).toBe(200);
    expect(json?.data?.items).toHaveLength(1);
    expect(adminGetProducts).toHaveBeenCalledWith({
      q: undefined,
      status: "all",
      featured: "all",
      page: 1,
      limit: 20,
    });
  });

  it("allows an admin to feature an active product", async () => {
    productFindById.mockResolvedValue({
      id: "product-1",
      sellerId: "seller-1",
      status: "active",
      isFeatured: false,
    });
    adminLogAdminAction.mockResolvedValue({});

    const { response, json } = await request("/api/v1/admin/products/product-1/featured", {
      userId: "admin-1",
      role: "admin",
      method: "PATCH",
      body: { isFeatured: true },
    });

    expect(response.status).toBe(200);
    expect(json?.data).toEqual({
      _id: "product-1",
      id: "product-1",
      status: "active",
      isFeatured: true,
    });
    expect(productUpdate).toHaveBeenCalledWith("product-1", { isFeatured: true });
    expect(adminLogAdminAction).toHaveBeenCalledWith({
      adminId: "admin-1",
      actionType: "feature_product",
      targetProductId: "product-1",
    });
  });

  it("does not allow an admin to feature a non-active product", async () => {
    productFindById.mockResolvedValue({
      id: "product-1",
      sellerId: "seller-1",
      status: "suspended",
      isFeatured: false,
    });

    const { response, json } = await request("/api/v1/admin/products/product-1/featured", {
      userId: "admin-1",
      role: "admin",
      method: "PATCH",
      body: { isFeatured: true },
    });

    expect(response.status).toBe(400);
    expect(json?.error?.code).toBe("VALIDATION_ERROR");
    expect(productUpdate).not.toHaveBeenCalled();
  });
  it("blocks a non-admin from changing featured status", async () => {
    const { response, json } = await request("/api/v1/admin/products/product-1/featured", {
      userId: "seller-1",
      role: "seller",
      method: "PATCH",
      body: { isFeatured: true },
    });

    expect(response.status).toBe(403);
    expect(json?.error?.code).toBe("FORBIDDEN");
    expect(productUpdate).not.toHaveBeenCalled();
  });

  it("blocks suspended users before protected API handlers", async () => {
    getAccountStatus.mockResolvedValue("suspended");

    const { response, json } = await request("/api/v1/admin/users", {
      userId: "suspended-user",
      role: "admin",
    });

    expect(response.status).toBe(403);
    expect(json?.error?.code).toBe("ACCOUNT_SUSPENDED");
  });

  it("allows the seller to activate a confirmed booking", async () => {
    bookingFindById.mockResolvedValue({
      id: "booking-1",
      customerId: "customer-a",
      sellerId: "seller-a",
      status: "confirmed",
    });
    bookingUpdateStatus.mockResolvedValue({
      id: "booking-1",
      customerId: "customer-a",
      sellerId: "seller-a",
      status: "active",
    });

    const { response, json } = await request("/api/v1/bookings/booking-1/status", {
      userId: "seller-a",
      role: "seller",
      method: "PATCH",
      body: { status: "active" },
    });

    expect(response.status).toBe(200);
    expect(json?.data?.status).toBe("active");
    expect(bookingUpdateStatus).toHaveBeenCalledWith("booking-1", "active", {});
  });

  it("allows the customer to cancel a pending booking", async () => {
    bookingFindById.mockResolvedValue({
      id: "booking-1",
      customerId: "customer-a",
      sellerId: "seller-a",
      status: "pending",
    });
    bookingUpdateStatus.mockResolvedValue({
      id: "booking-1",
      customerId: "customer-a",
      sellerId: "seller-a",
      status: "cancelled",
    });

    const { response, json } = await request("/api/v1/bookings/booking-1/cancel", {
      userId: "customer-a",
      role: "customer",
      method: "POST",
      body: { reason: "Plans changed" },
    });

    expect(response.status).toBe(200);
    expect(json?.data?.status).toBe("cancelled");
    expect(bookingUpdateStatus).toHaveBeenCalledWith(
      "booking-1",
      "cancelled",
      { cancellationReason: "Plans changed" }
    );
  });

  it("does not allow a customer to activate a confirmed booking", async () => {
    bookingFindById.mockResolvedValue({
      id: "booking-1",
      customerId: "customer-a",
      sellerId: "seller-a",
      status: "confirmed",
    });

    const { response, json } = await request("/api/v1/bookings/booking-1/status", {
      userId: "customer-a",
      role: "customer",
      method: "PATCH",
      body: { status: "active" },
    });

    expect(response.status).toBe(403);
    expect(json?.error?.code).toBe("FORBIDDEN");
    expect(bookingUpdateStatus).not.toHaveBeenCalled();
  });
});
