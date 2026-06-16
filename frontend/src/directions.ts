import { Platform, Linking } from "react-native";

/**
 * Monta a URL universal de ROTA do Google Maps até um destino.
 * - Com coordenadas: destination="lat,lng".
 * - Sem coordenadas: destination = endereço + ", Natal, RN" (URL-encoded).
 * Essa URL abre o app do Google Maps no celular (com fallback pro navegador) e funciona no web.
 */
export function directionsUrl(opts: {
  latitude?: number | null;
  longitude?: number | null;
  address?: string | null;
}): string {
  const dest =
    opts.latitude != null && opts.longitude != null
      ? `${opts.latitude},${opts.longitude}`
      : encodeURIComponent(`${opts.address || ""}, Natal, RN`);
  return `https://www.google.com/maps/dir/?api=1&destination=${dest}`;
}

/** Abre a rota: nova aba no web; app/navegador via Linking no nativo. */
export function openDirections(opts: {
  latitude?: number | null;
  longitude?: number | null;
  address?: string | null;
}): void {
  const url = directionsUrl(opts);
  if (Platform.OS === "web") {
    window.open(url, "_blank");
  } else {
    Linking.openURL(url).catch(() => {});
  }
}
