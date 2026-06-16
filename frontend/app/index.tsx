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
import { resolveAssetUrl } from "@/src/asset-url";
import { useAuth } from "@/src/auth-context";
import { useSpeakOnPress, NO_SELECT_WEB } from "@/src/accessibility";
import { t } from "@/src/i18n";
import { openDirections } from "@/src/directions";
import { getCurrentCoords, distanceKm, NATAL_CENTER } from "@/src/geo";
import { useSiteConfig } from "@/src/site-config";
import { SealFooter } from "@/src/components/SealBranding";

const QUICK_ACCESS = [
  { key: "Praia", labelKey: "Praias", icon: "umbrella-beach" },
  { key: "História e Cultura", labelKey: "História", icon: "castle" },
  { key: "Parque", labelKey: "Parques", icon: "tree" },
  { key: "Hotel", labelKey: "Hospedagem", icon: "bed" },
  { key: "Cafeteria", labelKey: "Alimentação", icon: "silverware-fork-knife" },
  { key: "Mirante", labelKey: "Mirantes", icon: "binoculars" },
];

const QUICK_ACCESS_EN = ["Beaches", "History", "Parks", "Lodging", "Food", "Viewpoints"];
const QUICK_ACCESS_ES = ["Playas", "Historia", "Parques", "Alojamiento", "Comida", "Miradores"];

// Normaliza texto para busca: minúsculas e sem acentos (robusto a "maracajau" -> "Maracajaú").
const normalize = (s: string) =>
  (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

export default function Home() {
  const { user, signOut, language, setLanguage } = useAuth();
  const { config } = useSiteConfig();
  const speakOnPress = useSpeakOnPress();
  const [spots, setSpots] = useState<TouristSpot[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);

  const load = useCallback(async () => {
    try {
      const [data, location] = await Promise.all([
        api.listSpots(),
        coords ? Promise.resolve(coords) : getCurrentCoords(),
      ]);
      if (!coords && location) setCoords(location);
      setSpots(data);
    } catch (e) {
      console.warn("Failed to load spots", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [coords]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    getCurrentCoords().then((c) => c && setCoords(c));
    load();
  };

  // Compute real distance per spot (km), use as override for sorting
  const here = coords || NATAL_CENTER;
  const enriched = spots.map((s) => ({
    ...s,
    _live_distance: distanceKm(here, { latitude: s.latitude, longitude: s.longitude }) || s.distance_km,
  }));

  const featured = enriched.filter((s) => s.featured);
  // Busca robusta: ignora acentos e procura em nome, bairro, categoria e endereço.
  const q = normalize(search.trim());
  const filtered = q
    ? enriched.filter(
        (s) =>
          normalize(s.name).includes(q) ||
          normalize(s.neighborhood).includes(q) ||
          normalize(s.category).includes(q) ||
          normalize(s.address).includes(q),
      )
    : enriched;

  const labels = language === "en" ? QUICK_ACCESS_EN : language === "es" ? QUICK_ACCESS_ES : null;

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
          <Image
            source={{ uri: LOGO_URL }}
            style={styles.logo}
            resizeMode="contain"
            accessibilityLabel={`Logo ${config.app_name || "Turismo que se Sente"}`}
          />
          {user ? (
            <TouchableOpacity
              style={styles.avatarBtn}
              onPress={() => router.push("/menu")}
              accessibilityLabel="Abrir perfil"
              testID="profile-button"
            >
              {user.picture ? (
                <Image source={{ uri: user.picture }} style={styles.avatar} accessibilityLabel={`Foto de perfil de ${user.name}`} />
              ) : (
                <View style={styles.avatarFallback}>
                  <Text style={styles.avatarText}>{user.name?.[0]?.toUpperCase() || "U"}</Text>
                </View>
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.menuBtn}
              onPress={() => router.push("/login")}
              accessibilityLabel="Login"
              testID="open-login-button"
            >
              <Ionicons name="person-circle-outline" size={28} color={colors.text} />
            </TouchableOpacity>
          )}
        </View>

        {/* Welcome */}
        <View style={styles.welcome}>
          <Text accessibilityRole="header" style={styles.welcomeTitle} testID="welcome-title">
            {(() => {
              const base = language === "en" ? config.welcome_en : language === "es" ? config.welcome_es : config.welcome_pt;
              return user ? base.replace("!", `, ${user.name.split(" ")[0]}!`) : base;
            })()}
          </Text>
          <Text style={styles.welcomeSubtitle}>
            {language === "en" ? config.welcome_sub_en : language === "es" ? config.welcome_sub_es : config.welcome_sub_pt}
          </Text>
        </View>

        {/* Language switcher */}
        <View style={styles.langRow} testID="language-switcher">
          {(["pt", "en", "es"] as const).map((l) => (
            <TouchableOpacity
              key={l}
              onPress={() => setLanguage(l)}
              style={[styles.langChip, language === l && styles.langChipActive]}
              accessibilityRole="button"
              accessibilityState={{ selected: language === l }}
              accessibilityLabel={`Mudar idioma para ${l === "pt" ? "Português" : l === "en" ? "Inglês" : "Espanhol"}`}
              testID={`lang-${l}`}
            >
              <Text style={[styles.langText, language === l && styles.langTextActive]}>
                {l === "pt" ? "🇧🇷 PT" : l === "en" ? "🇺🇸 EN" : "🇪🇸 ES"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Search */}
        <View style={styles.searchWrap}>
          <Ionicons name="search" size={20} color={colors.textMuted} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder={t(language, "search_placeholder")}
            placeholderTextColor={colors.textMuted}
            accessibilityLabel="Buscar pontos turísticos por nome, bairro, categoria ou endereço"
            testID="search-input"
          />
          <TouchableOpacity testID="voice-button" accessibilityRole="button" accessibilityLabel="Buscar por voz">
            <Ionicons name="mic" size={22} color={colors.brand} />
          </TouchableOpacity>
        </View>

        {/* Accessibility banner */}
        <View style={styles.banner}>
          <View style={styles.bannerIcon}>
            <Ionicons name="volume-high" size={22} color={colors.brand} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerTitle}>{t(language, "accessibility_mode")}</Text>
            <Text style={styles.bannerText}>{t(language, "accessibility_mode_sub")}</Text>
          </View>
        </View>

        {/* Main shortcuts */}
        <View style={styles.mainShortcuts}>
          <Shortcut icon="map" label={t(language, "map")} color="#3B82F6" onPress={() => router.push("/map")} testID="goto-map" />
          <Shortcut icon="people" label={language === "en" ? "Guides" : language === "es" ? "Guías" : "Guias"} color="#F59E0B" onPress={() => router.push("/guides")} testID="goto-guides" />
          <Shortcut icon="storefront" label={t(language, "marketplace")} color={colors.brand} onPress={() => router.push("/marketplace")} testID="goto-marketplace" />
          <Shortcut icon="navigate" label={t(language, "near_me")} color={colors.success} onPress={() => router.push("/near")} testID="goto-near" />
          <Shortcut icon="information-circle" label={language === "en" ? "About" : language === "es" ? "Acerca" : "Sobre"} color="#10B981" onPress={() => router.push("/about")} testID="goto-about" />
          <Shortcut icon="warning" label={t(language, "emergency")} color={colors.error} onPress={() => router.push("/emergency")} testID="goto-emergency" />
        </View>

        {/* Quick Access */}
        <Text accessibilityRole="header" style={styles.sectionTitle}>{t(language, "quick_access")}</Text>
        <View style={styles.quickGrid}>
          {QUICK_ACCESS.map((q, idx) => (
            <TouchableOpacity
              key={q.key}
              style={[styles.quickCard, NO_SELECT_WEB]}
              onPress={() => router.push(`/near?category=${encodeURIComponent(q.key)}` as any)}
              onLongPress={() => speakOnPress(labels ? labels[idx] : q.labelKey)}
              accessibilityRole="button"
              accessibilityLabel={`Ver atrativos da categoria ${labels ? labels[idx] : q.labelKey}`}
              testID={`quick-${q.key}`}
            >
              <View style={styles.quickIcon}>
                <MaterialCommunityIcons name={q.icon as any} size={26} color={colors.brand} />
              </View>
              <Text style={styles.quickLabel}>{labels ? labels[idx] : q.labelKey}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Featured */}
        <View style={styles.sectionHeader}>
          <Text accessibilityRole="header" style={styles.sectionTitle}>{t(language, "featured")}</Text>
          <TouchableOpacity onPress={() => router.push("/near")} testID="see-all-button" accessibilityRole="button" accessibilityLabel="Ver todos os atrativos em destaque">
            <Text style={styles.seeAll}>{t(language, "see_all")}</Text>
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
        <Text accessibilityRole="header" style={[styles.sectionTitle, { marginTop: spacing.lg }]}>
          {search ? `Resultados (${filtered.length})` : t(language, "all_spots")}
        </Text>
        {filtered.map((spot) => (
          <SpotListItem key={spot.id} spot={spot} />
        ))}

        <View style={{ height: 16 }} />
        <SealFooter />
        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Shortcut({ icon, label, color, onPress, testID }: {
  icon: keyof typeof Ionicons.glyphMap; label: string; color: string; onPress: () => void; testID: string;
}) {
  const speakOnPress = useSpeakOnPress();
  return (
    <TouchableOpacity
      style={[styles.shortcut, NO_SELECT_WEB]}
      onPress={onPress}
      onLongPress={() => speakOnPress(label)}
      testID={testID}
      accessibilityLabel={label}
    >
      <View style={[styles.shortcutIcon, { backgroundColor: color + "25" }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <Text style={styles.shortcutLabel} numberOfLines={1}>{label}</Text>
    </TouchableOpacity>
  );
}

function FeaturedCard({ spot }: { spot: TouristSpot & { _live_distance?: number } }) {
  const speakOnPress = useSpeakOnPress();
  const { language } = useAuth();
  const spokenName = spot.translations?.[language]?.name || spot.name;
  return (
    <TouchableOpacity
      style={[styles.featuredCard, NO_SELECT_WEB]}
      onPress={() => router.push(`/spot/${spot.id}`)}
      onLongPress={() => speakOnPress(spokenName)}
      accessibilityRole="button"
      accessibilityLabel={`${spot.name}, ${spot.category} em ${spot.neighborhood}. Atrativo em destaque. Toque para ver detalhes; segure para ouvir o nome.`}
      testID={`featured-${spot.id}`}
    >
      <Image
        source={{ uri: resolveAssetUrl(spot.image_url) }}
        style={styles.featuredImage}
        accessibilityLabel={spot.image_alt || `Foto de ${spot.name}`}
      />
      <View style={styles.featuredOverlay} />
      <TouchableOpacity
        style={[styles.routeFab, NO_SELECT_WEB]}
        onPress={(e) => {
          e?.stopPropagation?.();
          openDirections({ latitude: spot.latitude, longitude: spot.longitude, address: spot.address });
        }}
        onLongPress={() => speakOnPress(t(language, "directions"))}
        accessibilityRole="button"
        accessibilityLabel={`Traçar rota até ${spokenName} no Google Maps`}
        testID={`route-featured-${spot.id}`}
      >
        <Ionicons name="navigate" size={16} color="#fff" />
      </TouchableOpacity>
      <View style={styles.featuredContent}>
        {spot.accessibility_badges[0] && (
          <View style={styles.featuredBadge}>
            <Ionicons name="checkmark-circle" size={12} color={colors.success} />
            <Text style={styles.featuredBadgeText}>{spot.accessibility_badges[0]}</Text>
          </View>
        )}
        <Text style={styles.featuredTitle} numberOfLines={2}>{spot.name}</Text>
        <View style={styles.row}>
          <Ionicons name="location-outline" size={12} color={colors.textSecondary} />
          <Text style={styles.featuredLocation}>{spot.neighborhood}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function SpotListItem({ spot }: { spot: TouristSpot & { _live_distance?: number } }) {
  const speakOnPress = useSpeakOnPress();
  const { language } = useAuth();
  const spokenName = spot.translations?.[language]?.name || spot.name;
  const dist = spot._live_distance ?? spot.distance_km;
  return (
    <TouchableOpacity
      style={[styles.listItem, NO_SELECT_WEB]}
      onPress={() => router.push(`/spot/${spot.id}`)}
      onLongPress={() => speakOnPress(spokenName)}
      accessibilityRole="button"
      accessibilityLabel={`${spot.name}, ${spot.category} em ${spot.neighborhood}, a ${dist < 1 ? `${Math.round(dist * 1000)} metros` : `${dist.toFixed(1)} quilômetros`}. Toque para ver detalhes; segure para ouvir o nome.`}
      testID={`list-${spot.id}`}
    >
      <Image
        source={{ uri: resolveAssetUrl(spot.image_url) }}
        style={styles.listImage}
        accessibilityLabel={spot.image_alt || `Foto de ${spot.name}`}
      />
      <View style={styles.listContent}>
        <Text style={styles.listTitle} numberOfLines={1}>{spot.name}</Text>
        <Text style={styles.listCategory}>{spot.category}</Text>
        <View style={styles.row}>
          <Ionicons name="location-outline" size={12} color={colors.textMuted} />
          <Text style={styles.listMeta}>
            {spot.neighborhood} • {dist < 1 ? `${Math.round(dist * 1000)} m` : `${dist.toFixed(1)} km`}
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
      <TouchableOpacity
        style={[styles.routeBtn, NO_SELECT_WEB]}
        onPress={(e) => {
          e?.stopPropagation?.();
          openDirections({ latitude: spot.latitude, longitude: spot.longitude, address: spot.address });
        }}
        onLongPress={() => speakOnPress(t(language, "directions"))}
        accessibilityRole="button"
        accessibilityLabel={`Traçar rota até ${spokenName} no Google Maps`}
        testID={`route-list-${spot.id}`}
      >
        <Ionicons name="navigate" size={18} color={colors.brand} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingHorizontal: spacing.md, paddingBottom: spacing.lg },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: spacing.sm },
  menuBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  avatarBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  avatar: { width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: colors.brand },
  avatarFallback: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: colors.brand,
    alignItems: "center", justifyContent: "center",
  },
  avatarText: { color: "#fff", fontWeight: "800" },
  logo: { width: 90, height: 56 },
  welcome: { marginTop: spacing.sm },
  welcomeTitle: { color: colors.text, fontSize: fontSizes.h1, fontWeight: "800", letterSpacing: -0.5 },
  welcomeSubtitle: { color: colors.textSecondary, fontSize: fontSizes.body, marginTop: 4, lineHeight: 22 },
  langRow: { flexDirection: "row", gap: 6, marginTop: spacing.sm },
  langChip: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
  },
  langChipActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  langText: { color: colors.textSecondary, fontSize: 12, fontWeight: "700" },
  langTextActive: { color: "#fff" },
  searchWrap: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    marginTop: spacing.md,
    borderWidth: 1, borderColor: colors.border, height: 52,
  },
  searchInput: { flex: 1, color: colors.text, fontSize: fontSizes.body },
  banner: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: colors.badgeBg, borderRadius: radii.card,
    padding: spacing.md, marginTop: spacing.md,
    borderWidth: 1, borderColor: colors.brand, gap: spacing.md,
  },
  bannerIcon: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.bg,
    alignItems: "center", justifyContent: "center",
  },
  bannerTitle: { color: colors.text, fontWeight: "700", fontSize: fontSizes.body },
  bannerText: { color: colors.textSecondary, fontSize: fontSizes.small, marginTop: 2 },
  mainShortcuts: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md, flexWrap: "wrap" },
  shortcut: {
    flexBasis: "31%", flexGrow: 1, minWidth: 90,
    alignItems: "center", gap: 6,
    backgroundColor: colors.surface,
    paddingVertical: spacing.sm,
    paddingHorizontal: 4,
    borderRadius: radii.card,
    borderWidth: 1, borderColor: colors.border,
  },
  shortcutIcon: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  shortcutLabel: { color: colors.text, fontSize: 11, fontWeight: "700" },
  sectionTitle: { color: colors.text, fontSize: fontSizes.h3, fontWeight: "700", marginTop: spacing.lg, marginBottom: spacing.sm },
  sectionHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    marginTop: spacing.lg, marginBottom: spacing.sm,
  },
  seeAll: { color: colors.brandLight, fontSize: fontSizes.small, fontWeight: "600" },
  quickGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  quickCard: {
    width: "31.5%",
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    padding: spacing.md,
    alignItems: "center",
    borderWidth: 1, borderColor: colors.border,
    minHeight: 96, justifyContent: "center", gap: spacing.sm,
  },
  quickIcon: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.badgeBg,
    alignItems: "center", justifyContent: "center",
  },
  quickLabel: { color: colors.text, fontSize: fontSizes.small, fontWeight: "600", textAlign: "center" },
  featuredCard: {
    width: 240, height: 280,
    borderRadius: radii.card,
    backgroundColor: colors.surface,
    overflow: "hidden",
    marginLeft: spacing.md,
    borderWidth: 1, borderColor: colors.border,
  },
  featuredImage: { width: "100%", height: "100%", position: "absolute" },
  featuredOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(11, 17, 32, 0.55)" },
  routeFab: {
    position: "absolute", top: spacing.sm, right: spacing.sm,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.brand,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.6)",
  },
  routeBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.badgeBg,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: colors.border,
  },
  featuredContent: { flex: 1, justifyContent: "flex-end", padding: spacing.md, gap: 6 },
  featuredBadge: {
    flexDirection: "row", alignItems: "center", alignSelf: "flex-start",
    backgroundColor: colors.successBg,
    borderRadius: radii.pill,
    paddingHorizontal: 10, paddingVertical: 4, gap: 4,
  },
  featuredBadgeText: { color: colors.success, fontSize: 11, fontWeight: "700" },
  featuredTitle: { color: "#fff", fontSize: 18, fontWeight: "800", lineHeight: 22 },
  row: { flexDirection: "row", alignItems: "center", gap: 4 },
  featuredLocation: { color: colors.textSecondary, fontSize: fontSizes.small },
  listItem: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    borderWidth: 1, borderColor: colors.border, gap: spacing.md,
  },
  listImage: { width: 72, height: 72, borderRadius: 12 },
  listContent: { flex: 1, gap: 2 },
  listTitle: { color: colors.text, fontSize: fontSizes.body, fontWeight: "700" },
  listCategory: { color: colors.brandLight, fontSize: 12, fontWeight: "600" },
  listMeta: { color: colors.textMuted, fontSize: 12 },
  badgeRow: { flexDirection: "row", gap: 4, marginTop: 4, flexWrap: "wrap" },
  miniBadge: { backgroundColor: colors.successBg, paddingHorizontal: 8, paddingVertical: 2, borderRadius: radii.pill },
  miniBadgeText: { color: colors.success, fontSize: 10, fontWeight: "700" },
});
