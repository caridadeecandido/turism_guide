import { useEffect, useState, useCallback } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { colors, fontSizes, radii, spacing } from "@/src/theme";
import { useAdminAuth } from "@/src/admin-auth";

const BASE = process.env.EXPO_PUBLIC_BACKEND_URL;

type Inquiry = {
  id: string;
  partner_id: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  date: string;
  people: number;
  accessibility_needs: string;
  status: string;
  created_at: string;
};

export default function Inquiries() {
  const { authHeader } = useAdminAuth();
  const [items, setItems] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const headers = await authHeader();
      const r = await fetch(`${BASE}/api/admin/inquiries`, { headers });
      if (r.ok) setItems(await r.json());
    } finally { setLoading(false); }
  }, [authHeader]);

  useEffect(() => { load(); }, [load]);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()} testID="back-button">
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Solicitações de reserva</Text>
        <TouchableOpacity style={styles.iconBtn} onPress={load} testID="refresh-button">
          <Ionicons name="refresh" size={22} color={colors.text} />
        </TouchableOpacity>
      </View>

      <Text style={styles.sub}>{loading ? "Carregando..." : `${items.length} solicitação(ões)`}</Text>

      {loading ? (
        <ActivityIndicator color={colors.brand} size="large" style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {items.length === 0 && <Text style={styles.empty}>Nenhuma solicitação ainda.</Text>}
          {items.map((it) => (
            <View key={it.id} style={styles.card} testID={`inq-${it.id}`}>
              <View style={styles.cardTop}>
                <Text style={styles.name}>{it.name}</Text>
                <View style={[styles.statusPill, { backgroundColor: it.status === "new" ? colors.badgeBg : colors.successBg }]}>
                  <Text style={[styles.statusText, { color: it.status === "new" ? colors.brand : colors.success }]}>
                    {it.status}
                  </Text>
                </View>
              </View>
              <Text style={styles.meta}>{new Date(it.created_at).toLocaleString("pt-BR")}</Text>
              <Text style={styles.message}>{it.message}</Text>
              {it.accessibility_needs && (
                <View style={styles.needsBox}>
                  <Ionicons name="accessibility" size={14} color={colors.brand} />
                  <Text style={styles.needsText}>{it.accessibility_needs}</Text>
                </View>
              )}
              <View style={styles.actions}>
                <TouchableOpacity style={styles.actionBtn} onPress={() => Linking.openURL(`mailto:${it.email}`)}>
                  <Ionicons name="mail" size={16} color={colors.brand} />
                  <Text style={styles.actionText}>{it.email}</Text>
                </TouchableOpacity>
                {it.phone && (
                  <TouchableOpacity style={styles.actionBtn} onPress={() => Linking.openURL(`tel:${it.phone}`)}>
                    <Ionicons name="call" size={16} color={colors.brand} />
                    <Text style={styles.actionText}>{it.phone}</Text>
                  </TouchableOpacity>
                )}
                {it.date && (
                  <View style={styles.actionBtn}>
                    <Ionicons name="calendar" size={16} color={colors.textMuted} />
                    <Text style={[styles.actionText, { color: colors.textMuted }]}>{it.date}</Text>
                  </View>
                )}
                <View style={styles.actionBtn}>
                  <Ionicons name="people" size={16} color={colors.textMuted} />
                  <Text style={[styles.actionText, { color: colors.textMuted }]}>{it.people} pessoa(s)</Text>
                </View>
              </View>
            </View>
          ))}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  iconBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  title: { color: colors.text, fontSize: fontSizes.h3, fontWeight: "700" },
  sub: { color: colors.textMuted, paddingHorizontal: spacing.md, marginBottom: spacing.sm },
  list: { padding: spacing.md, gap: spacing.md },
  empty: { color: colors.textMuted, textAlign: "center", marginTop: 40, fontSize: fontSizes.body },
  card: { backgroundColor: colors.surface, borderRadius: radii.card, padding: spacing.md, borderWidth: 1, borderColor: colors.border, gap: 6 },
  cardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  name: { color: colors.text, fontWeight: "800", fontSize: fontSizes.body },
  statusPill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: radii.pill },
  statusText: { fontSize: 11, fontWeight: "800", textTransform: "uppercase" },
  meta: { color: colors.textMuted, fontSize: 11 },
  message: { color: colors.text, fontSize: fontSizes.body, lineHeight: 22, marginTop: 4 },
  needsBox: { flexDirection: "row", alignItems: "center", gap: 6, padding: 8, borderRadius: 8, backgroundColor: colors.badgeBg, marginTop: 4 },
  needsText: { color: colors.brandLight, fontSize: 12, flex: 1 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: spacing.sm },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: radii.pill, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border },
  actionText: { color: colors.brand, fontSize: 12, fontWeight: "700" },
});
