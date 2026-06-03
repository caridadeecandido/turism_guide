import { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator,
  Image, Alert, Platform, KeyboardAvoidingView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { colors, fontSizes, radii, spacing } from "@/src/theme";
import { useAdminAuth } from "@/src/admin-auth";
import { useSiteConfig } from "@/src/site-config";

const BASE = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function SiteCMS() {
  const { authHeader } = useAdminAuth();
  const { config, refresh } = useSiteConfig();
  const [form, setForm] = useState({ ...config });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => { setForm({ ...config }); }, [config]);

  const save = async () => {
    setSaving(true);
    try {
      const headers = { "Content-Type": "application/json", ...(await authHeader()) };
      const r = await fetch(`${BASE}/api/admin/site-config`, {
        method: "PUT", headers, body: JSON.stringify(form),
      });
      if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
      await refresh();
      if (Platform.OS === "web") window.alert("Configurações salvas com sucesso.");
      else Alert.alert("Sucesso", "Configurações salvas.");
    } catch (e: any) {
      if (Platform.OS === "web") window.alert(`Erro: ${e.message || e}`);
      else Alert.alert("Erro", String(e.message || e));
    } finally {
      setSaving(false);
    }
  };

  const update = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()} testID="back-button">
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Site & Selo</Text>
        <TouchableOpacity style={styles.saveBtn} onPress={save} disabled={saving} testID="save-site-button">
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Salvar</Text>}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Section title="Selo Turismo que se Sente">
            <View style={styles.sealPreview}>
              <Image source={{ uri: form.seal_image_url }} style={styles.sealImg} resizeMode="contain" />
            </View>
            <Field
              label="URL da imagem do selo *"
              value={form.seal_image_url}
              onChange={(v) => update("seal_image_url", v)}
              hint="Cole a URL pública da imagem ou um data: URI em base64"
              testID="field-seal-image"
            />
            <Field
              label="Texto alternativo (acessibilidade) *"
              value={form.seal_alt}
              onChange={(v) => update("seal_alt", v)}
              hint="Descrição que será lida por leitores de tela e mostrada quando a imagem falhar"
              testID="field-seal-alt"
              multiline
            />
          </Section>

          <Section title="Cabeçalho (header)">
            <Field
              label="Título do cabeçalho"
              value={form.header_banner_title}
              onChange={(v) => update("header_banner_title", v)}
              testID="field-header-title"
            />
            <Field
              label="Subtítulo do cabeçalho"
              value={form.header_banner_subtitle}
              onChange={(v) => update("header_banner_subtitle", v)}
              testID="field-header-subtitle"
            />
          </Section>

          <Section title="Rodapé (footer)">
            <Field
              label="Texto do rodapé"
              value={form.footer_text}
              onChange={(v) => update("footer_text", v)}
              testID="field-footer-text"
              multiline
            />
          </Section>

          <Section title="Boas-vindas — Português">
            <Field label="Título" value={form.welcome_pt} onChange={(v) => update("welcome_pt", v)} testID="field-welcome-pt" />
            <Field label="Subtítulo" value={form.welcome_sub_pt} onChange={(v) => update("welcome_sub_pt", v)} testID="field-welcome-sub-pt" multiline />
          </Section>

          <Section title="Boas-vindas — English">
            <Field label="Title" value={form.welcome_en} onChange={(v) => update("welcome_en", v)} testID="field-welcome-en" />
            <Field label="Subtitle" value={form.welcome_sub_en} onChange={(v) => update("welcome_sub_en", v)} testID="field-welcome-sub-en" multiline />
          </Section>

          <Section title="Boas-vindas — Español">
            <Field label="Título" value={form.welcome_es} onChange={(v) => update("welcome_es", v)} testID="field-welcome-es" />
            <Field label="Subtítulo" value={form.welcome_sub_es} onChange={(v) => update("welcome_sub_es", v)} testID="field-welcome-sub-es" multiline />
          </Section>

          <View style={{ height: 80 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Field({ label, value, onChange, hint, multiline, testID }: {
  label: string; value: string; onChange: (v: string) => void;
  hint?: string; multiline?: boolean; testID?: string;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && { minHeight: 80, textAlignVertical: "top" }]}
        value={value}
        onChangeText={onChange}
        multiline={multiline}
        placeholderTextColor={colors.textMuted}
        testID={testID}
      />
      {hint && <Text style={styles.hint}>{hint}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  iconBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  title: { color: colors.text, fontSize: fontSizes.h3, fontWeight: "700" },
  saveBtn: { paddingHorizontal: spacing.md, height: 36, borderRadius: radii.pill, backgroundColor: colors.brand, alignItems: "center", justifyContent: "center", minWidth: 80 },
  saveText: { color: "#fff", fontWeight: "800" },
  scroll: { padding: spacing.md, gap: spacing.md },
  section: {
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    padding: spacing.md,
    borderWidth: 1, borderColor: colors.border,
    gap: spacing.sm,
  },
  sectionTitle: { color: colors.brandLight, fontSize: 13, fontWeight: "800", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 },
  sealPreview: {
    backgroundColor: colors.bg,
    borderRadius: radii.card,
    paddingVertical: spacing.md,
    alignItems: "center",
    borderWidth: 1, borderColor: colors.border,
  },
  sealImg: { width: 160, height: 120 },
  field: { gap: 6 },
  fieldLabel: { color: colors.textSecondary, fontSize: 13, fontWeight: "600" },
  input: {
    backgroundColor: colors.bg, color: colors.text,
    borderRadius: 12, paddingHorizontal: spacing.md, paddingVertical: 12,
    borderWidth: 1, borderColor: colors.border, fontSize: fontSizes.body,
  },
  hint: { color: colors.textMuted, fontSize: 11, fontStyle: "italic" },
});
