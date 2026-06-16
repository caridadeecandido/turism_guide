import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  ActivityIndicator,
  Linking,
  Platform,
  Alert,
  KeyboardAvoidingView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import QRCode from "react-native-qrcode-svg";
import { LinearGradient } from "expo-linear-gradient";

import { colors, fontSizes, radii, spacing } from "@/src/theme";
import { api, Partner } from "@/src/api";
import { resolveAssetUrl } from "@/src/asset-url";
import { useAuth } from "@/src/auth-context";
import { useA11y } from "@/src/accessibility";

export default function PartnerDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { vibrate } = useA11y();
  const [partner, setPartner] = useState<Partner | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [date, setDate] = useState("");
  const [people, setPeople] = useState("1");
  const [needs, setNeeds] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const data = await api.getPartner(id);
        setPartner(data);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
    }
  }, [user]);

  const submit = async () => {
    if (!partner) return;
    if (!name.trim() || !email.trim() || !message.trim()) {
      const msg = "Preencha nome, e-mail e mensagem.";
      if (Platform.OS === "web") window.alert(msg);
      else Alert.alert("Atenção", msg);
      return;
    }
    setSubmitting(true);
    try {
      await api.createInquiry({
        partner_id: partner.id,
        name, email, phone, message,
        date, people: parseInt(people, 10) || 1,
        accessibility_needs: needs,
      });
      setSuccess(true);
      setMessage("");
    } catch (e: any) {
      const m = `Erro: ${e.message || e}`;
      if (Platform.OS === "web") window.alert(m);
      else Alert.alert("Erro", m);
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
  if (!partner) {
    return (
      <View style={styles.center}>
        <Text style={{ color: colors.text }}>Parceiro não encontrado.</Text>
      </View>
    );
  }

  const openWhatsapp = () => {
    const w = partner.whatsapp.replace(/\D/g, "");
    const msg = encodeURIComponent(`Olá! Vi seu cadastro no app Turismo que se Sente e gostaria de saber mais sobre ${partner.name}.`);
    Linking.openURL(`https://wa.me/${w}?text=${msg}`);
  };

  return (
    <View style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
          <View style={styles.hero}>
            <Image
              source={{ uri: resolveAssetUrl(partner.image_url) }}
              style={styles.heroImage}
              accessibilityLabel={`Foto de ${partner.name}`}
            />
            <LinearGradient
              colors={["rgba(11,17,32,0.6)", "transparent", "rgba(11,17,32,0.95)"]}
              style={StyleSheet.absoluteFillObject}
            />
            <SafeAreaView style={styles.heroTop} edges={["top"]}>
              <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Voltar" testID="back-button">
                <Ionicons name="chevron-back" size={26} color={colors.text} />
              </TouchableOpacity>
              {partner.has_seal && (
                <View style={styles.sealTag}>
                  <Ionicons name="ribbon" size={14} color={colors.brand} />
                  <Text style={styles.sealTagText}>Selo TQSS</Text>
                </View>
              )}
            </SafeAreaView>
            <View style={styles.heroBottom}>
              <Text style={styles.heroCat}>{partner.category.toUpperCase()}</Text>
              <Text accessibilityRole="header" style={styles.heroTitle}>{partner.name}</Text>
              <View style={styles.locationRow}>
                <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
                <Text style={styles.location}>{partner.neighborhood}, Natal – RN</Text>
              </View>
            </View>
          </View>

          <View style={styles.badgesRow}>
            {partner.badges.map((b) => (
              <View key={b} style={styles.badge}>
                <Ionicons name="checkmark-circle" size={14} color={colors.success} />
                <Text style={styles.badgeText}>{b}</Text>
              </View>
            ))}
          </View>

          <View style={styles.section}>
            <Text accessibilityRole="header" style={styles.sectionTitle}>Sobre</Text>
            <Text style={styles.description}>{partner.short_description}</Text>
          </View>

          <View style={styles.section}>
            <Text accessibilityRole="header" style={styles.sectionTitle}>Acessibilidade</Text>
            {partner.accessibility_features.map((f, idx) => (
              <View key={idx} style={styles.feat}>
                <View style={styles.featIcon}>
                  <Ionicons name="checkmark" size={16} color={colors.brand} />
                </View>
                <Text style={styles.featText}>{f}</Text>
              </View>
            ))}
          </View>

          <View style={styles.section}>
            <Text accessibilityRole="header" style={styles.sectionTitle}>Selo Digital de Certificação</Text>
            <View style={styles.sealCard}>
              <View
                style={styles.qrWrap}
                accessible
                accessibilityRole="image"
                accessibilityLabel={`QR code do selo de certificação de ${partner.name}, código ${partner.seal_code}`}
              >
                <QRCode value={partner.seal_code} size={120} backgroundColor="#fff" color={colors.bg} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.sealLabel}>Código do selo</Text>
                <Text style={styles.sealCode} selectable testID="seal-code">{partner.seal_code}</Text>
                <Text style={styles.sealHint}>
                  Aponte a câmera para o QR code para verificar a certificação Turismo que se Sente.
                </Text>
                <TouchableOpacity onPress={() => router.push("/seal")} accessibilityRole="button" accessibilityLabel="Verificar selos de certificação" testID="verify-seal-button">
                  <Text style={styles.verifyLink}>Verificar selos →</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text accessibilityRole="header" style={styles.sectionTitle}>Contato</Text>
            <View style={styles.contactRow}>
              {partner.whatsapp && (
                <TouchableOpacity style={[styles.contactBtn, { backgroundColor: "#25D366" }]} onPress={openWhatsapp} accessibilityRole="button" accessibilityLabel={`Conversar pelo WhatsApp com ${partner.name}`} testID="whatsapp-button">
                  <Ionicons name="logo-whatsapp" size={18} color="#fff" />
                  <Text style={styles.contactText}>WhatsApp</Text>
                </TouchableOpacity>
              )}
              {partner.phone && (
                <TouchableOpacity style={styles.contactBtn} onPress={() => Linking.openURL(`tel:${partner.phone}`)} accessibilityRole="button" accessibilityLabel={`Ligar para ${partner.name}`} testID="phone-button">
                  <Ionicons name="call" size={18} color="#fff" />
                  <Text style={styles.contactText}>Ligar</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.contactBtn} onPress={() => Linking.openURL(`mailto:${partner.email}`)} accessibilityRole="button" accessibilityLabel={`Enviar e-mail para ${partner.name}`} testID="email-button">
                <Ionicons name="mail" size={18} color="#fff" />
                <Text style={styles.contactText}>E-mail</Text>
              </TouchableOpacity>
            </View>
          </View>

          {showForm ? (
            <View style={styles.section}>
              <Text accessibilityRole="header" style={styles.sectionTitle}>Solicitar reserva / informações</Text>
              {success ? (
                <View style={styles.successBox} testID="inquiry-success">
                  <Ionicons name="checkmark-circle" size={36} color={colors.success} />
                  <Text style={styles.successTitle}>Solicitação enviada!</Text>
                  <Text style={styles.successText}>
                    O parceiro entrará em contato pelo e-mail informado. Você também recebeu uma cópia.
                  </Text>
                  <TouchableOpacity onPress={() => { setSuccess(false); setShowForm(false); }} accessibilityRole="button" accessibilityLabel="Fechar mensagem de sucesso" testID="close-success">
                    <Text style={styles.verifyLink}>Fechar</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  <Field label="Seu nome *" value={name} onChange={setName} testID="field-name" />
                  <Field label="Seu e-mail *" value={email} onChange={setEmail} testID="field-email" />
                  <Field label="Telefone (opcional)" value={phone} onChange={setPhone} testID="field-phone" />
                  <Field label="Data desejada (ex.: 15/02/2026)" value={date} onChange={setDate} testID="field-date" />
                  <Field label="Pessoas" value={people} onChange={setPeople} testID="field-people" keyboardType="numeric" />
                  <Field label="Necessidades de acessibilidade" value={needs} onChange={setNeeds} multiline testID="field-needs" />
                  <Field label="Mensagem *" value={message} onChange={setMessage} multiline testID="field-message" />

                  <TouchableOpacity
                    style={styles.submitBtn}
                    onPress={submit}
                    disabled={submitting}
                    accessibilityRole="button"
                    accessibilityLabel={`Enviar solicitação de reserva para ${partner.name}`}
                    testID="submit-inquiry-button"
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
                </>
              )}
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Sticky bottom CTA */}
      {!showForm && (
        <SafeAreaView style={styles.bottomBar} edges={["bottom"]}>
          <View style={styles.priceBox}>
            <Text style={styles.priceLabel}>A partir de</Text>
            <Text style={styles.priceValue}>{partner.price_from || "Sob consulta"}</Text>
          </View>
          <TouchableOpacity
            style={styles.reserveBtn}
            onPress={() => { vibrate("medium"); setShowForm(true); }}
            accessibilityRole="button"
            accessibilityLabel={`Reservar ${partner.name}`}
            testID="reserve-button"
          >
            <Ionicons name="calendar" size={18} color="#fff" />
            <Text style={styles.reserveText}>Reservar</Text>
          </TouchableOpacity>
        </SafeAreaView>
      )}
    </View>
  );
}

function Field({
  label, value, onChange, multiline, keyboardType, testID,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
  keyboardType?: "default" | "numeric" | "email-address";
  testID?: string;
}) {
  return (
    <View style={{ marginBottom: spacing.sm }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && { minHeight: 80, textAlignVertical: "top" }]}
        value={value}
        onChangeText={onChange}
        multiline={multiline}
        keyboardType={keyboardType || "default"}
        placeholderTextColor={colors.textMuted}
        accessibilityLabel={label}
        testID={testID}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg },
  hero: { height: 320, position: "relative" },
  heroImage: { width: "100%", height: "100%", position: "absolute" },
  heroTop: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: spacing.md },
  iconBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: "rgba(11,17,32,0.6)",
    alignItems: "center", justifyContent: "center",
  },
  sealTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.95)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.pill,
    gap: 4,
  },
  sealTagText: { color: colors.brand, fontWeight: "800", fontSize: 12 },
  heroBottom: { position: "absolute", bottom: spacing.md, left: spacing.md, right: spacing.md },
  heroCat: { color: colors.brandLight, fontSize: 11, fontWeight: "700", letterSpacing: 1, marginBottom: 4 },
  heroTitle: { color: "#fff", fontSize: 26, fontWeight: "800" },
  locationRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6 },
  location: { color: colors.textSecondary, fontSize: 14 },
  badgesRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, padding: spacing.md },
  badge: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: colors.successBg,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: radii.pill, gap: 4,
  },
  badgeText: { color: colors.success, fontSize: 12, fontWeight: "700" },
  section: { paddingHorizontal: spacing.md, marginTop: spacing.md },
  sectionTitle: { color: colors.text, fontSize: fontSizes.h3, fontWeight: "700", marginBottom: spacing.sm },
  description: { color: colors.textSecondary, fontSize: fontSizes.body, lineHeight: 22 },
  feat: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: 8 },
  featIcon: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: colors.badgeBg,
    alignItems: "center", justifyContent: "center",
  },
  featText: { color: colors.text, fontSize: fontSizes.body, flex: 1, lineHeight: 22 },
  sealCard: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    padding: spacing.md,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.brand,
    alignItems: "center",
  },
  qrWrap: { backgroundColor: "#fff", padding: 8, borderRadius: 8 },
  sealLabel: { color: colors.textMuted, fontSize: 11, textTransform: "uppercase", letterSpacing: 1 },
  sealCode: { color: colors.text, fontSize: 20, fontWeight: "800", marginTop: 2, fontVariant: ["tabular-nums"] },
  sealHint: { color: colors.textSecondary, fontSize: 12, marginTop: 6, lineHeight: 16 },
  verifyLink: { color: colors.brandLight, fontWeight: "700", marginTop: 8, fontSize: 13 },
  contactRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  contactBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radii.pill,
    backgroundColor: colors.brand,
    gap: 6,
  },
  contactText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  fieldLabel: { color: colors.textSecondary, fontSize: 13, fontWeight: "600", marginBottom: 4 },
  input: {
    backgroundColor: colors.surface,
    color: colors.text,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.border,
    fontSize: fontSizes.body,
  },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.brand,
    paddingVertical: 14,
    borderRadius: radii.pill,
    gap: 8,
    marginTop: spacing.sm,
  },
  submitText: { color: "#fff", fontWeight: "800", fontSize: 16 },
  successBox: {
    backgroundColor: colors.successBg,
    borderRadius: radii.card,
    padding: spacing.lg,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.success,
    gap: 6,
  },
  successTitle: { color: colors.text, fontSize: 18, fontWeight: "800", marginTop: 4 },
  successText: { color: colors.textSecondary, textAlign: "center", lineHeight: 20 },
  bottomBar: {
    position: "absolute",
    bottom: 0, left: 0, right: 0,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  priceBox: { flex: 1 },
  priceLabel: { color: colors.textMuted, fontSize: 11 },
  priceValue: { color: colors.text, fontSize: 16, fontWeight: "800" },
  reserveBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.brand,
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    borderRadius: radii.pill,
    gap: 8,
  },
  reserveText: { color: "#fff", fontWeight: "800", fontSize: 15 },
});
