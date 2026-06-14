import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Linking,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";

import { colors, fontSizes, radii, spacing } from "@/src/theme";
import { useAuth } from "@/src/auth-context";
import { useSiteConfig } from "@/src/site-config";
import { SealFooter } from "@/src/components/SealBranding";

type Lang = "pt" | "en" | "es";

const LABELS = {
  pt: {
    title: "Sobre o projeto",
    aboutTitle: "O que é o Turismo que se Sente",
    mission: "Missão",
    vision: "Visão",
    pillars: "Pilares de acessibilidade",
    contact: "Fale com a gente",
    follow: "Siga nas redes sociais",
    promoters: "Realização",
    pillarsList: [
      { icon: "eye-off", title: "Audiodescrição", desc: "Roteiros narrados ricos em detalhes táteis, olfativos e sonoros." },
      { icon: "hand-left", title: "Libras", desc: "Atendimento e tradução em Língua Brasileira de Sinais." },
      { icon: "paw", title: "Cães-guia", desc: "Estabelecimentos acolhedores que recebem cães-guia." },
      { icon: "accessibility", title: "Mobilidade", desc: "Rampas, banheiros adaptados e rotas para cadeirantes." },
      { icon: "happy", title: "Neurodiversidade", desc: "Espaços calmos com baixa estimulação sensorial para TEA." },
    ],
  },
  en: {
    title: "About the project",
    aboutTitle: "What is Turismo que se Sente",
    mission: "Mission",
    vision: "Vision",
    pillars: "Accessibility pillars",
    contact: "Get in touch",
    follow: "Follow us on social media",
    promoters: "Powered by",
    pillarsList: [
      { icon: "eye-off", title: "Audio description", desc: "Narrated tours rich in tactile, olfactory, and sound details." },
      { icon: "hand-left", title: "Sign language", desc: "Service and interpretation in Brazilian Sign Language." },
      { icon: "paw", title: "Guide dogs", desc: "Welcoming establishments that receive guide dogs." },
      { icon: "accessibility", title: "Mobility", desc: "Ramps, adapted bathrooms, and routes for wheelchair users." },
      { icon: "happy", title: "Neurodiversity", desc: "Calm spaces with low sensory stimulation for autism." },
    ],
  },
  es: {
    title: "Acerca del proyecto",
    aboutTitle: "Qué es Turismo que se Sente",
    mission: "Misión",
    vision: "Visión",
    pillars: "Pilares de accesibilidad",
    contact: "Contáctenos",
    follow: "Síguenos en redes sociales",
    promoters: "Promovido por",
    pillarsList: [
      { icon: "eye-off", title: "Audiodescripción", desc: "Recorridos narrados ricos en detalles táctiles, olfativos y sonoros." },
      { icon: "hand-left", title: "Lengua de señas", desc: "Atención y traducción en Lengua de Señas Brasileña." },
      { icon: "paw", title: "Perros guía", desc: "Establecimientos acogedores que reciben perros guía." },
      { icon: "accessibility", title: "Movilidad", desc: "Rampas, baños adaptados y rutas para personas en sillas de ruedas." },
      { icon: "happy", title: "Neurodiversidad", desc: "Espacios tranquilos con baja estimulación sensorial para autismo." },
    ],
  },
};

export default function About() {
  const { language } = useAuth();
  const { config } = useSiteConfig();
  const lang = (language as Lang) || "pt";
  const L = LABELS[lang];

  const aboutText = lang === "en" ? config.about_en : lang === "es" ? config.about_es : config.about_pt;
  const missionText = lang === "en" ? config.mission_en : lang === "es" ? config.mission_es : config.mission_pt;
  const visionText = lang === "en" ? config.vision_en : lang === "es" ? config.vision_es : config.vision_pt;

  const open = (url: string) => Linking.openURL(url).catch(() => {});

  const handlePhone = (raw: string) => raw && open(`tel:${raw.replace(/[^0-9+]/g, "")}`);
  const handleEmail = (raw: string) => raw && open(`mailto:${raw}`);
  const handleWhatsapp = (raw: string) => raw && open(`https://wa.me/${raw.replace(/[^0-9]/g, "")}`);
  const handleInstagram = (raw: string) => raw && open(`https://instagram.com/${raw.replace(/^@/, "")}`);
  const handleFacebook = (raw: string) => raw && open(`https://facebook.com/${raw.replace(/^@/, "")}`);
  const handleYoutube = (raw: string) => raw && open(`https://youtube.com/${raw.startsWith("@") ? raw : "@" + raw}`);
  const handleTiktok = (raw: string) => raw && open(`https://tiktok.com/@${raw.replace(/^@/, "")}`);
  const handleWebsite = (raw: string) => raw && open(raw.startsWith("http") ? raw : `https://${raw}`);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Voltar" testID="back-button">
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </TouchableOpacity>
        <Text accessibilityRole="header" style={styles.headerTitle}>{L.title}</Text>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.push("/seal")} accessibilityRole="button" accessibilityLabel="Sobre o selo Categoria Ouro" testID="open-seal-button">
          <Ionicons name="ribbon" size={22} color={colors.brand} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing.xl }}>
        {/* Hero image */}
        {!!config.hero_image_url && (
          <View style={styles.heroWrap}>
            <Image
              source={{ uri: config.hero_image_url }}
              style={styles.heroImg}
              accessibilityLabel="Vista de Natal/RN"
            />
            <View style={styles.heroOverlay}>
              <Image
                source={{ uri: config.seal_image_url }}
                style={styles.heroSeal}
                resizeMode="contain"
                accessibilityLabel={config.seal_alt}
              />
              <Text accessibilityRole="header" style={styles.heroTitle}>{config.app_name}</Text>
              <Text style={styles.heroSub}>{config.header_banner_subtitle}</Text>
            </View>
          </View>
        )}

        {/* About */}
        {!!aboutText && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="information-circle" size={20} color={colors.brand} />
              <Text accessibilityRole="header" style={styles.sectionTitle}>{L.aboutTitle}</Text>
            </View>
            <Text style={styles.bodyText}>{aboutText}</Text>
          </View>
        )}

        {/* Mission & Vision */}
        {(!!missionText || !!visionText) && (
          <View style={styles.dualSection}>
            {!!missionText && (
              <View style={[styles.miniCard, { borderLeftColor: colors.brand }]}>
                <View style={styles.miniHeader}>
                  <Ionicons name="flag" size={18} color={colors.brand} />
                  <Text accessibilityRole="header" style={styles.miniTitle}>{L.mission}</Text>
                </View>
                <Text style={styles.miniBody}>{missionText}</Text>
              </View>
            )}
            {!!visionText && (
              <View style={[styles.miniCard, { borderLeftColor: "#F59E0B" }]}>
                <View style={styles.miniHeader}>
                  <Ionicons name="eye" size={18} color="#F59E0B" />
                  <Text accessibilityRole="header" style={styles.miniTitle}>{L.vision}</Text>
                </View>
                <Text style={styles.miniBody}>{visionText}</Text>
              </View>
            )}
          </View>
        )}

        {/* Pillars */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="hand-heart" size={20} color={colors.brand} />
            <Text accessibilityRole="header" style={styles.sectionTitle}>{L.pillars}</Text>
          </View>
          <View style={styles.pillarsGrid}>
            {L.pillarsList.map((p) => (
              <View key={p.title} style={styles.pillarCard}>
                <View style={styles.pillarIconWrap}>
                  <Ionicons name={p.icon as any} size={22} color={colors.brand} />
                </View>
                <Text style={styles.pillarTitle}>{p.title}</Text>
                <Text style={styles.pillarDesc}>{p.desc}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Contact */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="call" size={20} color={colors.brand} />
            <Text accessibilityRole="header" style={styles.sectionTitle}>{L.contact}</Text>
          </View>

          {!!config.contact_email && (
            <ContactRow
              icon="mail"
              label={lang === "en" ? "Email" : lang === "es" ? "Correo" : "E-mail"}
              value={config.contact_email}
              onPress={() => handleEmail(config.contact_email)}
              testID="contact-email"
            />
          )}
          {!!config.contact_phone && (
            <ContactRow
              icon="call"
              label={lang === "en" ? "Phone" : lang === "es" ? "Teléfono" : "Telefone"}
              value={config.contact_phone}
              onPress={() => handlePhone(config.contact_phone)}
              testID="contact-phone"
            />
          )}
          {!!config.contact_whatsapp && (
            <ContactRow
              icon="logo-whatsapp"
              label="WhatsApp"
              value={config.contact_whatsapp}
              onPress={() => handleWhatsapp(config.contact_whatsapp)}
              tint="#25D366"
              testID="contact-whatsapp"
            />
          )}
          {!!config.contact_address && (
            <ContactRow
              icon="location"
              label={lang === "en" ? "Address" : lang === "es" ? "Dirección" : "Endereço"}
              value={config.contact_address}
              multiline
              testID="contact-address"
            />
          )}
        </View>

        {/* Social */}
        {(config.instagram || config.facebook || config.youtube || config.tiktok || config.website) && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="share-social" size={20} color={colors.brand} />
              <Text accessibilityRole="header" style={styles.sectionTitle}>{L.follow}</Text>
            </View>
            <View style={styles.socialGrid}>
              {!!config.instagram && (
                <SocialBtn
                  icon="logo-instagram"
                  color="#E1306C"
                  label="Instagram"
                  handle={config.instagram}
                  onPress={() => handleInstagram(config.instagram)}
                  testID="social-instagram"
                />
              )}
              {!!config.facebook && (
                <SocialBtn
                  icon="logo-facebook"
                  color="#1877F2"
                  label="Facebook"
                  handle={config.facebook}
                  onPress={() => handleFacebook(config.facebook)}
                  testID="social-facebook"
                />
              )}
              {!!config.youtube && (
                <SocialBtn
                  icon="logo-youtube"
                  color="#FF0000"
                  label="YouTube"
                  handle={config.youtube}
                  onPress={() => handleYoutube(config.youtube)}
                  testID="social-youtube"
                />
              )}
              {!!config.tiktok && (
                <SocialBtn
                  icon="logo-tiktok"
                  color="#000"
                  label="TikTok"
                  handle={config.tiktok}
                  onPress={() => handleTiktok(config.tiktok)}
                  testID="social-tiktok"
                />
              )}
              {!!config.website && (
                <SocialBtn
                  icon="globe"
                  color={colors.brand}
                  label="Website"
                  handle={config.website.replace(/^https?:\/\//, "")}
                  onPress={() => handleWebsite(config.website)}
                  testID="social-website"
                />
              )}
            </View>
          </View>
        )}

        {/* Promoters / sponsors */}
        {config.promoter_names.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="school" size={20} color={colors.brand} />
              <Text accessibilityRole="header" style={styles.sectionTitle}>{L.promoters}</Text>
            </View>
            <View style={styles.promotersRow}>
              {config.promoter_names.map((name, i) => (
                <View key={name + i} style={styles.promoterCard}>
                  {!!config.promoter_logos[i] && (
                    <Image
                      source={{ uri: config.promoter_logos[i] }}
                      style={styles.promoterLogo}
                      resizeMode="contain"
                      accessibilityLabel={`Logo ${name}`}
                    />
                  )}
                  <Text style={styles.promoterName}>{name}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <SealFooter />
      </ScrollView>
    </SafeAreaView>
  );
}

function ContactRow({
  icon, label, value, onPress, tint, multiline, testID,
}: {
  icon: any; label: string; value: string;
  onPress?: () => void; tint?: string; multiline?: boolean; testID?: string;
}) {
  const Wrap: any = onPress ? TouchableOpacity : View;
  return (
    <Wrap
      style={styles.contactRow}
      onPress={onPress}
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={`${label}: ${value}`}
      testID={testID}
    >
      <View style={[styles.contactIconWrap, !!tint && { backgroundColor: `${tint}20` }]}>
        <Ionicons name={icon} size={18} color={tint || colors.brand} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.contactLabel}>{label}</Text>
        <Text style={styles.contactValue} numberOfLines={multiline ? 0 : 1}>{value}</Text>
      </View>
      {onPress && <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />}
    </Wrap>
  );
}

function SocialBtn({
  icon, color, label, handle, onPress, testID,
}: {
  icon: any; color: string; label: string; handle: string;
  onPress: () => void; testID?: string;
}) {
  return (
    <TouchableOpacity
      style={styles.socialBtn}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label} ${handle}`}
      testID={testID}
    >
      <View style={[styles.socialIconWrap, { backgroundColor: `${color}20` }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.socialLabel}>{label}</Text>
        <Text style={styles.socialHandle} numberOfLines={1}>{handle}</Text>
      </View>
      <Ionicons name="open-outline" size={14} color={colors.textMuted} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
  },
  iconBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  headerTitle: { color: colors.text, fontSize: fontSizes.h3, fontWeight: "700" },

  heroWrap: {
    marginHorizontal: spacing.md, marginBottom: spacing.md,
    borderRadius: radii.card, overflow: "hidden",
    backgroundColor: colors.surface,
  },
  heroImg: { width: "100%", height: 200, backgroundColor: colors.surfaceElevated },
  heroOverlay: {
    position: "absolute", left: 0, right: 0, bottom: 0,
    backgroundColor: "rgba(11, 17, 32, 0.85)",
    padding: spacing.md, alignItems: "center", gap: 4,
  },
  heroSeal: { width: 64, height: 64, marginBottom: 4 },
  heroTitle: { color: "#fff", fontSize: fontSizes.h2, fontWeight: "800", textAlign: "center" },
  heroSub: { color: "#fff", opacity: 0.9, fontSize: fontSizes.small, textAlign: "center" },

  section: {
    backgroundColor: colors.surface,
    marginHorizontal: spacing.md, marginBottom: spacing.md,
    padding: spacing.md, borderRadius: radii.card,
    borderWidth: 1, borderColor: colors.border,
  },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: spacing.sm },
  sectionTitle: { color: colors.text, fontSize: fontSizes.body, fontWeight: "800" },
  bodyText: { color: colors.textSecondary, fontSize: fontSizes.body, lineHeight: 23 },

  dualSection: { paddingHorizontal: spacing.md, gap: spacing.sm, marginBottom: spacing.md },
  miniCard: {
    backgroundColor: colors.surface, padding: spacing.md,
    borderRadius: radii.card, borderLeftWidth: 4,
    borderTopWidth: 1, borderRightWidth: 1, borderBottomWidth: 1, borderColor: colors.border,
  },
  miniHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  miniTitle: { color: colors.text, fontWeight: "800", fontSize: fontSizes.body },
  miniBody: { color: colors.textSecondary, fontSize: fontSizes.small, lineHeight: 20 },

  pillarsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  pillarCard: {
    flexBasis: "47%", flexGrow: 1,
    backgroundColor: colors.surfaceElevated,
    padding: spacing.sm, borderRadius: radii.card,
    borderWidth: 1, borderColor: colors.border,
    minHeight: 120,
  },
  pillarIconWrap: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.badgeBg,
    alignItems: "center", justifyContent: "center",
    marginBottom: 8,
  },
  pillarTitle: { color: colors.text, fontSize: fontSizes.small, fontWeight: "700", marginBottom: 2 },
  pillarDesc: { color: colors.textSecondary, fontSize: 11, lineHeight: 16 },

  contactRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  contactIconWrap: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.badgeBg,
    alignItems: "center", justifyContent: "center",
  },
  contactLabel: { color: colors.textMuted, fontSize: 11, fontWeight: "600", textTransform: "uppercase" },
  contactValue: { color: colors.text, fontSize: fontSizes.body, fontWeight: "600", marginTop: 1 },

  socialGrid: { gap: 8 },
  socialBtn: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingVertical: 10, paddingHorizontal: 8,
    borderRadius: radii.card,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1, borderColor: colors.border,
  },
  socialIconWrap: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: "center", justifyContent: "center",
  },
  socialLabel: { color: colors.text, fontWeight: "700", fontSize: fontSizes.small },
  socialHandle: { color: colors.textSecondary, fontSize: 12, marginTop: 1 },

  promotersRow: { flexDirection: "row", flexWrap: "wrap", gap: 12, justifyContent: "center", paddingTop: 4 },
  promoterCard: { alignItems: "center", gap: 4, padding: 4 },
  promoterLogo: { width: 80, height: 60, backgroundColor: "#fff", borderRadius: 8, padding: 4 },
  promoterName: { color: colors.textSecondary, fontSize: 11, fontWeight: "600" },
});
