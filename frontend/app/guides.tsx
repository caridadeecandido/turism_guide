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
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";

import { colors, fontSizes, radii, spacing } from "@/src/theme";
import { api, Guide } from "@/src/api";
import { resolveAssetUrl } from "@/src/asset-url";
import { useSiteConfig } from "@/src/site-config";
import { SealFooter, SealCircle } from "@/src/components/SealBranding";

export default function GuidesList() {
  const { config } = useSiteConfig();
  const [guides, setGuides] = useState<Guide[]>([]);
  const [loading, setLoading] = useState(true);
  const [specialties, setSpecialties] = useState<string[]>(["Todos"]);
  const [focusFilters, setFocusFilters] = useState<string[]>([]);
  const [activeSpec, setActiveSpec] = useState("Todos");
  const [activeFocus, setActiveFocus] = useState<string | null>(null);

  const loadCategories = useCallback(async () => {
    try {
      const r = await api.guideCategories();
      setSpecialties(r.specialties);
      setFocusFilters(r.accessibility_focus);
    } catch (e) {
      console.warn("guideCategories", e);
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.listGuides({
        specialty: activeSpec,
        focus: activeFocus || undefined,
      });
      setGuides(data);
    } finally {
      setLoading(false);
    }
  }, [activeSpec, activeFocus]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Voltar" testID="back-button">
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </TouchableOpacity>
        <Text accessibilityRole="header" style={styles.title}>Guias Certificados</Text>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.push("/seal")} accessibilityRole="button" accessibilityLabel="Sobre o selo Categoria Ouro" testID="open-seal-button">
          <Ionicons name="ribbon" size={22} color={colors.brand} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing.xl }}>
        <View style={styles.hero}>
          <View style={styles.heroIconWrap}>
            <SealCircle size={72} />
          </View>
          <Text accessibilityRole="header" style={styles.heroTitle}>Guias com Selo Categoria Ouro</Text>
          <Text style={styles.heroSub}>
            Profissionais capacitados no Curso Turismo que se Sente (120h) — especialistas em audiodescrição, Libras, atendimento a PCD e neurodivergentes.
          </Text>
        </View>

        {/* Specialty chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
        >
          {specialties.map((s) => (
            <TouchableOpacity
              key={s}
              onPress={() => setActiveSpec(s)}
              style={[styles.chip, activeSpec === s && styles.chipActive]}
              accessibilityRole="button"
              accessibilityState={{ selected: activeSpec === s }}
              accessibilityLabel={`Filtrar guias por especialidade: ${s}`}
              testID={`spec-${s}`}
            >
              <Text style={[styles.chipText, activeSpec === s && styles.chipTextActive]}>{s}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Accessibility focus chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
        >
          <TouchableOpacity
            onPress={() => setActiveFocus(null)}
            style={[styles.chipSm, !activeFocus && styles.chipActive]}
            accessibilityRole="button"
            accessibilityState={{ selected: !activeFocus }}
            accessibilityLabel="Mostrar guias de todas as acessibilidades"
            testID="focus-all"
          >
            <Ionicons name="accessibility" size={12} color={!activeFocus ? "#fff" : colors.brand} />
            <Text style={[styles.chipSmText, !activeFocus && styles.chipTextActive]}>Todas acessibilidades</Text>
          </TouchableOpacity>
          {focusFilters.map((f) => (
            <TouchableOpacity
              key={f}
              onPress={() => setActiveFocus(f === activeFocus ? null : f)}
              style={[styles.chipSm, activeFocus === f && styles.chipActive]}
              accessibilityRole="button"
              accessibilityState={{ selected: activeFocus === f }}
              accessibilityLabel={`Filtrar guias por acessibilidade: ${f}`}
              testID={`focus-${f}`}
            >
              <Text style={[styles.chipSmText, activeFocus === f && styles.chipTextActive]}>{f}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {loading ? (
          <ActivityIndicator color={colors.brand} style={{ marginTop: 30 }} />
        ) : guides.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="person-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyText}>Nenhum guia encontrado com esses filtros.</Text>
          </View>
        ) : (
          guides.map((g) => <GuideCard key={g.id} guide={g} />)
        )}

        <View style={{ height: spacing.md }} />
        <SealFooter />
      </ScrollView>
    </SafeAreaView>
  );
}

function GuideCard({ guide }: { guide: Guide }) {
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/guide/${guide.id}`)}
      accessibilityRole="button"
      accessibilityLabel={`Ver perfil de ${guide.name}, ${guide.short_bio}`}
      testID={`guide-card-${guide.id}`}
    >
      <View style={styles.photoWrap}>
        {guide.photo_url ? (
          <Image
            source={{ uri: resolveAssetUrl(guide.photo_url) }}
            style={styles.photo}
            accessibilityLabel={guide.photo_alt || `Foto de ${guide.name}`}
          />
        ) : (
          <View style={[styles.photo, styles.photoPlaceholder]}>
            <Ionicons name="person" size={48} color={colors.textMuted} />
          </View>
        )}
        {guide.has_seal && (
          <View style={styles.sealBadge} accessibilityLabel="Possui selo Categoria Ouro">
            <Ionicons name="ribbon" size={14} color="#fff" />
          </View>
        )}
      </View>

      <View style={{ flex: 1 }}>
        <View style={styles.row}>
          <Text style={styles.name} numberOfLines={1}>{guide.name}</Text>
          {guide.featured && (
            <View style={styles.featured}>
              <Ionicons name="star" size={10} color="#fff" />
            </View>
          )}
        </View>
        <Text style={styles.shortBio} numberOfLines={2}>{guide.short_bio}</Text>

        <View style={styles.rowWrap}>
          {guide.specialties.slice(0, 3).map((s) => (
            <View key={s} style={styles.badge}>
              <Text style={styles.badgeText}>{s}</Text>
            </View>
          ))}
        </View>

        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Ionicons name="language" size={12} color={colors.textSecondary} />
            <Text style={styles.metaText} numberOfLines={1}>
              {guide.languages.join(" · ")}
            </Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="star" size={12} color="#F59E0B" />
            <Text style={styles.metaText}>{guide.rating.toFixed(1)}</Text>
          </View>
        </View>

        {guide.accessibility_focus.length > 0 && (
          <View style={styles.focusRow}>
            <MaterialCommunityIcons name="hand-heart" size={12} color={colors.brandLight} />
            <Text style={styles.focusText} numberOfLines={1}>
              {guide.accessibility_focus.join(" · ")}
            </Text>
          </View>
        )}
      </View>

      <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
    </TouchableOpacity>
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

  hero: {
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  heroIconWrap: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: colors.badgeBg,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.brand,
    overflow: "hidden",
    marginBottom: spacing.sm,
  },
  heroSeal: { width: 72, height: 72 },
  heroTitle: { color: colors.text, fontSize: fontSizes.h3, fontWeight: "800", textAlign: "center" },
  heroSub: {
    color: colors.textSecondary,
    fontSize: fontSizes.small,
    textAlign: "center",
    marginTop: 6,
    lineHeight: 18,
    paddingHorizontal: spacing.sm,
  },

  chips: { paddingHorizontal: spacing.md, gap: 8, paddingVertical: spacing.sm },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipSm: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  chipText: { color: colors.text, fontWeight: "600", fontSize: 13 },
  chipSmText: { color: colors.text, fontWeight: "600", fontSize: 11 },
  chipTextActive: { color: "#fff" },

  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  photoWrap: { width: 80, height: 80, position: "relative" },
  photo: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.surfaceElevated },
  photoPlaceholder: { alignItems: "center", justifyContent: "center" },
  sealBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.surface,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 6 },
  rowWrap: { flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 6 },
  name: { color: colors.text, fontSize: fontSizes.body, fontWeight: "700", flex: 1 },
  featured: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#F59E0B",
    alignItems: "center",
    justifyContent: "center",
  },
  shortBio: { color: colors.textSecondary, fontSize: 12, marginTop: 2, lineHeight: 17 },
  badge: {
    backgroundColor: colors.badgeBg,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radii.pill,
  },
  badgeText: { color: colors.brand, fontSize: 10, fontWeight: "700" },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 6 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { color: colors.textSecondary, fontSize: 11 },
  focusRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  focusText: { color: colors.brandLight, fontSize: 10, fontWeight: "600", flex: 1 },

  empty: { alignItems: "center", paddingVertical: 40, gap: 8 },
  emptyText: { color: colors.textMuted, fontSize: fontSizes.small, textAlign: "center" },
});
