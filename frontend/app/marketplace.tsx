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
import { router } from "expo-router";

import { colors, fontSizes, radii, spacing } from "@/src/theme";
import { api, Partner } from "@/src/api";
import { resolveAssetUrl } from "@/src/asset-url";

const CATEGORIES = ["Todos", "Hospedagem", "Alimentação", "Passeio"];

export default function Marketplace() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState("Todos");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setPartners(await api.listPartners(active));
    } finally {
      setLoading(false);
    }
  }, [active]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Voltar" testID="back-button">
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </TouchableOpacity>
        <Text accessibilityRole="header" style={styles.title}>Parceiros Acessíveis</Text>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.push("/seal")} accessibilityRole="button" accessibilityLabel="Sobre o selo Categoria Ouro" testID="open-seal-button">
          <Ionicons name="ribbon" size={22} color={colors.brand} />
        </TouchableOpacity>
      </View>

      <View style={styles.hero}>
        <Text accessibilityRole="header" style={styles.heroTitle}>Hotéis · Restaurantes · Passeios</Text>
        <Text style={styles.heroSubtitle}>
          Estabelecimentos certificados pelo selo Turismo que se Sente.
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
        style={{ flexGrow: 0 }}
      >
        {CATEGORIES.map((c) => {
          const isActive = c === active;
          return (
            <TouchableOpacity
              key={c}
              onPress={() => setActive(c)}
              style={[styles.chip, isActive && styles.chipActive]}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={`Filtrar parceiros por categoria: ${c}`}
              testID={`filter-${c}`}
            >
              <Text style={[styles.chipText, isActive && styles.chipTextActive]}>{c}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {loading ? (
        <ActivityIndicator color={colors.brand} size="large" style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {partners.length === 0 && (
            <Text style={styles.empty}>Nenhum parceiro encontrado.</Text>
          )}
          {partners.map((p) => (
            <TouchableOpacity
              key={p.id}
              style={styles.card}
              onPress={() => router.push(`/partner/${p.id}`)}
              accessibilityRole="button"
              accessibilityLabel={`${p.name}, ${p.category}${p.has_seal ? ", parceiro certificado" : ""}. ${p.short_description}. ${p.price_from ? `A partir de ${p.price_from}. ` : ""}Toque para ver detalhes e reservar.`}
              testID={`partner-${p.id}`}
            >
              <Image
                source={{ uri: resolveAssetUrl(p.image_url) }}
                style={styles.image}
                accessibilityLabel={`Foto de ${p.name}`}
              />
              <View style={styles.body}>
                <View style={styles.row}>
                  <Text style={styles.cat}>{p.category.toUpperCase()}</Text>
                  {p.has_seal && (
                    <View style={styles.sealPill}>
                      <Ionicons name="ribbon" size={11} color={colors.brand} />
                      <Text style={styles.sealText}>Certificado</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.name} numberOfLines={1}>{p.name}</Text>
                <Text style={styles.short} numberOfLines={2}>{p.short_description}</Text>
                <View style={styles.badgeRow}>
                  {p.badges.slice(0, 2).map((b) => (
                    <View key={b} style={styles.badge}>
                      <Ionicons name="checkmark" size={10} color={colors.success} />
                      <Text style={styles.badgeText}>{b}</Text>
                    </View>
                  ))}
                </View>
                <View style={styles.bottomRow}>
                  <Text style={styles.price}>{p.price_from}</Text>
                  <View style={styles.cta}>
                    <Text style={styles.ctaText}>Reservar</Text>
                    <Ionicons name="chevron-forward" size={14} color={colors.brand} />
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          ))}
          <View style={{ height: 40 }} />
        </ScrollView>
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
  hero: { paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: spacing.md },
  heroTitle: { color: colors.text, fontSize: fontSizes.h2, fontWeight: "800" },
  heroSubtitle: { color: colors.textSecondary, fontSize: 14, marginTop: 4, lineHeight: 20 },
  filterRow: { paddingHorizontal: spacing.md, gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    backgroundColor: colors.surface,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.sm,
  },
  chipActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  chipText: { color: colors.textSecondary, fontSize: 13, fontWeight: "600" },
  chipTextActive: { color: "#fff" },
  list: { padding: spacing.md, gap: spacing.md },
  empty: { color: colors.textMuted, textAlign: "center", marginTop: 40, fontSize: fontSizes.body },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    marginBottom: spacing.sm,
  },
  image: { width: "100%", height: 160 },
  body: { padding: spacing.md, gap: 6 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  cat: { color: colors.brandLight, fontSize: 11, fontWeight: "700", letterSpacing: 1 },
  sealPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.badgeBg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.pill,
    gap: 3,
  },
  sealText: { color: colors.brand, fontSize: 10, fontWeight: "700" },
  name: { color: colors.text, fontSize: 18, fontWeight: "800" },
  short: { color: colors.textSecondary, fontSize: 14, lineHeight: 20 },
  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 4 },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.successBg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.pill,
    gap: 3,
  },
  badgeText: { color: colors.success, fontSize: 10, fontWeight: "700" },
  bottomRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 8 },
  price: { color: colors.text, fontWeight: "700", fontSize: 14 },
  cta: { flexDirection: "row", alignItems: "center", gap: 4 },
  ctaText: { color: colors.brand, fontSize: 14, fontWeight: "700" },
});
