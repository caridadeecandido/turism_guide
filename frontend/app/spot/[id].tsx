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

export default function SpotDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [spot, setSpot] = useState<TouristSpot | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const data = await api.getSpot(id);
        setSpot(data);
      } catch (e) {
        console.warn(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

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
        <Text style={{ color: colors.text }}>Ponto turístico não encontrado.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={styles.hero}>
          <Image source={{ uri: spot.image_url }} style={styles.heroImage} />
          <LinearGradient
            colors={["rgba(11,17,32,0.7)", "transparent", "rgba(11,17,32,0.95)"]}
            style={StyleSheet.absoluteFillObject}
          />
          <SafeAreaView style={styles.heroTop} edges={["top"]}>
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => router.back()}
              accessibilityLabel="Voltar"
              testID="back-button"
            >
              <Ionicons name="chevron-back" size={26} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn} accessibilityLabel="Favoritar" testID="favorite-button">
              <Ionicons name="heart-outline" size={26} color={colors.text} />
            </TouchableOpacity>
          </SafeAreaView>
          <View style={styles.heroBottom}>
            <Text style={styles.heroCategory}>{spot.category}</Text>
            <Text style={styles.heroTitle} testID="spot-title">
              {spot.name}
            </Text>
            <View style={styles.row}>
              <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
              <Text style={styles.heroLocation}>
                {spot.neighborhood}, Natal – RN
              </Text>
            </View>
          </View>
        </View>

        {/* Badges */}
        <View style={styles.badgeRow}>
          {spot.accessibility_badges.map((b) => (
            <View key={b} style={styles.badge}>
              <Ionicons name="checkmark-circle" size={14} color={colors.success} />
              <Text style={styles.badgeText}>{b}</Text>
            </View>
          ))}
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sobre este local</Text>
          <Text style={styles.description}>{spot.full_description}</Text>
        </View>

        {/* Audio CTA */}
        <TouchableOpacity
          style={styles.audioCta}
          onPress={() => router.push(`/audio/${spot.id}`)}
          accessibilityLabel="Ouvir audiodescrição"
          testID="listen-audio-button"
        >
          <View style={styles.audioCtaIcon}>
            <Ionicons name="play" size={28} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.audioCtaTitle}>Ouvir audiodescrição</Text>
            <Text style={styles.audioCtaSubtitle}>
              Experiência sensorial em português
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={22} color={colors.text} />
        </TouchableOpacity>

        {/* Accessibility Features */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informações de acessibilidade</Text>
          {spot.accessibility_features.map((f, idx) => (
            <View key={idx} style={styles.featureRow}>
              <View style={styles.featureIcon}>
                <MaterialCommunityIcons name="wheelchair-accessibility" size={18} color={colors.brand} />
              </View>
              <Text style={styles.featureText}>{f}</Text>
            </View>
          ))}
        </View>

        {/* Address */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Endereço</Text>
          <View style={styles.addressBox}>
            <Ionicons name="location" size={20} color={colors.brand} />
            <Text style={styles.addressText}>{spot.address}</Text>
          </View>
          <View style={[styles.row, { marginTop: spacing.sm }]}>
            <Ionicons name="walk" size={16} color={colors.textSecondary} />
            <Text style={styles.distanceText}>A {spot.distance_km} km de você</Text>
          </View>
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
  heroTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(11,17,32,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroBottom: { position: "absolute", bottom: spacing.lg, left: spacing.md, right: spacing.md },
  heroCategory: {
    color: colors.brandLight,
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  heroTitle: { color: "#fff", fontSize: 32, fontWeight: "800", letterSpacing: -0.5 },
  row: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6 },
  heroLocation: { color: colors.textSecondary, fontSize: 14 },
  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, padding: spacing.md },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.successBg,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.pill,
    gap: 4,
  },
  badgeText: { color: colors.success, fontSize: 12, fontWeight: "700" },
  section: { paddingHorizontal: spacing.md, marginTop: spacing.md },
  sectionTitle: {
    color: colors.text,
    fontSize: fontSizes.h3,
    fontWeight: "700",
    marginBottom: spacing.sm,
  },
  description: { color: colors.textSecondary, fontSize: fontSizes.body, lineHeight: 24 },
  audioCta: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.brand,
    marginHorizontal: spacing.md,
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: radii.card,
    gap: spacing.md,
    shadowColor: colors.brand,
    shadowOpacity: 0.5,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  audioCtaIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  audioCtaTitle: { color: "#fff", fontSize: 17, fontWeight: "800" },
  audioCtaSubtitle: { color: "rgba(255,255,255,0.85)", fontSize: 13, marginTop: 2 },
  featureRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: 10 },
  featureIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.badgeBg,
    alignItems: "center",
    justifyContent: "center",
  },
  featureText: { color: colors.text, fontSize: fontSizes.body, flex: 1, lineHeight: 22 },
  addressBox: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    padding: spacing.md,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  addressText: { color: colors.text, flex: 1, fontSize: fontSizes.body, lineHeight: 22 },
  distanceText: { color: colors.textSecondary, fontSize: fontSizes.small },
});
