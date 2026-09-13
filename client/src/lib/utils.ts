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
