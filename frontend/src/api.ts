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

export type Guide = {
  id: string;
  name: string;
  photo_url: string;
  photo_alt: string;
  bio: string;
  short_bio: string;
  specialties: string[];
  languages: string[];
  certification_course: string;
  certification_date: string;
  accessibility_focus: string[];
  phone: string;
  whatsapp: string;
  email: string;
  instagram: string;
  region: string;
  rating: number;
  years_experience: number;
  has_seal: boolean;
  seal_code: string;
  featured: boolean;
  active: boolean;
  translations?: Record<string, {
    name?: string;
    bio?: string;
    short_bio?: string;
  }>;
};

export type SiteConfig = {
  id: string;
  app_name: string;
  app_logo_url: string;
  seal_image_url: string;
  seal_alt: string;
  header_banner_title: string;
  header_banner_subtitle: string;
  footer_text: string;
  welcome_pt: string;
  welcome_en: string;
  welcome_es: string;
  welcome_sub_pt: string;
  welcome_sub_en: string;
  welcome_sub_es: string;
  about_pt: string;
  about_en: string;
  about_es: string;
  contact_email: string;
  contact_phone: string;
  contact_whatsapp: string;
  instagram: string;
  emergency_police: string;
  emergency_ambulance: string;
  emergency_fire: string;
  emergency_tourist: string;
  show_guides_tab: boolean;
  show_marketplace_tab: boolean;
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
    partner_id?: string;
    guide_id?: string;
    name: string;
    email: string;
    phone?: string;
    message: string;
    date?: string;
    people?: number;
    accessibility_needs?: string;
  }) => req(`/inquiries`, { method: "POST", body: JSON.stringify(data) }, true),

  // Guides (Certified)
  listGuides: (params?: { specialty?: string; language?: string; focus?: string; featured?: boolean }) => {
    const q = new URLSearchParams();
    if (params?.specialty && params.specialty !== "Todos") q.append("specialty", params.specialty);
    if (params?.language) q.append("language", params.language);
    if (params?.focus) q.append("focus", params.focus);
    if (params?.featured !== undefined) q.append("featured", String(params.featured));
    const qs = q.toString() ? `?${q.toString()}` : "";
    return req<Guide[]>(`/guides${qs}`);
  },
  getGuide: (id: string) => req<Guide>(`/guides/${id}`),
  guideCategories: () => req<{ specialties: string[]; languages: string[]; accessibility_focus: string[] }>(`/guides/categories`),
  translateGuide: (id: string, lang: "en" | "es" | "pt") =>
    req<{ language: string; name: string; short_description: string; full_description: string; audio_description: string }>(
      `/guides/${id}/translate?lang=${lang}`,
    ),
  createGuide: (data: Partial<Guide>) =>
    req<Guide>(`/guides`, { method: "POST", body: JSON.stringify(data) }, true),
  updateGuide: (id: string, data: Partial<Guide>) =>
    req<Guide>(`/guides/${id}`, { method: "PUT", body: JSON.stringify(data) }, true),
  deleteGuide: (id: string) =>
    req<{ deleted: boolean }>(`/guides/${id}`, { method: "DELETE" }, true),
};
