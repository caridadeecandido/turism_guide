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

  const update = (k: keyof typeof form, v: any) => setForm((f) => ({ ...f, [k]: v }));
  const updateArr = (k: keyof typeof form, csv: string) =>
    setForm((f) => ({ ...f, [k]: csv.split(",").map((s) => s.trim()).filter(Boolean) }));

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

          <Section title="Identidade do app">
            <Field label="Nome do app" value={form.app_name || ""} onChange={(v) => update("app_name", v)} testID="field-app-name" />
            <Field label="URL do logo (header / footer)" value={form.app_logo_url || ""} onChange={(v) => update("app_logo_url", v)} testID="field-app-logo" multiline />
            <Field label="URL do ícone do app (quadrado)" value={form.app_icon_url || ""} onChange={(v) => update("app_icon_url", v)} testID="field-app-icon" multiline />
            <Field label="URL do banner hero (página Sobre)" value={form.hero_image_url || ""} onChange={(v) => update("hero_image_url", v)} testID="field-hero-image" multiline hint="Banner que aparece no topo da página /about" />
            {form.app_logo_url ? (
              <View style={styles.previewRow}>
                <View style={styles.previewBox}>
                  <Image source={{ uri: form.app_logo_url }} style={styles.previewImg} resizeMode="contain" />
                  <Text style={styles.previewLabel}>Logo</Text>
                </View>
                {form.hero_image_url ? (
                  <View style={styles.previewBox}>
                    <Image source={{ uri: form.hero_image_url }} style={styles.previewImg} resizeMode="cover" />
                    <Text style={styles.previewLabel}>Hero</Text>
                  </View>
                ) : null}
              </View>
            ) : null}
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

          <Section title="Sobre o projeto">
            <Field label="Sobre (PT)" value={form.about_pt || ""} onChange={(v) => update("about_pt", v)} testID="field-about-pt" multiline />
            <Field label="About (EN)" value={form.about_en || ""} onChange={(v) => update("about_en", v)} testID="field-about-en" multiline />
            <Field label="Acerca (ES)" value={form.about_es || ""} onChange={(v) => update("about_es", v)} testID="field-about-es" multiline />
          </Section>

          <Section title="Missão (3 idiomas)">
            <Field label="Missão (PT)" value={form.mission_pt || ""} onChange={(v) => update("mission_pt", v)} testID="field-mission-pt" multiline />
            <Field label="Mission (EN)" value={form.mission_en || ""} onChange={(v) => update("mission_en", v)} testID="field-mission-en" multiline />
            <Field label="Misión (ES)" value={form.mission_es || ""} onChange={(v) => update("mission_es", v)} testID="field-mission-es" multiline />
          </Section>

          <Section title="Visão (3 idiomas)">
            <Field label="Visão (PT)" value={form.vision_pt || ""} onChange={(v) => update("vision_pt", v)} testID="field-vision-pt" multiline />
            <Field label="Vision (EN)" value={form.vision_en || ""} onChange={(v) => update("vision_en", v)} testID="field-vision-en" multiline />
            <Field label="Visión (ES)" value={form.vision_es || ""} onChange={(v) => update("vision_es", v)} testID="field-vision-es" multiline />
          </Section>

          <Section title="Contato oficial">
            <Field label="E-mail" value={form.contact_email || ""} onChange={(v) => update("contact_email", v)} testID="field-contact-email" />
            <Field label="Telefone" value={form.contact_phone || ""} onChange={(v) => update("contact_phone", v)} testID="field-contact-phone" />
            <Field label="WhatsApp" value={form.contact_whatsapp || ""} onChange={(v) => update("contact_whatsapp", v)} testID="field-contact-whatsapp" />
            <Field label="Endereço físico" value={form.contact_address || ""} onChange={(v) => update("contact_address", v)} testID="field-contact-address" multiline />
          </Section>

          <Section title="Redes sociais">
            <Field label="Instagram (com ou sem @)" value={form.instagram || ""} onChange={(v) => update("instagram", v)} testID="field-instagram" />
            <Field label="Facebook" value={form.facebook || ""} onChange={(v) => update("facebook", v)} testID="field-facebook" />
            <Field label="YouTube (handle ou @)" value={form.youtube || ""} onChange={(v) => update("youtube", v)} testID="field-youtube" />
            <Field label="TikTok" value={form.tiktok || ""} onChange={(v) => update("tiktok", v)} testID="field-tiktok" />
            <Field label="Website" value={form.website || ""} onChange={(v) => update("website", v)} testID="field-website" hint="Ex: https://www.turismoquesesente.com.br" />
          </Section>

          <Section title="Realização (parceiros institucionais)">
            <Field
              label="Nomes dos realizadores (separados por vírgula)"
              value={(form.promoter_names || []).join(", ")}
              onChange={(v) => updateArr("promoter_names", v)}
              testID="field-promoter-names"
              hint="Ex: SENAC RN, SEBRAE RN"
            />
            <Field
              label="URLs dos logos (vírgula, na mesma ordem)"
              value={(form.promoter_logos || []).join(", ")}
              onChange={(v) => updateArr("promoter_logos", v)}
              testID="field-promoter-logos"
              multiline
              hint="Cole as URLs dos logos. A ordem deve corresponder aos nomes acima."
            />
          </Section>

          <Section title="Emergência (botão SOS)">
            <Field label="Polícia (Polícia Militar)" value={form.emergency_police || ""} onChange={(v) => update("emergency_police", v)} testID="field-em-police" />
            <Field label="SAMU (ambulância)" value={form.emergency_ambulance || ""} onChange={(v) => update("emergency_ambulance", v)} testID="field-em-ambulance" />
            <Field label="Bombeiros" value={form.emergency_fire || ""} onChange={(v) => update("emergency_fire", v)} testID="field-em-fire" />
            <Field label="Turismo / DELETUR" value={form.emergency_tourist || ""} onChange={(v) => update("emergency_tourist", v)} testID="field-em-tourist" />
          </Section>

          <Section title="Visibilidade de seções">
            <ToggleRow
              label="Exibir aba de Guias Certificados"
              value={form.show_guides_tab !== false}
              onChange={(v) => update("show_guides_tab", v)}
              testID="toggle-show-guides"
            />
            <ToggleRow
              label="Exibir aba de Parceiros (Marketplace)"
              value={form.show_marketplace_tab !== false}
              onChange={(v) => update("show_marketplace_tab", v)}
              testID="toggle-show-marketplace"
            />
            <ToggleRow
              label="Exibir aba Sobre o projeto"
              value={form.show_about_tab !== false}
              onChange={(v) => update("show_about_tab", v)}
              testID="toggle-show-about"
            />
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

function ToggleRow({ label, value, onChange, testID }: {
  label: string; value: boolean; onChange: (v: boolean) => void; testID?: string;
}) {
  return (
    <TouchableOpacity
      style={styles.toggleRow}
      onPress={() => onChange(!value)}
      testID={testID}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
    >
      <Ionicons
        name={value ? "checkbox" : "square-outline"}
        size={24}
        color={value ? colors.brand : colors.textMuted}
      />
      <Text style={styles.toggleLabel}>{label}</Text>
    </TouchableOpacity>
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
  toggleRow: {
    flexDirection: "row", alignItems: "center", gap: spacing.sm,
    paddingVertical: 8,
  },
  toggleLabel: { color: colors.text, fontSize: fontSizes.body, flex: 1 },
  previewRow: {
    flexDirection: "row", gap: 8, marginTop: 8,
  },
  previewBox: {
    flex: 1, backgroundColor: colors.bg,
    borderRadius: radii.input, padding: 8,
    borderWidth: 1, borderColor: colors.border,
    alignItems: "center",
  },
  previewImg: { width: "100%", height: 70, borderRadius: 4 },
  previewLabel: { color: colors.textMuted, fontSize: 10, marginTop: 4, fontWeight: "700" },
});
