import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";

import { colors, fontSizes, radii, spacing, LOGO_URL } from "@/src/theme";
import { api, TouristSpot } from "@/src/api";

const QUICK_ACCESS = [
  { key: "Praia", label: "Praias", icon: "umbrella-beach", lib: "mci" as const, route: "/near?category=Praia" },
  { key: "História e Cultura", label: "História", icon: "castle", lib: "mci" as const, route: "/near?category=Hist%C3%B3ria%20e%20Cultura" },
  { key: "Parque", label: "Parques", icon: "tree", lib: "mci" as const, route: "/near?category=Parque" },
  { key: "Hotel", label: "Hospedagem", icon: "bed", lib: "mci" as const, route: "/near?category=Hotel" },
  { key: "Cafeteria", label: "Alimentação", icon: "silverware-fork-knife", lib: "mci" as const, route: "/near?category=Cafeteria" },
  { key: "Mirante", label: "Mirantes", icon: "binoculars", lib: "mci" as const, route: "/near?category=Mirante" },
];

export default function Home() {
  const [spots, setSpots] = useState<TouristSpot[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    try {
      const data = await api.listSpots();
      setSpots(data);
    } catch (e) {
      console.warn("Failed to load spots", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const featured = spots.filter((s) => s.featured);
  const filtered = search
    ? spots.filter(
        (s) =>
          s.name.toLowerCase().includes(search.toLowerCase()) ||
          s.neighborhood.toLowerCase().includes(search.toLowerCase()),
      )
    : spots;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header} testID="home-header">
          <TouchableOpacity
            style={styles.menuBtn}
            onPress={() => router.push("/menu")}
            accessibilityLabel="Abrir menu"
            testID="open-menu-button"
          >
            <Ionicons name="menu" size={28} color={colors.text} />
          </TouchableOpacity>
          <Image source={{ uri: LOGO_URL }} style={styles.logo} resizeMode="contain" />
          <TouchableOpacity
            style={styles.menuBtn}
            onPress={() => router.push("/admin")}
            accessibilityLabel="Painel admin"
            testID="open-admin-button"
          >
            <Ionicons name="settings-outline" size={26} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Welcome */}
        <View style={styles.welcome}>
          <Text style={styles.welcomeTitle} testID="welcome-title">
            Bem-vindo(a) a Natal!
          </Text>
          <Text style={styles.welcomeSubtitle}>
            Explore a cidade com autonomia e inclusão.
          </Text>
        </View>

        {/* Search */}
        <View style={styles.searchWrap}>
          <Ionicons name="search" size={20} color={colors.textMuted} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Para onde você quer ir?"
            placeholderTextColor={colors.textMuted}
            testID="search-input"
            accessibilityLabel="Buscar pontos turísticos"
          />
          <TouchableOpacity testID="voice-button" accessibilityLabel="Buscar por voz">
            <Ionicons name="mic" size={22} color={colors.brand} />
          </TouchableOpacity>
        </View>

        {/* Accessibility banner */}
        <View style={styles.banner} testID="accessibility-banner">
          <View style={styles.bannerIcon}>
            <Ionicons name="volume-high" size={22} color={colors.brand} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerTitle}>Modo acessível ativado</Text>
            <Text style={styles.bannerText}>Navegação por voz e audiodescrição habilitadas.</Text>
          </View>
        </View>

        {/* Quick Access */}
        <Text style={styles.sectionTitle}>Acessos rápidos</Text>
        <View style={styles.quickGrid}>
          {QUICK_ACCESS.map((q) => (
            <TouchableOpacity
              key={q.key}
              style={styles.quickCard}
              onPress={() => router.push(q.route as any)}
              accessibilityLabel={q.label}
              testID={`quick-${q.key}`}
            >
              <View style={styles.quickIcon}>
                <MaterialCommunityIcons name={q.icon as any} size={26} color={colors.brand} />
              </View>
              <Text style={styles.quickLabel}>{q.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Featured */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Destaques de Natal</Text>
          <TouchableOpacity onPress={() => router.push("/near")} testID="see-all-button">
            <Text style={styles.seeAll}>Ver todos</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator color={colors.brand} size="large" style={{ marginVertical: 40 }} />
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingRight: spacing.md }}
            style={{ marginHorizontal: -spacing.md }}
          >
            {featured.map((spot) => (
              <FeaturedCard key={spot.id} spot={spot} />
            ))}
          </ScrollView>
        )}

        {/* All */}
        <Text style={[styles.sectionTitle, { marginTop: spacing.lg }]}>
          {search ? `Resultados (${filtered.length})` : "Todos os pontos turísticos"}
        </Text>
        {filtered.map((spot) => (
          <SpotListItem key={spot.id} spot={spot} />
        ))}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function FeaturedCard({ spot }: { spot: TouristSpot }) {
  return (
    <TouchableOpacity
      style={styles.featuredCard}
      onPress={() => router.push(`/spot/${spot.id}`)}
      accessibilityLabel={`Abrir ${spot.name}`}
      testID={`featured-${spot.id}`}
    >
      <Image source={{ uri: spot.image_url }} style={styles.featuredImage} />
      <View style={styles.featuredOverlay} />
      <View style={styles.featuredContent}>
        {spot.accessibility_badges[0] && (
          <View style={styles.featuredBadge}>
            <Ionicons name="checkmark-circle" size={12} color={colors.success} />
            <Text style={styles.featuredBadgeText}>{spot.accessibility_badges[0]}</Text>
          </View>
        )}
        <Text style={styles.featuredTitle} numberOfLines={2}>
          {spot.name}
        </Text>
        <View style={styles.row}>
          <Ionicons name="location-outline" size={12} color={colors.textSecondary} />
          <Text style={styles.featuredLocation}>{spot.neighborhood}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function SpotListItem({ spot }: { spot: TouristSpot }) {
  return (
    <TouchableOpacity
      style={styles.listItem}
      onPress={() => router.push(`/spot/${spot.id}`)}
      accessibilityLabel={`Abrir ${spot.name}`}
      testID={`list-${spot.id}`}
    >
      <Image source={{ uri: spot.image_url }} style={styles.listImage} />
      <View style={styles.listContent}>
        <Text style={styles.listTitle} numberOfLines={1}>
          {spot.name}
        </Text>
        <Text style={styles.listCategory}>{spot.category}</Text>
        <View style={styles.row}>
          <Ionicons name="location-outline" size={12} color={colors.textMuted} />
          <Text style={styles.listMeta}>
            {spot.neighborhood} • {spot.distance_km} km
          </Text>
        </View>
        <View style={styles.badgeRow}>
          {spot.accessibility_badges.slice(0, 2).map((b) => (
            <View key={b} style={styles.miniBadge}>
              <Text style={styles.miniBadgeText}>{b}</Text>
            </View>
          ))}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingHorizontal: spacing.md, paddingBottom: spacing.lg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
  },
  menuBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  logo: { width: 90, height: 56 },
  welcome: { marginTop: spacing.md },
  welcomeTitle: {
    color: colors.text,
    fontSize: fontSizes.h1,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  welcomeSubtitle: {
    color: colors.textSecondary,
    fontSize: fontSizes.body,
    marginTop: 4,
    lineHeight: 22,
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    height: 52,
  },
  searchInput: { flex: 1, color: colors.text, fontSize: fontSizes.body },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.badgeBg,
    borderRadius: radii.card,
    padding: spacing.md,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.brand,
    gap: spacing.md,
  },
  bannerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  bannerTitle: { color: colors.text, fontWeight: "700", fontSize: fontSizes.body },
  bannerText: { color: colors.textSecondary, fontSize: fontSizes.small, marginTop: 2 },
  sectionTitle: {
    color: colors.text,
    fontSize: fontSizes.h3,
    fontWeight: "700",
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  seeAll: { color: colors.brandLight, fontSize: fontSizes.small, fontWeight: "600" },
  quickGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  quickCard: {
    width: "31.5%",
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    padding: spacing.md,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 96,
    justifyContent: "center",
    gap: spacing.sm,
  },
  quickIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.badgeBg,
    alignItems: "center",
    justifyContent: "center",
  },
  quickLabel: { color: colors.text, fontSize: fontSizes.small, fontWeight: "600", textAlign: "center" },
  featuredCard: {
    width: 240,
    height: 280,
    borderRadius: radii.card,
    backgroundColor: colors.surface,
    overflow: "hidden",
    marginLeft: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  featuredImage: { width: "100%", height: "100%", position: "absolute" },
  featuredOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(11, 17, 32, 0.55)",
  },
  featuredContent: { flex: 1, justifyContent: "flex-end", padding: spacing.md, gap: 6 },
  featuredBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: colors.successBg,
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 4,
  },
  featuredBadgeText: { color: colors.success, fontSize: 11, fontWeight: "700" },
  featuredTitle: { color: "#fff", fontSize: 18, fontWeight: "800", lineHeight: 22 },
  row: { flexDirection: "row", alignItems: "center", gap: 4 },
  featuredLocation: { color: colors.textSecondary, fontSize: fontSizes.small },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  listImage: { width: 72, height: 72, borderRadius: 12 },
  listContent: { flex: 1, gap: 2 },
  listTitle: { color: colors.text, fontSize: fontSizes.body, fontWeight: "700" },
  listCategory: { color: colors.brandLight, fontSize: 12, fontWeight: "600" },
  listMeta: { color: colors.textMuted, fontSize: 12 },
  badgeRow: { flexDirection: "row", gap: 4, marginTop: 4, flexWrap: "wrap" },
  miniBadge: {
    backgroundColor: colors.successBg,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radii.pill,
  },
  miniBadgeText: { color: colors.success, fontSize: 10, fontWeight: "700" },
});
