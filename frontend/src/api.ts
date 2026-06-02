const BASE = process.env.EXPO_PUBLIC_BACKEND_URL;

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
  accessibility_badges: string[];
  accessibility_features: string[];
  distance_km: number;
  latitude?: number;
  longitude?: number;
  featured: boolean;
};

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}/api${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
  });
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
};
