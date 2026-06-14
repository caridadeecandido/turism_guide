import { useEffect, useState, useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert,
  ActivityIndicator, Image, KeyboardAvoidingView, Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

import { colors, fontSizes, radii, spacing } from "@/src/theme";
import { Partner } from "@/src/api";
import { resolveAssetUrl } from "@/src/asset-url";
import { useAdminAuth } from "@/src/admin-auth";

const BASE = process.env.EXPO_PUBLIC_BACKEND_URL;

const EMPTY: Partial<Partner> = {
  name: "", category: "Hospedagem", neighborhood: "",
  short_description: "", image_url: "", image_alt: "",
  email: "", phone: "", whatsapp: "", price_from: "",
  accessibility_features: [], badges: [],
  latitude: undefined, longitude: undefined,
};

function alertError(msg: string) {
  if (Platform.OS === "web") window.alert(msg);
  else Alert.alert("Atenção", msg);
}
function confirmAction(msg: string, onYes: () => void) {
  if (Platform.OS === "web") { if (window.confirm(msg)) onYes(); return; }
  Alert.alert("Confirmar", msg, [
    { text: "Cancelar", style: "cancel" },
    { text: "Excluir", style: "destructive", onPress: onYes },
  ]);
}

export default function AdminPartners() {
  const { authHeader } = useAdminAuth();
  const [items, setItems] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Partner> | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${BASE}/api/partners`);
      setItems(await r.json());
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!editing) return;
    if (!editing.name?.trim() || !editing.category?.trim()) {
      alertError("Nome e categoria são obrigatórios.");
      return;
    }
    setSaving(true);
    try {
      const headers = { "Content-Type": "application/json", ...(await authHeader()) };
      const url = editing.id ? `${BASE}/api/partners/${editing.id}` : `${BASE}/api/partners`;
      const method = editing.id ? "PUT" : "POST";
      const r = await fetch(url, { method, headers, body: JSON.stringify(editing) });
      if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
      setEditing(null);
      await load();
    } catch (e: any) {
      alertError(String(e.message || e));
    } finally { setSaving(false); }
  };

  const remove = (p: Partner) => {
    confirmAction(`Excluir o parceiro "${p.name}"?`, async () => {
      const headers = await authHeader();
      await fetch(`${BASE}/api/partners/${p.id}`, { method: "DELETE", headers });
      await load();
    });
  };

  if (editing) {
    const set = (patch: Partial<Partner>) => setEditing({ ...editing, ...patch });
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => setEditing(null)} accessibilityRole="button" accessibilityLabel="Cancelar edição" testID="cancel-edit-button">
            <Ionicons name="close" size={26} color={colors.text} />
          </TouchableOpacity>
          <Text accessibilityRole="header" style={styles.title}>{editing.id ? "Editar parceiro" : "Novo parceiro"}</Text>
          <TouchableOpacity style={styles.saveBtn} onPress={save} disabled={saving} accessibilityRole="button" accessibilityLabel="Salvar parceiro" testID="save-partner-button">
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Salvar</Text>}
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
            {editing.image_url ? <Image source={{ uri: resolveAssetUrl(editing.image_url) }} style={styles.preview} accessibilityLabel={editing.image_alt || `Pré-visualização da imagem de ${editing.name || "parceiro"}`} /> : null}

            <SectionTitle>Identidade</SectionTitle>
            <Field label="Nome *" value={editing.name || ""} onChange={(v) => set({ name: v })} testID="p-name" />
            <Field label="Categoria *" value={editing.category || ""} onChange={(v) => set({ category: v })} testID="p-category" hint="Ex: Hospedagem, Alimentação, Tours, Lazer" />
            <Field label="Bairro" value={editing.neighborhood || ""} onChange={(v) => set({ neighborhood: v })} testID="p-neighborhood" />
            <Field label="Descrição curta" value={editing.short_description || ""} onChange={(v) => set({ short_description: v })} testID="p-desc" multiline />

            <SectionTitle>Imagem</SectionTitle>
            <Field label="URL da imagem" value={editing.image_url || ""} onChange={(v) => set({ image_url: v })} testID="p-img" multiline />
            <Field label="Texto alternativo (acessibilidade)" value={editing.image_alt || ""} onChange={(v) => set({ image_alt: v })} testID="p-img-alt" multiline />

            <SectionTitle>Acessibilidade</SectionTitle>
            <Field
              label="Recursos de acessibilidade (vírgula)"
              value={(editing.accessibility_features || []).join(", ")}
              onChange={(v) => set({ accessibility_features: v.split(",").map((s) => s.trim()).filter(Boolean) })}
              testID="p-features"
              hint="Ex: Rampa, Banheiro adaptado, Cães-guia, Libras"
              multiline
            />
            <Field
              label="Selos / badges (vírgula)"
              value={(editing.badges || []).join(", ")}
              onChange={(v) => set({ badges: v.split(",").map((s) => s.trim()).filter(Boolean) })}
              testID="p-badges"
              hint="Ex: Pet-guia welcome, Acessível PCD"
            />

            <SectionTitle>Contato</SectionTitle>
            <Field label="E-mail" value={editing.email || ""} onChange={(v) => set({ email: v })} testID="p-email" />
            <Field label="Telefone" value={editing.phone || ""} onChange={(v) => set({ phone: v })} testID="p-phone" keyboardType="phone-pad" />
            <Field label="WhatsApp" value={editing.whatsapp || ""} onChange={(v) => set({ whatsapp: v })} testID="p-whatsapp" keyboardType="phone-pad" />
            <Field label="Preço a partir de" value={editing.price_from || ""} onChange={(v) => set({ price_from: v })} testID="p-price" hint="Ex: R$ 250/diária" />

            <SectionTitle>Geolocalização</SectionTitle>
            <Field label="Latitude" value={editing.latitude?.toString() || ""} onChange={(v) => set({ latitude: v ? Number(v) : undefined })} testID="p-lat" keyboardType="numeric" />
            <Field label="Longitude" value={editing.longitude?.toString() || ""} onChange={(v) => set({ longitude: v ? Number(v) : undefined })} testID="p-lng" keyboardType="numeric" />

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
        <Text accessibilityRole="header" style={styles.title}>Parceiros</Text>
        <TouchableOpacity style={styles.iconBtn} onPress={() => setEditing({ ...EMPTY })} accessibilityRole="button" accessibilityLabel="Adicionar novo parceiro" testID="new-partner-button">
          <Ionicons name="add" size={28} color={colors.brand} />
        </TouchableOpacity>
      </View>

      <Text style={styles.sub}>{loading ? "Carregando..." : `${items.length} parceiro(s) certificado(s)`}</Text>

      {loading ? (
        <ActivityIndicator color={colors.brand} size="large" style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {items.map((p) => (
            <View key={p.id} style={styles.card}>
              <Image source={{ uri: resolveAssetUrl(p.image_url) }} style={styles.cardImg} accessibilityLabel={p.image_alt || `Foto de ${p.name}`} />
              <View style={{ flex: 1, padding: spacing.sm }}>
                <Text style={styles.cardName} numberOfLines={1}>{p.name}</Text>
                <Text style={styles.cardMeta}>{p.category} · {p.neighborhood}</Text>
                <Text style={styles.code}>SEAL #{p.seal_code}</Text>
                <View style={styles.actions}>
                  <TouchableOpacity style={styles.editBtn} onPress={() => setEditing(p)} accessibilityRole="button" accessibilityLabel={`Editar parceiro ${p.name}`} testID={`edit-partner-${p.id}`}>
                    <Ionicons name="create-outline" size={14} color={colors.brand} />
                    <Text style={styles.editText}>Editar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.deleteBtn} onPress={() => remove(p)} accessibilityRole="button" accessibilityLabel={`Excluir parceiro ${p.name}`} testID={`delete-partner-${p.id}`}>
                    <Ionicons name="trash-outline" size={14} color={colors.error} />
                    <Text style={styles.deleteText}>Excluir</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))}
          <View style={{ height: 60 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <Text accessibilityRole="header" style={styles.section}>{children}</Text>;
}

function Field({ label, value, onChange, multiline, keyboardType, hint, testID }: {
  label: string; value: string; onChange: (v: string) => void;
  multiline?: boolean; keyboardType?: "default" | "numeric" | "phone-pad"; hint?: string; testID?: string;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && { height: 80, textAlignVertical: "top" }]}
        value={value}
        onChangeText={onChange}
        multiline={multiline}
        keyboardType={keyboardType}
        placeholderTextColor={colors.textMuted}
        accessibilityLabel={label}
        accessibilityHint={hint}
        testID={testID}
      />
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
  },
  iconBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  title: { color: colors.text, fontSize: fontSizes.h3, fontWeight: "700" },
  saveBtn: { backgroundColor: colors.brand, paddingHorizontal: 14, paddingVertical: 8, borderRadius: radii.button },
  saveText: { color: "#fff", fontWeight: "700" },
  sub: { color: colors.textMuted, paddingHorizontal: spacing.md, marginBottom: spacing.sm },

  list: { paddingHorizontal: spacing.md, paddingTop: spacing.sm },
  card: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: radii.card, overflow: "hidden",
    marginBottom: spacing.sm,
    borderWidth: 1, borderColor: colors.border,
  },
  cardImg: { width: 90, height: 100, backgroundColor: colors.surfaceElevated },
  cardName: { color: colors.text, fontWeight: "700", fontSize: fontSizes.body },
  cardMeta: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
  code: { color: colors.brandLight, fontSize: 10, marginTop: 4, fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace" },
  actions: { flexDirection: "row", gap: 8, marginTop: 6 },
  editBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, backgroundColor: colors.badgeBg, borderRadius: radii.pill },
  editText: { color: colors.brand, fontSize: 11, fontWeight: "600" },
  deleteBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, backgroundColor: "rgba(239, 68, 68, 0.15)", borderRadius: radii.pill },
  deleteText: { color: colors.error, fontSize: 11, fontWeight: "600" },

  form: { padding: spacing.md, paddingBottom: 60 },
  preview: { width: "100%", height: 160, borderRadius: radii.card, marginBottom: spacing.md, backgroundColor: colors.surfaceElevated },
  section: {
    color: colors.brandLight, fontSize: 12, fontWeight: "800",
    textTransform: "uppercase", marginTop: spacing.md, marginBottom: 6, letterSpacing: 1,
  },
  field: { marginBottom: spacing.sm },
  label: { color: colors.textSecondary, fontSize: 12, fontWeight: "600", marginBottom: 4 },
  input: {
    backgroundColor: colors.surface, color: colors.text,
    paddingHorizontal: 12, paddingVertical: 10,
    borderRadius: radii.input, fontSize: fontSizes.body,
    borderWidth: 1, borderColor: colors.border,
  },
  hint: { color: colors.textMuted, fontSize: 10, marginTop: 4 },
});
