const BASE = process.env.EXPO_PUBLIC_BACKEND_URL;
import { tokenStorage } from "@/src/auth-storage";

export type TouristSpot = {
  id: string;
  name: string;
  category: string;
  neighborhood: string;
  address: string;
  short_description: string;
  full_description: string;
  audio_description: string;
  image_url: string;
  image_alt?: string;
  accessibility_badges: string[];
  accessibility_features: string[];
  distance_km: number;
  latitude?: number;
  longitude?: number;
  featured: boolean;
  translations?: Record<string, {
    name?: string;
    short_description?: string;
    full_description?: string;
    audio_description?: string;
  }>;
};

export type Partner = {
  id: string;
  name: string;
  category: string;
  neighborhood: string;
  short_description: string;
  accessibility_features: string[];
  badges: string[];
  image_url: string;
  email: string;
  phone: string;
  whatsapp: string;
  price_from: string;
  has_seal: boolean;
  seal_code: string;
  latitude?: number;
  longitude?: number;
};

async function req<T>(path: string, init?: RequestInit, withAuth = false): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((init?.headers as Record<string, string>) || {}),
  };
  if (withAuth) {
    const token = await tokenStorage.get();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }
  const res = await fetch(`${BASE}/api${path}`, { ...init, headers });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json() as Promise<T>;
}

export const api = {
  listSpots: (category?: string, featured?: boolean) => {
    const q = new URLSearchParams();
    if (category && category !== "Todos") q.append("category", category);
    if (featured !== undefined) q.append("featured", String(featured));
    const qs = q.toString() ? `?${q.toString()}` : "";
    return req<TouristSpot[]>(`/spots${qs}`);
  },
  getSpot: (id: string) => req<TouristSpot>(`/spots/${id}`),
  createSpot: (data: Partial<TouristSpot>) =>
    req<TouristSpot>(`/spots`, { method: "POST", body: JSON.stringify(data) }),
  updateSpot: (id: string, data: Partial<TouristSpot>) =>
    req<TouristSpot>(`/spots/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteSpot: (id: string) =>
    req<{ deleted: boolean }>(`/spots/${id}`, { method: "DELETE" }),
  categories: () => req<{ categories: string[] }>(`/categories`),
  translate: (id: string, lang: "en" | "es" | "pt") =>
    req<{
      language: string;
      name: string;
      short_description: string;
      full_description: string;
      audio_description: string;
    }>(`/spots/${id}/translate?lang=${lang}`),

  listPartners: (category?: string) => {
    const qs = category && category !== "Todos" ? `?category=${encodeURIComponent(category)}` : "";
    return req<Partner[]>(`/partners${qs}`);
  },
  getPartner: (id: string) => req<Partner>(`/partners/${id}`),
  verifySeal: (code: string) =>
    req<{ valid: boolean; partner?: any; message: string }>(`/seal/verify/${code}`),

  createInquiry: (data: {
    partner_id: string;
    name: string;
    email: string;
    phone?: string;
    message: string;
    date?: string;
    people?: number;
    accessibility_needs?: string;
  }) => req(`/inquiries`, { method: "POST", body: JSON.stringify(data) }, true),
};
