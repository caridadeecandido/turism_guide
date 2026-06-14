const BASE = process.env.EXPO_PUBLIC_BACKEND_URL ?? "";

/**
 * Resolve host-agnostic relative asset paths returned by the backend
 * (e.g. "/static/uploads/<id>.jpg" or "/static/brand/logo.jpeg") against the
 * backend base URL. Absolute URLs (http(s):, data:) and empty values are
 * returned unchanged, so this is safe to apply at any image render site.
 */
export function resolveAssetUrl(url?: string): string {
  if (!url) return "";
  return url.startsWith("/") ? `${BASE}${url}` : url;
}
