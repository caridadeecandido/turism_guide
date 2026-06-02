import { useEffect, useState, useCallback } from "react";
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
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";

import { colors, fontSizes, radii, spacing } from "@/src/theme";
import { api, TouristSpot } from "@/src/api";

export default function NearMe() {
  const params = useLocalSearchParams<{ category?: string }>();
  const [spots, setSpots] = useState<TouristSpot[]>([]);
  const [categories, setCategories] = useState<string[]>(["Todos"]);
  const [activeCategory, setActiveCategory] = useState<string>(params.category || "Todos");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [list, cats] = await Promise.all([
        api.listSpots(activeCategory),
        api.categories(),
      ]);
      setSpots(list.sort((a, b) => a.distance_km - b.distance_km));
      setCategories(cats.categories);
    } finally {
      setLoading(false);
    }
  }, [activeCategory]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => router.back()}
          accessibilityLabel="Voltar"
          testID="back-button"
        >
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Perto de mim</Text>
        <View style={styles.iconBtn} />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
        style={{ flexGrow: 0 }}
      >
        {categories.map((cat) => {
          const active = cat === activeCategory;
          return (
            <TouchableOpacity
              key={cat}
              onPress={() => setActiveCategory(cat)}
              style={[styles.filterChip, active && styles.filterChipActive]}
              testID={`filter-${cat}`}
              accessibilityLabel={`Filtrar por ${cat}`}
            >
              <Text style={[styles.filterText, active && styles.filterTextActive]}>{cat}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {loading ? (
        <ActivityIndicator color={colors.brand} size="large" style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {spots.length === 0 && (
            <Text style={styles.emptyText}>Nenhum ponto encontrado nesta categoria.</Text>
          )}
          {spots.map((spot) => (
            <TouchableOpacity
              key={spot.id}
              style={styles.card}
              onPress={() => router.push(`/spot/${spot.id}`)}
              accessibilityLabel={`Abrir ${spot.name}`}
              testID={`spot-${spot.id}`}
            >
              <Image source={{ uri: spot.image_url }} style={styles.cardImage} />
              <View style={styles.cardBody}>
                <View style={styles.cardTopRow}>
                  <Text style={styles.cardTitle} numberOfLines={1}>
                    {spot.name}
                  </Text>
                  <View style={styles.distancePill}>
                    <Ionicons name="walk" size={11} color={colors.brandLight} />
                    <Text style={styles.distanceText}>{spot.distance_km} km</Text>
                  </View>
                </View>
                <Text style={styles.cardCategory}>{spot.category}</Text>
                <Text style={styles.cardLocation} numberOfLines={1}>
                  <Ionicons name="location-outline" size={11} color={colors.textMuted} />{" "}
                  {spot.neighborhood}
                </Text>
                <View style={styles.badgeRow}>
                  {spot.accessibility_badges.slice(0, 3).map((b) => (
                    <View key={b} style={styles.badge}>
                      <Ionicons name="checkmark-circle" size={10} color={colors.success} />
                      <Text style={styles.badgeText}>{b}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </TouchableOpacity>
          ))}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      <TouchableOpacity
        style={styles.updateBtn}
        onPress={load}
        accessibilityLabel="Atualizar localização"
        testID="refresh-button"
      >
        <Ionicons name="refresh" size={20} color="#fff" />
        <Text style={styles.updateText}>Atualizar minha localização</Text>
      </TouchableOpacity>
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
  headerTitle: { color: colors.text, fontSize: fontSizes.h3, fontWeight: "700" },
  filterRow: { paddingHorizontal: spacing.md, gap: spacing.sm, paddingVertical: spacing.sm },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    backgroundColor: colors.surface,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.sm,
  },
  filterChipActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  filterText: { color: colors.textSecondary, fontSize: 13, fontWeight: "600" },
  filterTextActive: { color: "#fff" },
  list: { padding: spacing.md, gap: spacing.md },
  emptyText: { color: colors.textMuted, textAlign: "center", marginTop: 40, fontSize: fontSizes.body },
  card: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  cardImage: { width: 110, height: 130 },
  cardBody: { flex: 1, padding: spacing.sm, gap: 2 },
  cardTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  cardTitle: { color: colors.text, fontSize: fontSizes.body, fontWeight: "700", flex: 1, marginRight: 8 },
  distancePill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.badgeBg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.pill,
    gap: 3,
  },
  distanceText: { color: colors.brandLight, fontSize: 11, fontWeight: "700" },
  cardCategory: { color: colors.brandLight, fontSize: 12, fontWeight: "600", marginTop: 2 },
  cardLocation: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 6 },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.successBg,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.pill,
    gap: 3,
  },
  badgeText: { color: colors.success, fontSize: 10, fontWeight: "700" },
  updateBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.brand,
    margin: spacing.md,
    paddingVertical: 14,
    borderRadius: radii.pill,
    gap: 8,
    shadowColor: colors.brand,
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 6,
  },
  updateText: { color: "#fff", fontWeight: "800", fontSize: fontSizes.body },
});
