import { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { WebView } from "react-native-webview";

import { colors, fontSizes, spacing } from "@/src/theme";
import { api, TouristSpot } from "@/src/api";
import { getCurrentCoords, NATAL_CENTER } from "@/src/geo";

export default function MapScreen() {
  const [spots, setSpots] = useState<TouristSpot[]>([]);
  const [center, setCenter] = useState<{ latitude: number; longitude: number }>(NATAL_CENTER);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [list, coords] = await Promise.all([api.listSpots(), getCurrentCoords()]);
        setSpots(list);
        if (coords) setCenter(coords);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const markers = spots
    .filter((s) => s.latitude && s.longitude)
    .map((s) => ({
      id: s.id,
      name: s.name.replace(/'/g, "\\'"),
      neighborhood: s.neighborhood.replace(/'/g, "\\'"),
      lat: s.latitude,
      lng: s.longitude,
      category: s.category,
    }));

  const html = `<!DOCTYPE html>
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
</style>
</head><body>
<div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
  const map = L.map('map', { zoomControl: true, attributionControl: false })
    .setView([${center.latitude}, ${center.longitude}], 12);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);

  const markers = ${JSON.stringify(markers)};
  markers.forEach((m, idx) => {
    const icon = L.divIcon({
      className: '',
      html: '<div class="marker-pin">' + (idx+1) + '</div>',
      iconSize: [32,32], iconAnchor: [16,16]
    });
    const marker = L.marker([m.lat, m.lng], { icon: icon }).addTo(map);
    marker.bindPopup(
      '<div style="min-width:160px"><strong>' + m.name + '</strong><br/>' +
      '<span style="color:#666;font-size:12px">' + m.category + ' · ' + m.neighborhood + '</span><br/>' +
      '<a href="#" onclick="window.ReactNativeWebView && window.ReactNativeWebView.postMessage(\\'spot:' + m.id + '\\'); return false;" style="color:#7C3AED;font-weight:600">Ver detalhes →</a></div>'
    );
  });

  const userIcon = L.divIcon({ className: '', html: '<div class="user-pin"></div>', iconSize:[18,18], iconAnchor:[9,9] });
  L.marker([${center.latitude}, ${center.longitude}], { icon: userIcon }).addTo(map).bindPopup('Você está aqui');
</script>
</body></html>`;

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

      {loading ? (
        <ActivityIndicator size="large" color={colors.brand} style={{ marginTop: 40 }} />
      ) : (
        <View style={{ flex: 1 }}>
          {Platform.OS === "web" ? (
            <iframe
              srcDoc={html}
              title="Mapa interativo de Natal com os pontos turísticos acessíveis"
              style={{ flex: 1, border: "none", width: "100%", height: "100%" } as any}
              testID="map-iframe"
            />
          ) : (
            <WebView
              originWhitelist={["*"]}
              source={{ html }}
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
});
