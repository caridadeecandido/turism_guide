import { useEffect, useState, useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator,
  Alert, Platform, KeyboardAvoidingView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { colors, fontSizes, radii, spacing } from "@/src/theme";
import { useAdminAuth } from "@/src/admin-auth";
import { TouristSpot } from "@/src/api";

const BASE = process.env.EXPO_PUBLIC_BACKEND_URL;
type Lang = "en" | "es";

export default function TranslationsAdmin() {
  const { authHeader } = useAdminAuth();
  const [spots, setSpots] = useState<TouristSpot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<TouristSpot | null>(null);
  const [lang, setLang] = useState<Lang>("en");
  const [form, setForm] = useState({ name: "", short_description: "", full_description: "", audio_description: "" });
  const [saving, setSaving] = useState(false);
  const [autoTranslating, setAutoTranslating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${BASE}/api/spots`);
      setSpots(await r.json());
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!selected) return;
    const tr = (selected.translations || {} as any)[lang] || {};
    setForm({
      name: tr.name || "",
      short_description: tr.short_description || "",
      full_description: tr.full_description || "",
      audio_description: tr.audio_description || "",
    });
  }, [selected, lang]);

  const autoTranslate = async () => {
    if (!selected) return;
    setAutoTranslating(true);
    try {
      const r = await fetch(`${BASE}/api/spots/${selected.id}/translate?lang=${lang}`);
      if (!r.ok) throw new Error(`${r.status}`);
      const data = await r.json();
      setForm({
        name: data.name, short_description: data.short_description,
        full_description: data.full_description, audio_description: data.audio_description,
      });
    } catch (e: any) {
      if (Platform.OS === "web") window.alert(`Erro na tradução automática: ${e.message || e}`);
      else Alert.alert("Erro", String(e.message || e));
    } finally { setAutoTranslating(false); }
  };

  const save = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const existing = selected.translations || {};
      const updated = { ...existing, [lang]: form };
      const headers = { "Content-Type": "application/json", ...(await authHeader()) };
      const r = await fetch(`${BASE}/api/spots/${selected.id}`, {
        method: "PUT", headers, body: JSON.stringify({ translations: updated }),
      });
      if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
      await load();
      if (Platform.OS === "web") window.alert("Tradução salva.");
      else Alert.alert("Sucesso", "Tradução salva.");
    } catch (e: any) {
      if (Platform.OS === "web") window.alert(`Erro: ${e.message || e}`);
      else Alert.alert("Erro", String(e.message || e));
    } finally { setSaving(false); }
  };

  if (selected) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => setSelected(null)} accessibilityRole="button" accessibilityLabel="Voltar para a lista de pontos" testID="back-list-button">
            <Ionicons name="chevron-back" size={26} color={colors.text} />
          </TouchableOpacity>
          <Text accessibilityRole="header" style={styles.title} numberOfLines={1}>{selected.name}</Text>
          <TouchableOpacity style={styles.saveBtn} onPress={save} disabled={saving} accessibilityRole="button" accessibilityLabel="Salvar tradução" testID="save-translation-button">
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Salvar</Text>}
          </TouchableOpacity>
        </View>

        <View style={styles.langTabs}>
          {(["en", "es"] as Lang[]).map((l) => (
            <TouchableOpacity
              key={l}
              style={[styles.langTab, lang === l && styles.langTabActive]}
              onPress={() => setLang(l)}
              accessibilityRole="button"
              accessibilityState={{ selected: lang === l }}
              accessibilityLabel={`Editar tradução em ${l === "en" ? "Inglês" : "Espanhol"}`}
              testID={`lang-tab-${l}`}
            >
              <Text style={[styles.langTabText, lang === l && styles.langTabTextActive]}>
                {l === "en" ? "🇺🇸 English" : "🇪🇸 Español"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={styles.autoBtn}
          onPress={autoTranslate}
          disabled={autoTranslating}
          accessibilityRole="button"
          accessibilityLabel="Traduzir automaticamente com inteligência artificial"
          testID="auto-translate-button"
        >
          {autoTranslating ? <ActivityIndicator color={colors.brand} /> : (
            <>
              <Ionicons name="sparkles" size={18} color={colors.brand} />
              <Text style={styles.autoText}>Traduzir automaticamente com IA (gpt-4o-mini)</Text>
            </>
          )}
        </TouchableOpacity>

        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
            <Field label="Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} testID="field-tr-name" />
            <Field label="Short description" value={form.short_description} onChange={(v) => setForm({ ...form, short_description: v })} testID="field-tr-short" multiline />
            <Field label="Full description" value={form.full_description} onChange={(v) => setForm({ ...form, full_description: v })} testID="field-tr-full" multiline />
            <Field label="Audio description (text to read)" value={form.audio_description} onChange={(v) => setForm({ ...form, audio_description: v })} testID="field-tr-audio" multiline />
            <View style={{ height: 80 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Voltar" testID="back-button">
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </TouchableOpacity>
        <Text accessibilityRole="header" style={styles.title}>Traduções</Text>
        <View style={styles.iconBtn} />
      </View>

      <Text style={styles.subhead}>
        Selecione um ponto turístico para editar/gerar tradução manual (EN/ES).
      </Text>

      {loading ? (
        <ActivityIndicator color={colors.brand} size="large" style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {spots.map((spot) => {
            const hasEn = !!(spot.translations as any)?.en?.audio_description;
            const hasEs = !!(spot.translations as any)?.es?.audio_description;
            return (
              <TouchableOpacity
                key={spot.id}
                style={styles.row}
                onPress={() => setSelected(spot)}
                accessibilityRole="button"
                accessibilityLabel={`Editar traduções de ${spot.name}. ${hasEn ? "Inglês traduzido" : "Inglês pendente"}, ${hasEs ? "Espanhol traduzido" : "Espanhol pendente"}.`}
                testID={`tr-${spot.id}`}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{spot.name}</Text>
                  <Text style={styles.rowCat}>{spot.category}</Text>
                </View>
                <View style={styles.langPills}>
                  <View style={[styles.langPill, hasEn && styles.langPillActive]}>
                    <Text style={[styles.langPillText, hasEn && styles.langPillTextActive]}>EN</Text>
                  </View>
                  <View style={[styles.langPill, hasEs && styles.langPillActive]}>
                    <Text style={[styles.langPillText, hasEs && styles.langPillTextActive]}>ES</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            );
          })}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function Field({ label, value, onChange, multiline, testID }: {
  label: string; value: string; onChange: (v: string) => void; multiline?: boolean; testID?: string;
}) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && { minHeight: 100, textAlignVertical: "top" }]}
        value={value}
        onChangeText={onChange}
        multiline={multiline}
        placeholderTextColor={colors.textMuted}
        accessibilityLabel={label}
        testID={testID}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  iconBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  title: { color: colors.text, fontSize: fontSizes.h3, fontWeight: "700", flex: 1, textAlign: "center", marginHorizontal: spacing.sm },
  saveBtn: { paddingHorizontal: spacing.md, height: 36, borderRadius: radii.pill, backgroundColor: colors.brand, alignItems: "center", justifyContent: "center", minWidth: 80 },
  saveText: { color: "#fff", fontWeight: "800" },
  subhead: { color: colors.textMuted, paddingHorizontal: spacing.md, marginBottom: spacing.sm },
  list: { padding: spacing.md, gap: spacing.sm },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm, backgroundColor: colors.surface, borderRadius: radii.card, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  rowTitle: { color: colors.text, fontWeight: "700", fontSize: fontSizes.body },
  rowCat: { color: colors.brandLight, fontSize: 12, marginTop: 2 },
  langPills: { flexDirection: "row", gap: 4 },
  langPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radii.pill, backgroundColor: colors.surfaceElevated },
  langPillActive: { backgroundColor: colors.success },
  langPillText: { color: colors.textMuted, fontSize: 10, fontWeight: "800" },
  langPillTextActive: { color: "#fff" },
  langTabs: { flexDirection: "row", paddingHorizontal: spacing.md, gap: spacing.sm },
  langTab: { flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: radii.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  langTabActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  langTabText: { color: colors.textSecondary, fontWeight: "700" },
  langTabTextActive: { color: "#fff" },
  autoBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    backgroundColor: colors.surface, marginHorizontal: spacing.md, marginTop: spacing.sm,
    paddingVertical: 10, borderRadius: radii.pill,
    borderWidth: 1, borderColor: colors.brand, gap: 8,
  },
  autoText: { color: colors.brand, fontWeight: "700", fontSize: 13 },
  form: { padding: spacing.md, gap: spacing.md },
  fieldLabel: { color: colors.textSecondary, fontSize: 13, fontWeight: "600" },
  input: {
    backgroundColor: colors.surface, color: colors.text,
    borderRadius: 12, paddingHorizontal: spacing.md, paddingVertical: 12,
    borderWidth: 1, borderColor: colors.border, fontSize: fontSizes.body,
  },
});
