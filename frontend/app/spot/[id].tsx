import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";

import { colors, fontSizes, radii, spacing } from "@/src/theme";
import { api, TouristSpot } from "@/src/api";
import { useAuth } from "@/src/auth-context";
import { t } from "@/src/i18n";

type Translated = {
  name: string;
  short_description: string;
  full_description: string;
  audio_description: string;
};

export default function SpotDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, language, isFavorite, toggleFavorite } = useAuth();
  const [spot, setSpot] = useState<TouristSpot | null>(null);
  const [loading, setLoading] = useState(true);
  const [translated, setTranslated] = useState<Translated | null>(null);
  const [translating, setTranslating] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const data = await api.getSpot(id);
        setSpot(data);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  useEffect(() => {
    if (!spot || language === "pt") {
      setTranslated(null);
      return;
    }
    setTranslating(true);
    api.translate(spot.id, language)
      .then((r) => setTranslated(r))
      .catch((e) => console.warn("translation failed", e))
      .finally(() => setTranslating(false));
  }, [spot, language]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.brand} size="large" />
      </View>
    );
  }
  if (!spot) {
    return (
      <View style={styles.center}>
        <Text style={{ color: colors.text }}>Não encontrado.</Text>
      </View>
    );
  }

  const view = translated || {
    name: spot.name,
    short_description: spot.short_description,
    full_description: spot.full_description,
    audio_description: spot.audio_description,
  };

  const fav = isFavorite(spot.id);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Image source={{ uri: spot.image_url }} style={styles.heroImage} />
          <LinearGradient
            colors={["rgba(11,17,32,0.7)", "transparent", "rgba(11,17,32,0.95)"]}
            style={StyleSheet.absoluteFillObject}
          />
          <SafeAreaView style={styles.heroTop} edges={["top"]}>
            <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()} testID="back-button">
              <Ionicons name="chevron-back" size={26} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.iconBtn, fav && styles.iconBtnActive]}
              onPress={() => toggleFavorite(spot.id)}
              accessibilityLabel={fav ? "Remover dos favoritos" : "Adicionar aos favoritos"}
              testID="favorite-button"
            >
              <Ionicons name={fav ? "heart" : "heart-outline"} size={24} color={fav ? colors.brand : colors.text} />
            </TouchableOpacity>
          </SafeAreaView>
          <View style={styles.heroBottom}>
            <Text style={styles.heroCategory}>{spot.category}</Text>
            <Text style={styles.heroTitle} testID="spot-title">{view.name}</Text>
            <View style={styles.row}>
              <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
              <Text style={styles.heroLocation}>{spot.neighborhood}, Natal – RN</Text>
            </View>
          </View>
        </View>

        {translating && (
          <View style={styles.translateBanner}>
            <ActivityIndicator size="small" color={colors.brand} />
            <Text style={styles.translateText}>Traduzindo...</Text>
          </View>
        )}
        {translated && !translating && (
          <View style={[styles.translateBanner, { borderColor: colors.brand }]}>
            <Ionicons name="language" size={16} color={colors.brand} />
            <Text style={styles.translateText}>
              {language === "en" ? "Translated to English" : "Traducido al español"}
            </Text>
          </View>
        )}

        <View style={styles.badgeRow}>
          {spot.accessibility_badges.map((b) => (
            <View key={b} style={styles.badge}>
              <Ionicons name="checkmark-circle" size={14} color={colors.success} />
              <Text style={styles.badgeText}>{b}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t(language, "about")}</Text>
          <Text style={styles.description}>{view.full_description}</Text>
        </View>

        <TouchableOpacity
          style={styles.audioCta}
          onPress={() => router.push(`/audio/${spot.id}`)}
          testID="listen-audio-button"
        >
          <View style={styles.audioCtaIcon}>
            <Ionicons name="play" size={28} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.audioCtaTitle}>{t(language, "listen_audio")}</Text>
            <Text style={styles.audioCtaSubtitle}>
              {language === "en" ? "Sensory experience" : language === "es" ? "Experiencia sensorial" : "Experiência sensorial em português"}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={22} color={colors.text} />
        </TouchableOpacity>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t(language, "accessibility_info")}</Text>
          {spot.accessibility_features.map((f, idx) => (
            <View key={idx} style={styles.featureRow}>
              <View style={styles.featureIcon}>
                <MaterialCommunityIcons name="wheelchair-accessibility" size={18} color={colors.brand} />
              </View>
              <Text style={styles.featureText}>{f}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t(language, "address")}</Text>
          <View style={styles.addressBox}>
            <Ionicons name="location" size={20} color={colors.brand} />
            <Text style={styles.addressText}>{spot.address}</Text>
          </View>
          {spot.latitude && spot.longitude && (
            <TouchableOpacity
              style={styles.mapBtn}
              onPress={() => router.push("/map")}
              testID="open-map-button"
            >
              <Ionicons name="map" size={18} color={colors.brand} />
              <Text style={styles.mapBtnText}>Ver no mapa</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg },
  hero: { height: 360, position: "relative" },
  heroImage: { width: "100%", height: "100%", position: "absolute" },
  heroTop: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: spacing.md },
  iconBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: "rgba(11,17,32,0.6)",
    alignItems: "center", justifyContent: "center",
  },
  iconBtnActive: { backgroundColor: colors.badgeBg, borderWidth: 1, borderColor: colors.brand },
  heroBottom: { position: "absolute", bottom: spacing.lg, left: spacing.md, right: spacing.md },
  heroCategory: { color: colors.brandLight, fontSize: 13, fontWeight: "700", letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 },
  heroTitle: { color: "#fff", fontSize: 32, fontWeight: "800", letterSpacing: -0.5 },
  row: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6 },
  heroLocation: { color: colors.textSecondary, fontSize: 14 },
  translateBanner: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: colors.surface,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    padding: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: 1, borderColor: colors.border,
    justifyContent: "center",
  },
  translateText: { color: colors.textSecondary, fontSize: 13, fontWeight: "600" },
  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, padding: spacing.md },
  badge: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: colors.successBg,
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: radii.pill, gap: 4,
  },
  badgeText: { color: colors.success, fontSize: 12, fontWeight: "700" },
  section: { paddingHorizontal: spacing.md, marginTop: spacing.md },
  sectionTitle: { color: colors.text, fontSize: fontSizes.h3, fontWeight: "700", marginBottom: spacing.sm },
  description: { color: colors.textSecondary, fontSize: fontSizes.body, lineHeight: 24 },
  audioCta: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: colors.brand,
    marginHorizontal: spacing.md, marginTop: spacing.lg,
    padding: spacing.md, borderRadius: radii.card,
    gap: spacing.md,
    shadowColor: colors.brand, shadowOpacity: 0.5,
    shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 8,
  },
  audioCtaIcon: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center", justifyContent: "center",
  },
  audioCtaTitle: { color: "#fff", fontSize: 17, fontWeight: "800" },
  audioCtaSubtitle: { color: "rgba(255,255,255,0.85)", fontSize: 13, marginTop: 2 },
  featureRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: 10 },
  featureIcon: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.badgeBg,
    alignItems: "center", justifyContent: "center",
  },
  featureText: { color: colors.text, fontSize: fontSizes.body, flex: 1, lineHeight: 22 },
  addressBox: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    padding: spacing.md, gap: spacing.sm,
    borderWidth: 1, borderColor: colors.border,
    alignItems: "center",
  },
  addressText: { color: colors.text, flex: 1, fontSize: fontSizes.body, lineHeight: 22 },
  mapBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    marginTop: spacing.sm, padding: spacing.sm,
    backgroundColor: colors.surface, borderRadius: radii.pill,
    borderWidth: 1, borderColor: colors.brand, gap: 6,
  },
  mapBtnText: { color: colors.brand, fontWeight: "700" },
});
