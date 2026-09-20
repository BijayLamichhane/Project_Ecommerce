import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, parseISO } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | string | undefined | null): string {
  if (amount === undefined || amount === null) return "Rs. 0";
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) return "Rs. 0";
  return `Rs. ${num.toLocaleString("en-NP")}`;
}

export function formatDate(dateString: string | Date | undefined, formatStr = "MMM d, yyyy"): string {
  if (!dateString) return "";
  try {
    const date = typeof dateString === "string" ? parseISO(dateString) : dateString;
    return format(date, formatStr);
  } catch {
    return String(dateString);
  }
}

/**
 * Figures out where to send the user after login/register, in priority order:
 * 1. The page ProtectedRoute bounced them from (react-router location state)
 * 2. A "?redirect=" query param (set when the axios 401 interceptor or a
 *    "sign in to continue" action sends them here)
 * 3. The given fallback (defaults to the dashboard)
 *
 * Both sources are restricted to same-site relative paths so a crafted
 * "?redirect=https://evil.example" link can't be used as an open redirect.
 */
export function getPostLoginRedirect(
  locationState: unknown,
  searchParams: URLSearchParams,
  fallback = "/dashboard"
): string {
  const isSafeRelativePath = (value: string | null | undefined): value is string =>
    !!value && value.startsWith("/") && !value.startsWith("//");

  const from = (locationState as { from?: { pathname?: string; search?: string } } | null)?.from;
  const fromPath = from?.pathname ? `${from.pathname}${from.search || ""}` : null;
  if (isSafeRelativePath(fromPath)) return fromPath;

  const redirectParam = searchParams.get("redirect");
  if (isSafeRelativePath(redirectParam)) return redirectParam;

  return fallback;
}

/**
 * Walks a Zod .format() error tree and flattens it into readable
 * "field: message" strings, e.g. "categoryId: Required",
 * "pricing.dailyRate: Number must be greater than 0".
 */
function flattenZodFormatErrors(node: unknown, path: string[] = []): string[] {
  if (!node || typeof node !== "object") return [];
  const obj = node as Record<string, unknown>;
  const messages: string[] = [];

  if (Array.isArray(obj._errors) && obj._errors.length > 0) {
    const label = path.length > 0 ? path.join(".") : null;
    for (const msg of obj._errors as string[]) {
      messages.push(label ? `${label}: ${msg}` : msg);
    }
  }

  for (const key of Object.keys(obj)) {
    if (key === "_errors") continue;
    messages.push(...flattenZodFormatErrors(obj[key], [...path, key]));
  }

  return messages;
}

/**
 * Extracts a readable message from an axios error against this API.
 * The server sends { error: { message, details } } for validation
 * failures, where "message" is a generic "Invalid request data" but
 * "details" (Zod's .format() output) has the actual field-level reason —
 * this surfaces that instead of the generic message whenever it's present.
 */
export function getErrorMessage(err: unknown, fallback = "Something went wrong"): string {
  const response = (
    err as { response?: { data?: { error?: { message?: string; details?: unknown } } } }
  )?.response;
  const apiError = response?.data?.error;
  if (!apiError) return fallback;

  if (apiError.details) {
    const fieldErrors = flattenZodFormatErrors(apiError.details);
    if (fieldErrors.length > 0) return fieldErrors.join("; ");
  }

  return apiError.message || fallback;
}


export function getEntityId(value: unknown): string {
  if (!value || typeof value !== "object") return "";
  const record = value as Record<string, unknown>;
  const rawId = record.id ?? record._id;
  if (typeof rawId === "string" || typeof rawId === "number") return String(rawId);
  if (rawId && typeof rawId === "object") {
    const oid = (rawId as Record<string, unknown>).$oid;
    if (typeof oid === "string") return oid;
  }
  return "";
}
