import { useEffect, useMemo, useState } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Platform, Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { WebView } from "react-native-webview";

import { colors, fontSizes, radii, spacing } from "@/src/theme";
import { api, TouristSpot } from "@/src/api";
import { getCurrentCoords, NATAL_CENTER } from "@/src/geo";

type LatLng = { latitude: number; longitude: number };
type SearchResult = { lat: number; lon: number; label: string };

function notify(message: string) {
  if (Platform.OS === "web") window.alert(message);
  else Alert.alert("Busca de endereço", message);
}

export default function MapScreen() {
  const [spots, setSpots] = useState<TouristSpot[]>([]);
  const [center, setCenter] = useState<LatLng>(NATAL_CENTER); // para onde o mapa olha
  const [userCoords, setUserCoords] = useState<LatLng | null>(null); // pino "Você está aqui"
  const [loading, setLoading] = useState(true);

  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [list, coords] = await Promise.all([api.listSpots(), getCurrentCoords()]);
        setSpots(list);
        if (coords) {
          setUserCoords(coords);
          setCenter(coords);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Geocodificação de endereço via Nominatim (OpenStreetMap), gratuito e sem chave.
  const searchAddress = async () => {
    const q = query.trim();
    if (!q || searching) return;
    setSearching(true);
    try {
      const url =
        "https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=br" +
        `&accept-language=pt-BR&q=${encodeURIComponent(q)}`;
      const res = await fetch(url, {
        headers: {
          // Nominatim exige um User-Agent identificando o app (honrado no nativo;
          // no navegador o próprio UA é enviado).
          "User-Agent": "TurismoQueSeSente/1.0 (+https://www.turismoquesesente.com.br)",
          Accept: "application/json",
        },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!Array.isArray(data) || data.length === 0) {
        notify("Não encontrei esse endereço. Tente ser mais específico — inclua a cidade, ex.: \"Av. Erivan França, Natal\".");
        return;
      }
      const first = data[0];
      const lat = parseFloat(first.lat);
      const lon = parseFloat(first.lon);
      if (Number.isNaN(lat) || Number.isNaN(lon)) {
        notify("Não encontrei esse endereço. Tente novamente com outros termos.");
        return;
      }
      setSearchResult({ lat, lon, label: String(first.display_name || q) });
      setCenter({ latitude: lat, longitude: lon });
    } catch {
      notify("Não foi possível buscar o endereço agora. Verifique sua conexão e tente novamente.");
    } finally {
      setSearching(false);
    }
  };

  const markers = useMemo(
    () =>
      spots
        .filter((s) => s.latitude && s.longitude)
        .map((s) => ({
          id: s.id,
          name: s.name,
          neighborhood: s.neighborhood,
          lat: s.latitude,
          lng: s.longitude,
          category: s.category,
        })),
    [spots],
  );

  const html = useMemo(() => {
    const zoom = searchResult ? 15 : 12;
    return `<!DOCTYPE html>
<html><head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<style>
  html, body, #map { margin:0; padding:0; height:100%; width:100%; background:#0B1120; }
  .leaflet-popup-content { font-family: -apple-system, system-ui, sans-serif; font-size:14px; }
  .leaflet-popup-content-wrapper { border-radius:12px; }
  .marker-pin {
    width:32px; height:32px; border-radius:50%; background:#7C3AED;
    border:3px solid #fff; box-shadow:0 2px 8px rgba(0,0,0,.5);
    display:flex; align-items:center; justify-content:center;
    color:#fff; font-weight:bold; font-size:14px;
  }
  .user-pin {
    width:18px; height:18px; border-radius:50%; background:#10B981;
    border:3px solid #fff; box-shadow:0 0 0 8px rgba(16,185,129,0.25);
  }
  .search-pin {
    width:22px; height:22px; border-radius:50%; background:#EF4444;
    border:3px solid #fff; box-shadow:0 0 0 6px rgba(239,68,68,0.25);
  }
</style>
</head><body>
<div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
  const map = L.map('map', { zoomControl: true, attributionControl: false })
    .setView([${center.latitude}, ${center.longitude}], ${zoom});
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);

  const markers = ${JSON.stringify(markers)};
  markers.forEach((m, idx) => {
    const icon = L.divIcon({
      className: '',
      html: '<div class="marker-pin">' + (idx+1) + '</div>',
      iconSize: [32,32], iconAnchor: [16,16]
    });
    const marker = L.marker([m.lat, m.lng], { icon: icon }).addTo(map);
    const safeName = (m.name || '').replace(/</g,'&lt;');
    const safeMeta = ((m.category || '') + ' · ' + (m.neighborhood || '')).replace(/</g,'&lt;');
    marker.bindPopup(
      '<div style="min-width:160px"><strong>' + safeName + '</strong><br/>' +
      '<span style="color:#666;font-size:12px">' + safeMeta + '</span><br/>' +
      '<a href="#" onclick="window.ReactNativeWebView && window.ReactNativeWebView.postMessage(\\'spot:' + m.id + '\\'); return false;" style="color:#7C3AED;font-weight:600">Ver detalhes →</a></div>'
    );
  });

  const user = ${userCoords ? JSON.stringify(userCoords) : "null"};
  if (user) {
    const userIcon = L.divIcon({ className: '', html: '<div class="user-pin"></div>', iconSize:[18,18], iconAnchor:[9,9] });
    L.marker([user.latitude, user.longitude], { icon: userIcon }).addTo(map).bindPopup('Você está aqui');
  }

  const search = ${searchResult ? JSON.stringify(searchResult) : "null"};
  if (search) {
    const searchIcon = L.divIcon({ className: '', html: '<div class="search-pin"></div>', iconSize:[22,22], iconAnchor:[11,11] });
    L.marker([search.lat, search.lon], { icon: searchIcon }).addTo(map)
      .bindPopup('<strong>' + (search.label || '').replace(/</g,'&lt;') + '</strong>').openPopup();
  }
</script>
</body></html>`;
  }, [center, userCoords, searchResult, markers]);

  // Memoizado para o WebView não recarregar a cada tecla digitada (só quando o HTML muda).
  const webSource = useMemo(() => ({ html }), [html]);

  const onMessage = (e: any) => {
    const msg = e.nativeEvent?.data;
    if (typeof msg === "string" && msg.startsWith("spot:")) {
      const id = msg.replace("spot:", "");
      router.push(`/spot/${id}`);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()} testID="back-button" accessibilityRole="button" accessibilityLabel="Voltar">
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </TouchableOpacity>
        <Text accessibilityRole="header" style={styles.title}>Mapa de Natal</Text>
        <View style={styles.iconBtn} />
      </View>

      {/* Busca de endereço */}
      <View style={styles.searchWrap}>
        <Ionicons name="search" size={20} color={colors.textMuted} style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="Buscar endereço ou lugar"
          placeholderTextColor={colors.textMuted}
          returnKeyType="search"
          onSubmitEditing={searchAddress}
          autoCapitalize="none"
          accessibilityLabel="Buscar endereço no mapa"
          accessibilityHint="Digite um endereço ou lugar e toque em buscar para centralizar o mapa nesse ponto"
          testID="map-search-input"
        />
        <TouchableOpacity
          style={styles.searchBtn}
          onPress={searchAddress}
          disabled={searching || !query.trim()}
          accessibilityRole="button"
          accessibilityLabel="Buscar endereço"
          testID="map-search-button"
        >
          {searching ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="arrow-forward" size={20} color="#fff" />
          )}
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.brand} style={{ marginTop: 40 }} />
      ) : (
        <View style={{ flex: 1 }}>
          {Platform.OS === "web" ? (
            <iframe
              srcDoc={html}
              title="Mapa interativo de Natal com os pontos turísticos acessíveis"
              style={{ flex: 1, border: "none", width: "100%", height: "100%" } as any}
              {...({ testID: "map-iframe" } as any)}
            />
          ) : (
            <WebView
              originWhitelist={["*"]}
              source={webSource}
              onMessage={onMessage}
              style={{ flex: 1, backgroundColor: colors.bg }}
              javaScriptEnabled
              accessibilityLabel="Mapa interativo de Natal com os pontos turísticos acessíveis"
            />
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  iconBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  title: { color: colors.text, fontSize: fontSizes.h3, fontWeight: "700" },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radii.pill,
    paddingLeft: spacing.md,
    paddingRight: 4,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    height: 52,
  },
  searchInput: { flex: 1, color: colors.text, fontSize: fontSizes.body },
  searchBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
  },
});
