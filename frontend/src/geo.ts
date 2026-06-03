import * as Location from "expo-location";
import { Platform } from "react-native";

/** Returns coords or null on permission denial / failure. */
export async function getCurrentCoords(): Promise<{ latitude: number; longitude: number } | null> {
  try {
    if (Platform.OS === "web") {
      // expo-location on web wraps navigator.geolocation
      if (!navigator?.geolocation) return null;
    }
    const perm = await Location.requestForegroundPermissionsAsync();
    if (perm.status !== "granted") return null;
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    return { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
  } catch (e) {
    console.warn("getCurrentCoords failed", e);
    return null;
  }
}

/** Haversine distance in kilometers between two points. */
export function distanceKm(
  a: { latitude: number; longitude: number },
  b: { latitude?: number | null; longitude?: number | null },
): number {
  if (!b.latitude || !b.longitude) return 0;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function formatDistance(km: number): string {
  if (!km || km <= 0) return "—";
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

// Default fallback: city center (close to Praia do Meio)
export const NATAL_CENTER = { latitude: -5.795, longitude: -35.209 };
