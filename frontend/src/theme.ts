/**
 * Centralized theme for "Turismo que se Sente".
 * Edit colors / sizes here to change the whole app.
 */
export const colors = {
  brand: "#7C3AED",
  brandDark: "#6D28D9",
  brandLight: "#A78BFA",
  bg: "#0B1120",
  surface: "#1E293B",
  surfaceElevated: "#334155",
  border: "#334155",
  text: "#F8FAFC",
  textSecondary: "#CBD5E1",
  textMuted: "#94A3B8",
  success: "#10B981",
  warning: "#F59E0B",
  error: "#EF4444",
  info: "#3B82F6",
  badgeBg: "rgba(124, 58, 237, 0.15)",
  successBg: "rgba(16, 185, 129, 0.15)",
} as const;

export const radii = {
  card: 16,
  pill: 999,
  button: 999,
  small: 8,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const fontSizes = {
  h1: 26,
  h2: 22,
  h3: 18,
  body: 16,
  small: 14,
  tiny: 12,
} as const;

// Official logo is served by the backend from /static/brand (versioned in the repo).
const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL ?? "";
export const LOGO_URL = `${BACKEND_URL}/static/brand/logo.jpeg`;
