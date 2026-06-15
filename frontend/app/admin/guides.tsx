import { useEffect, useState, useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert,
  ActivityIndicator, Image, KeyboardAvoidingView, Platform, Switch,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

import { colors, fontSizes, radii, spacing } from "@/src/theme";
import { Guide } from "@/src/api";
import { resolveAssetUrl } from "@/src/asset-url";
import { useAdminAuth } from "@/src/admin-auth";
import { useSiteConfig } from "@/src/site-config";
import { SealCircle } from "@/src/components/SealBranding";

const BASE = process.env.EXPO_PUBLIC_BACKEND_URL;

type Editable = Partial<Guide> & {
  name: string;
  photo_url: string;
};

const EMPTY: Editable = {
  name: "", photo_url: "", photo_alt: "",
  bio: "", short_bio: "",
  specialties: [], languages: [],
  certification_course: "Curso Turismo que se Sente - Categoria Ouro (120h)",
  certification_date: "",
  accessibility_focus: [],
  phone: "", whatsapp: "", email: "", instagram: "",
  region: "Natal/RN",
  rating: 5.0,
  years_experience: 0,
  featured: false,
  active: true,
};

function alertError(msg: string) {
  if (Platform.OS === "web") window.alert(msg);
  else Alert.alert("Atenção", msg);
}

function confirmAction(msg: string, onYes: () => void) {
  if (Platform.OS === "web") {
    if (window.confirm(msg)) onYes();
    return;
  }
  Alert.alert("Confirmar", msg, [
    { text: "Cancelar", style: "cancel" },
    { text: "Confirmar", style: "destructive", onPress: onYes },
  ]);
}

export default function AdminGuides() {
  const { authHeader } = useAdminAuth();
  const { config } = useSiteConfig();
  const [guides, setGuides] = useState<Guide[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Editable | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${BASE}/api/guides?active_only=false`);
      setGuides(await r.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!editing) return;
    if (!editing.name?.trim()) {
      alertError("Nome do guia é obrigatório.");
      return;
    }
    setSaving(true);
    try {
      const headers = { "Content-Type": "application/json", ...(await authHeader()) };
      const url = editing.id ? `${BASE}/api/guides/${editing.id}` : `${BASE}/api/guides`;
      const method = editing.id ? "PUT" : "POST";
      const r = await fetch(url, { method, headers, body: JSON.stringify(editing) });
      if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
      setEditing(null);
      await load();
    } catch (e: any) {
      alertError(String(e.message || e));
    } finally {
      setSaving(false);
    }
  };

  const remove = (g: Guide) => {
    confirmAction(`Excluir o guia "${g.name}"?`, async () => {
      const headers = await authHeader();
      await fetch(`${BASE}/api/guides/${g.id}`, { method: "DELETE", headers });
      await load();
    });
  };

  if (editing) {
    const set = (patch: Partial<Editable>) => setEditing({ ...editing, ...patch });
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => setEditing(null)} accessibilityRole="button" accessibilityLabel="Cancelar edição" testID="cancel-edit-button">
            <Ionicons name="close" size={26} color={colors.text} />
          </TouchableOpacity>
          <Text accessibilityRole="header" style={styles.title}>{editing.id ? "Editar guia" : "Novo guia"}</Text>
          <TouchableOpacity style={styles.saveBtn} onPress={save} disabled={saving} accessibilityRole="button" accessibilityLabel="Salvar guia" testID="save-guide-button">
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Salvar</Text>}
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
            {editing.photo_url ? (
              <Image source={{ uri: resolveAssetUrl(editing.photo_url) }} style={styles.preview} accessibilityLabel={editing.photo_alt || `Pré-visualização da foto de ${editing.name || "guia"}`} />
            ) : (
              <View style={[styles.preview, styles.previewPlaceholder]}>
                <Ionicons name="person" size={80} color={colors.textMuted} />
                <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 4 }}>Sem foto</Text>
              </View>
            )}

            <SectionTitle>Identidade</SectionTitle>
            <Field label="Nome completo *" value={editing.name} onChange={(v) => set({ name: v })} testID="g-name" />
            <Field label="URL da foto" value={editing.photo_url || ""} onChange={(v) => set({ photo_url: v })} testID="g-photo" hint="Cole link de foto (use placeholder do Pexels/Unsplash inicialmente)" />
            <Field label="Texto alternativo da foto (acessibilidade)" value={editing.photo_alt || ""} onChange={(v) => set({ photo_alt: v })} testID="g-photo-alt" multiline hint="Descreva a foto para usuários cegos" />
            <Field label="Região de atuação" value={editing.region || ""} onChange={(v) => set({ region: v })} testID="g-region" hint="Ex: Natal/RN" />
            <Field label="Anos de experiência" value={String(editing.years_experience || 0)} onChange={(v) => set({ years_experience: Number(v) || 0 })} keyboardType="numeric" testID="g-years" />
            <Field label="Avaliação (0-5)" value={String(editing.rating || 5)} onChange={(v) => set({ rating: Number(v) || 5 })} keyboardType="numeric" testID="g-rating" />

            <SectionTitle>Apresentação</SectionTitle>
            <Field label="Bio curta (linha de chamada)" value={editing.short_bio || ""} onChange={(v) => set({ short_bio: v })} testID="g-short" multiline />
            <Field label="Bio completa" value={editing.bio || ""} onChange={(v) => set({ bio: v })} testID="g-bio" multiline hint="Texto rico que será exibido no perfil e narrado por TTS multilíngue" />

            <SectionTitle>Certificação</SectionTitle>
            <Field label="Curso concluído" value={editing.certification_course || ""} onChange={(v) => set({ certification_course: v })} testID="g-course" />
            <Field label="Data de conclusão (AAAA-MM-DD)" value={editing.certification_date || ""} onChange={(v) => set({ certification_date: v })} testID="g-cert-date" hint="Ex: 2025-08-15" />

            <SectionTitle>Especialidades</SectionTitle>
            <Field
              label="Especialidades (separadas por vírgula)"
              value={(editing.specialties || []).join(", ")}
              onChange={(v) => set({ specialties: v.split(",").map((x) => x.trim()).filter(Boolean) })}
              testID="g-specs"
              hint="Ex: Praia, História, Cafeterias acolhedoras"
            />
            <Field
              label="Idiomas falados (vírgula)"
              value={(editing.languages || []).join(", ")}
              onChange={(v) => set({ languages: v.split(",").map((x) => x.trim()).filter(Boolean) })}
              testID="g-langs"
              hint="Ex: Português, Inglês, Libras"
            />
            <Field
              label="Foco de acessibilidade (vírgula)"
              value={(editing.accessibility_focus || []).join(", ")}
              onChange={(v) => set({ accessibility_focus: v.split(",").map((x) => x.trim()).filter(Boolean) })}
              testID="g-focus"
              hint="Ex: Audiodescrição, Libras, Cadeirantes, TEA"
            />

            <SectionTitle>Contato</SectionTitle>
            <Field label="Telefone" value={editing.phone || ""} onChange={(v) => set({ phone: v })} testID="g-phone" keyboardType="phone-pad" hint="Ex: +55 84 99999-0000" />
            <Field label="WhatsApp" value={editing.whatsapp || ""} onChange={(v) => set({ whatsapp: v })} testID="g-whatsapp" keyboardType="phone-pad" />
            <Field label="E-mail" value={editing.email || ""} onChange={(v) => set({ email: v })} testID="g-email" />
            <Field label="Instagram (com ou sem @)" value={editing.instagram || ""} onChange={(v) => set({ instagram: v })} testID="g-instagram" />

            <SectionTitle>Visibilidade</SectionTitle>
            <ToggleRow label="Destacar no app (featured)" value={!!editing.featured} onChange={(v) => set({ featured: v })} testID="g-featured" />
            <ToggleRow label="Ativo (visível para turistas)" value={editing.active !== false} onChange={(v) => set({ active: v })} testID="g-active" />

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
        <Text accessibilityRole="header" style={styles.title}>Guias certificados</Text>
        <TouchableOpacity style={styles.iconBtn} onPress={() => setEditing({ ...EMPTY })} accessibilityRole="button" accessibilityLabel="Adicionar novo guia" testID="new-guide-button">
          <Ionicons name="add" size={28} color={colors.brand} />
        </TouchableOpacity>
      </View>

      <View style={styles.banner}>
        <SealCircle size={56} style={styles.bannerSeal} />
        <View style={{ flex: 1 }}>
          <Text style={styles.bannerTitle}>{guides.length} guias cadastrados</Text>
          <Text style={styles.bannerSub}>Cada guia recebe um código de selo único após capacitação.</Text>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.brand} size="large" style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {guides.length === 0 && (
            <View style={styles.empty}>
              <Ionicons name="person-add-outline" size={48} color={colors.textMuted} />
              <Text style={styles.emptyText}>Nenhum guia cadastrado. Toque em + para adicionar.</Text>
            </View>
          )}
          {guides.map((g) => (
            <View key={g.id} style={[styles.card, !g.active && { opacity: 0.5 }]}>
              {g.photo_url ? (
                <Image source={{ uri: resolveAssetUrl(g.photo_url) }} style={styles.photo} accessibilityLabel={g.photo_alt || `Foto de ${g.name}`} />
              ) : (
                <View style={[styles.photo, styles.photoPlaceholder]}>
                  <Ionicons name="person" size={32} color={colors.textMuted} />
                </View>
              )}
              <View style={{ flex: 1, padding: spacing.sm }}>
                <View style={styles.row}>
                  <Text style={styles.cardName} numberOfLines={1}>{g.name}</Text>
                  {g.featured && <Ionicons name="star" size={14} color="#F59E0B" />}
                  {!g.active && (
                    <View style={styles.inactiveBadge}>
                      <Text style={styles.inactiveBadgeText}>OCULTO</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.cardMeta} numberOfLines={1}>
                  {g.specialties.slice(0, 3).join(" · ")}
                </Text>
                <Text style={styles.cardMeta} numberOfLines={1}>
                  {g.languages.join(" · ")}
                </Text>
                <Text style={styles.code}>SEAL #{g.seal_code}</Text>

                <View style={styles.actions}>
                  <TouchableOpacity style={styles.editBtn} onPress={() => setEditing(g)} accessibilityRole="button" accessibilityLabel={`Editar guia ${g.name}`} testID={`edit-guide-${g.id}`}>
                    <Ionicons name="create-outline" size={14} color={colors.brand} />
                    <Text style={styles.editText}>Editar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.deleteBtn} onPress={() => remove(g)} accessibilityRole="button" accessibilityLabel={`Excluir guia ${g.name}`} testID={`delete-guide-${g.id}`}>
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

function ToggleRow({ label, value, onChange, testID }: {
  label: string; value: boolean; onChange: (v: boolean) => void; testID?: string;
}) {
  return (
    <View style={styles.toggleRow}>
      <Text style={styles.toggleLabel}>{label}</Text>
      <Switch value={value} onValueChange={onChange} testID={testID}
        accessibilityLabel={label}
        trackColor={{ false: colors.surfaceElevated, true: colors.brand }}
        thumbColor="#fff" />
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
  saveBtn: {
    backgroundColor: colors.brand,
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: radii.button,
  },
  saveText: { color: "#fff", fontWeight: "700" },

  banner: {
    flexDirection: "row", alignItems: "center", gap: spacing.md,
    backgroundColor: colors.surface,
    marginHorizontal: spacing.md, marginBottom: spacing.sm,
    padding: spacing.md, borderRadius: radii.card,
    borderWidth: 1, borderColor: colors.border,
  },
  bannerSeal: { width: 56, height: 56 },
  bannerTitle: { color: colors.text, fontWeight: "700", fontSize: fontSizes.body },
  bannerSub: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },

  list: { paddingHorizontal: spacing.md, paddingTop: spacing.sm },
  empty: { alignItems: "center", paddingVertical: 40, gap: 8 },
  emptyText: { color: colors.textMuted, fontSize: fontSizes.small, textAlign: "center" },

  card: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    overflow: "hidden",
    marginBottom: spacing.sm,
    borderWidth: 1, borderColor: colors.border,
  },
  photo: { width: 90, height: 120, backgroundColor: colors.surfaceElevated },
  photoPlaceholder: { alignItems: "center", justifyContent: "center" },
  row: { flexDirection: "row", alignItems: "center", gap: 6 },
  cardName: { color: colors.text, fontSize: fontSizes.body, fontWeight: "700", flex: 1 },
  cardMeta: { color: colors.textSecondary, fontSize: 11, marginTop: 2 },
  code: { color: colors.brandLight, fontSize: 10, marginTop: 4, fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace" },
  inactiveBadge: { backgroundColor: colors.error, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  inactiveBadgeText: { color: "#fff", fontSize: 8, fontWeight: "700" },

  actions: { flexDirection: "row", gap: 8, marginTop: 6 },
  editBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 8, paddingVertical: 4,
    backgroundColor: colors.badgeBg, borderRadius: radii.pill,
  },
  editText: { color: colors.brand, fontSize: 11, fontWeight: "600" },
  deleteBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 8, paddingVertical: 4,
    backgroundColor: "rgba(239, 68, 68, 0.15)", borderRadius: radii.pill,
  },
  deleteText: { color: colors.error, fontSize: 11, fontWeight: "600" },

  form: { padding: spacing.md, paddingBottom: 60 },
  preview: {
    width: 140, height: 140, borderRadius: 70,
    alignSelf: "center", marginBottom: spacing.md,
    backgroundColor: colors.surfaceElevated,
  },
  previewPlaceholder: { alignItems: "center", justifyContent: "center" },

  section: {
    color: colors.brandLight,
    fontSize: 12, fontWeight: "800",
    textTransform: "uppercase",
    marginTop: spacing.md, marginBottom: 6,
    letterSpacing: 1,
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

  toggleRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingVertical: 8,
  },
  toggleLabel: { color: colors.text, fontSize: fontSizes.body, flex: 1 },
});
