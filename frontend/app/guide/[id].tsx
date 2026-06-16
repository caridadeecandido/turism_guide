import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  TextInput,
  Platform,
  Linking,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";

import { colors, fontSizes, radii, spacing } from "@/src/theme";
import { api, Guide } from "@/src/api";
import { resolveAssetUrl } from "@/src/asset-url";
import { useAuth } from "@/src/auth-context";
import { useA11y } from "@/src/accessibility";
import { useSiteConfig } from "@/src/site-config";
import { SealFooter, SealCircle } from "@/src/components/SealBranding";

export default function GuideDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, language } = useAuth();
  const { vibrate } = useA11y();
  const { config } = useSiteConfig();

  const [guide, setGuide] = useState<Guide | null>(null);
  const [loading, setLoading] = useState(true);

  const [translatedBio, setTranslatedBio] = useState<string>("");
  const [translatedShort, setTranslatedShort] = useState<string>("");

  const [showInquiry, setShowInquiry] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const g = await api.getGuide(id);
        setGuide(g);
      } catch (e) {
        console.warn("getGuide", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  useEffect(() => {
    if (!guide) return;
    if (language === "pt") {
      setTranslatedBio("");
      setTranslatedShort("");
      return;
    }
    (async () => {
      try {
        const r = await api.translateGuide(guide.id, language);
        setTranslatedBio(r.full_description);
        setTranslatedShort(r.short_description);
      } catch (e) {
        console.warn("translateGuide", e);
      }
    })();
  }, [language, guide]);

  useEffect(() => {
    if (user && !name) setName(user.name);
    if (user && !email) setEmail(user.email);
  }, [user, name, email]);

  const handlePhone = (raw: string) => {
    if (!raw) return;
    const cleaned = raw.replace(/[^0-9+]/g, "");
    Linking.openURL(`tel:${cleaned}`).catch(() => {});
  };

  const handleWhatsapp = (raw: string) => {
    if (!raw) return;
    const cleaned = raw.replace(/[^0-9]/g, "");
    const text = encodeURIComponent(
      `Olá, ${guide?.name}! Vi seu perfil no app Turismo que se Sente e gostaria de saber mais sobre seus tours.`,
    );
    Linking.openURL(`https://wa.me/${cleaned}?text=${text}`).catch(() => {});
  };

  const handleEmail = (raw: string) => {
    if (!raw) return;
    const subject = encodeURIComponent(`Contato via Turismo que se Sente — ${guide?.name}`);
    Linking.openURL(`mailto:${raw}?subject=${subject}`).catch(() => {});
  };

  const handleInstagram = (handle: string) => {
    if (!handle) return;
    const user = handle.replace(/^@/, "");
    Linking.openURL(`https://instagram.com/${user}`).catch(() => {});
  };

  const submitInquiry = async () => {
    if (!guide) return;
    if (!name.trim() || !email.trim() || !message.trim()) {
      const msg = "Preencha nome, e-mail e mensagem.";
      if (Platform.OS === "web") window.alert(msg);
      else Alert.alert("Atenção", msg);
      return;
    }
    try {
      setSubmitting(true);
      await api.createInquiry({
        guide_id: guide.id,
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        message: message.trim(),
      });
      const ok = "Solicitação enviada! O guia entrará em contato.";
      if (Platform.OS === "web") window.alert(ok);
      else Alert.alert("Sucesso", ok);
      setShowInquiry(false);
      setMessage("");
    } catch (e: any) {
      const err = `Erro: ${e?.message || "tente novamente"}`;
      if (Platform.OS === "web") window.alert(err);
      else Alert.alert("Erro", err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.brand} size="large" />
      </View>
    );
  }

  if (!guide) {
    return (
      <View style={styles.center}>
        <Text style={{ color: colors.text }}>Guia não encontrado.</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backLink} accessibilityRole="button" accessibilityLabel="Voltar">
          <Text style={styles.backLinkText}>Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const bioText = language === "pt" ? guide.bio : translatedBio || guide.bio;
  const shortText = language === "pt" ? guide.short_bio : translatedShort || guide.short_bio;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Voltar" testID="back-button">
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </TouchableOpacity>
        <Text accessibilityRole="header" style={styles.headerTitle} numberOfLines={1}>Guia Certificado</Text>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.push("/seal")} accessibilityRole="button" accessibilityLabel="Sobre o selo Categoria Ouro" testID="open-seal-button">
          <Ionicons name="ribbon" size={22} color={colors.brand} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing.xl }}>
        {/* Hero with photo and seal */}
        <View style={styles.heroWrap}>
          <View style={styles.photoBig}>
            {guide.photo_url ? (
              <Image
                source={{ uri: resolveAssetUrl(guide.photo_url) }}
                style={styles.photoBigImg}
                accessibilityLabel={guide.photo_alt || `Foto de ${guide.name}`}
              />
            ) : (
              <View style={[styles.photoBigImg, styles.photoPlaceholder]}>
                <Ionicons name="person" size={100} color={colors.textMuted} />
              </View>
            )}
            {guide.has_seal && (
              <View style={styles.sealRibbon} accessibilityLabel="Selo Categoria Ouro">
                <Image
                  source={{ uri: config.seal_image_url }}
                  style={styles.sealRibbonImg}
                  resizeMode="contain"
                  accessibilityLabel={config.seal_alt}
                />
              </View>
            )}
          </View>
          <Text accessibilityRole="header" style={styles.name}>{guide.name}</Text>
          <View style={styles.row}>
            <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
            <Text style={styles.region}>{guide.region}</Text>
            <Text style={styles.dot}>·</Text>
            <Ionicons name="star" size={14} color="#F59E0B" />
            <Text style={styles.region}>{guide.rating.toFixed(1)}</Text>
            <Text style={styles.dot}>·</Text>
            <Text style={styles.region}>{guide.years_experience} anos</Text>
          </View>
          {language !== "pt" && (
            <View style={styles.langPill}>
              <Ionicons name="language" size={12} color={colors.brand} />
              <Text style={styles.langPillText}>{language === "en" ? "English" : "Español"}</Text>
            </View>
          )}
          <Text style={styles.shortBio}>{shortText}</Text>
        </View>

        {/* Contact actions */}
        <View style={styles.contactGrid}>
          {!!guide.whatsapp && (
            <TouchableOpacity
              style={[styles.contactBtn, { backgroundColor: "#25D366" }]}
              onPress={() => handleWhatsapp(guide.whatsapp)}
              accessibilityLabel={`Conversar pelo WhatsApp com ${guide.name}`}
              testID="whatsapp-btn"
            >
              <Ionicons name="logo-whatsapp" size={22} color="#fff" />
              <Text style={styles.contactText}>WhatsApp</Text>
            </TouchableOpacity>
          )}
          {!!guide.phone && (
            <TouchableOpacity
              style={[styles.contactBtn, { backgroundColor: colors.brand }]}
              onPress={() => handlePhone(guide.phone)}
              accessibilityLabel={`Ligar para ${guide.name}`}
              testID="phone-btn"
            >
              <Ionicons name="call" size={22} color="#fff" />
              <Text style={styles.contactText}>Ligar</Text>
            </TouchableOpacity>
          )}
          {!!guide.email && (
            <TouchableOpacity
              style={[styles.contactBtn, { backgroundColor: colors.surfaceElevated, borderWidth: 1, borderColor: colors.border }]}
              onPress={() => handleEmail(guide.email)}
              accessibilityLabel={`Enviar e-mail para ${guide.name}`}
              testID="email-btn"
            >
              <Ionicons name="mail" size={22} color={colors.text} />
              <Text style={[styles.contactText, { color: colors.text }]}>E-mail</Text>
            </TouchableOpacity>
          )}
          {!!guide.instagram && (
            <TouchableOpacity
              style={[styles.contactBtn, { backgroundColor: "#E1306C" }]}
              onPress={() => handleInstagram(guide.instagram)}
              accessibilityLabel={`Abrir Instagram de ${guide.name}`}
              testID="instagram-btn"
            >
              <Ionicons name="logo-instagram" size={22} color="#fff" />
              <Text style={styles.contactText}>Instagram</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Certification block */}
        <View style={styles.certBlock}>
          <View style={styles.certHeader}>
            <SealCircle size={60} style={styles.certSeal} />
            <View style={{ flex: 1 }}>
              <Text accessibilityRole="header" style={styles.certTitle}>Certificação Categoria Ouro</Text>
              <Text style={styles.certCourse}>{guide.certification_course}</Text>
              {!!guide.certification_date && (
                <Text style={styles.certDate}>
                  Concluído em {formatDate(guide.certification_date)}
                </Text>
              )}
              <Text style={styles.certCode}>Código: {guide.seal_code}</Text>
            </View>
          </View>
        </View>

        {/* Specialties */}
        <Section title="Especialidades" icon="briefcase-outline">
          <View style={styles.tagsWrap}>
            {guide.specialties.map((s) => (
              <View key={s} style={styles.tag}>
                <Text style={styles.tagText}>{s}</Text>
              </View>
            ))}
          </View>
        </Section>

        {/* Languages */}
        <Section title="Idiomas" icon="language-outline">
          <View style={styles.tagsWrap}>
            {guide.languages.map((l) => (
              <View key={l} style={[styles.tag, { backgroundColor: colors.surfaceElevated }]}>
                <Ionicons name="checkmark-circle" size={12} color={colors.brand} />
                <Text style={[styles.tagText, { color: colors.text }]}>{l}</Text>
              </View>
            ))}
          </View>
        </Section>

        {/* Accessibility Focus */}
        <Section title="Atendimento especializado" icon="accessibility-outline">
          <View style={styles.tagsWrap}>
            {guide.accessibility_focus.map((f) => (
              <View key={f} style={[styles.tag, { backgroundColor: "rgba(124, 58, 237, 0.18)" }]}>
                <MaterialCommunityIcons name="hand-heart" size={12} color={colors.brandLight} />
                <Text style={[styles.tagText, { color: colors.brandLight }]}>{f}</Text>
              </View>
            ))}
          </View>
        </Section>

        {/* Bio */}
        {!!bioText && (
          <Section title="Sobre o guia" icon="person-outline">
            <Text style={styles.bioText}>{bioText}</Text>
          </Section>
        )}

        {/* Inquiry CTA */}
        <TouchableOpacity
          style={styles.cta}
          onPress={() => { vibrate("medium"); setShowInquiry((v) => !v); }}
          accessibilityRole="button"
          accessibilityLabel={showInquiry ? "Cancelar solicitação de contato" : `Solicitar contato com ${guide.name}`}
          testID="open-inquiry-btn"
        >
          <Ionicons name="chatbubbles" size={20} color="#fff" />
          <Text style={styles.ctaText}>
            {showInquiry ? "Cancelar solicitação" : "Solicitar contato"}
          </Text>
        </TouchableOpacity>

        {showInquiry && (
          <View style={styles.form}>
            <Text accessibilityRole="header" style={styles.formTitle}>Enviar solicitação</Text>
            <Field label="Seu nome*" value={name} onChange={setName} testID="inq-name" />
            <Field label="E-mail*" value={email} onChange={setEmail} keyboardType="email-address" testID="inq-email" />
            <Field label="Telefone (opcional)" value={phone} onChange={setPhone} keyboardType="phone-pad" testID="inq-phone" />
            <Field
              label="Mensagem*"
              value={message}
              onChange={setMessage}
              multiline
              numberOfLines={4}
              testID="inq-message"
            />
            <TouchableOpacity
              style={[styles.submit, submitting && { opacity: 0.6 }]}
              onPress={submitInquiry}
              disabled={submitting}
              accessibilityRole="button"
              accessibilityLabel="Enviar solicitação de contato"
              testID="inq-submit"
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="send" size={18} color="#fff" />
                  <Text style={styles.submitText}>Enviar solicitação</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        <SealFooter />
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Ionicons name={icon} size={18} color={colors.brand} />
        <Text accessibilityRole="header" style={styles.sectionTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function Field({
  label, value, onChange, multiline, numberOfLines, keyboardType, testID,
}: {
  label: string; value: string; onChange: (s: string) => void;
  multiline?: boolean; numberOfLines?: number;
  keyboardType?: "default" | "email-address" | "phone-pad"; testID?: string;
}) {
  return (
    <View style={{ marginBottom: spacing.sm }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && { height: 90, textAlignVertical: "top" }]}
        value={value}
        onChangeText={onChange}
        multiline={multiline}
        numberOfLines={numberOfLines}
        keyboardType={keyboardType}
        placeholderTextColor={colors.textMuted}
        accessibilityLabel={label}
        testID={testID}
      />
    </View>
  );
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
  } catch {
    return iso;
  }
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg, gap: 12 },
  backLink: { padding: 8 },
  backLinkText: { color: colors.brand, fontWeight: "700" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  iconBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  headerTitle: { color: colors.text, fontSize: fontSizes.h3, fontWeight: "700" },

  heroWrap: { alignItems: "center", paddingHorizontal: spacing.md, paddingTop: spacing.sm },
  photoBig: { width: 160, height: 160, position: "relative", marginBottom: spacing.sm },
  photoBigImg: { width: 160, height: 160, borderRadius: 80, backgroundColor: colors.surfaceElevated },
  photoPlaceholder: { alignItems: "center", justifyContent: "center" },
  sealRibbon: {
    position: "absolute",
    bottom: -4,
    right: -4,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderWidth: 3,
    borderColor: colors.bg,
  },
  sealRibbonImg: { width: 50, height: 50 },
  name: { color: colors.text, fontSize: fontSizes.h2, fontWeight: "800", textAlign: "center" },
  row: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6, flexWrap: "wrap", justifyContent: "center" },
  region: { color: colors.textSecondary, fontSize: fontSizes.small },
  dot: { color: colors.textMuted, fontSize: 12, marginHorizontal: 2 },
  langPill: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: colors.badgeBg,
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: radii.pill, marginTop: 8,
  },
  langPillText: { color: colors.brand, fontSize: 11, fontWeight: "700" },
  shortBio: {
    color: colors.textSecondary, fontSize: fontSizes.body,
    textAlign: "center", lineHeight: 22,
    marginTop: spacing.sm, paddingHorizontal: spacing.sm,
  },

  contactGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: spacing.md,
    marginTop: spacing.md,
  },
  contactBtn: {
    flexGrow: 1, minWidth: 140,
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    paddingVertical: 12, borderRadius: radii.button, gap: 8,
  },
  contactText: { color: "#fff", fontWeight: "700", fontSize: fontSizes.body },

  certBlock: {
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    padding: spacing.md,
    borderWidth: 2,
    borderColor: colors.brand,
  },
  certHeader: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  certSeal: { width: 60, height: 60 },
  certTitle: { color: colors.brand, fontSize: fontSizes.body, fontWeight: "800" },
  certCourse: { color: colors.text, fontSize: fontSizes.small, marginTop: 2, fontWeight: "600" },
  certDate: { color: colors.textSecondary, fontSize: 11, marginTop: 2 },
  certCode: { color: colors.textMuted, fontSize: 10, marginTop: 2, fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace" },

  section: {
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: spacing.sm },
  sectionTitle: { color: colors.text, fontSize: fontSizes.body, fontWeight: "700" },

  tagsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  tag: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: colors.badgeBg,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: radii.pill,
  },
  tagText: { color: colors.brand, fontSize: 12, fontWeight: "700" },

  bioText: { color: colors.textSecondary, fontSize: fontSizes.body, lineHeight: 23 },

  cta: {
    backgroundColor: colors.brand,
    marginHorizontal: spacing.md, marginTop: spacing.md,
    paddingVertical: 14, borderRadius: radii.button,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
  },
  ctaText: { color: "#fff", fontSize: fontSizes.body, fontWeight: "700" },

  form: {
    backgroundColor: colors.surface,
    marginHorizontal: spacing.md, marginTop: spacing.sm,
    padding: spacing.md, borderRadius: radii.card,
    borderWidth: 1, borderColor: colors.border,
  },
  formTitle: { color: colors.text, fontSize: fontSizes.body, fontWeight: "700", marginBottom: spacing.sm },
  label: { color: colors.textSecondary, fontSize: 12, marginBottom: 4, fontWeight: "600" },
  input: {
    backgroundColor: colors.surfaceElevated,
    color: colors.text,
    borderRadius: radii.input,
    paddingHorizontal: 12, paddingVertical: 10,
    fontSize: fontSizes.body,
    borderWidth: 1, borderColor: colors.border,
  },
  submit: {
    backgroundColor: colors.brand,
    paddingVertical: 12, borderRadius: radii.button,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    marginTop: spacing.sm,
  },
  submitText: { color: "#fff", fontWeight: "700", fontSize: fontSizes.body },
});
