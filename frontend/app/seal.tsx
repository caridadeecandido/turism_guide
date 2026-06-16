import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

import { colors, fontSizes, radii, spacing } from "@/src/theme";
import { api } from "@/src/api";
import { useAuth } from "@/src/auth-context";
import { t } from "@/src/i18n";
import { useSiteConfig, localizedField } from "@/src/site-config";
import { SealFooter, SealCircle } from "@/src/components/SealBranding";
import { SpeakableText } from "@/src/components/SpeakableText";
import { useSpeakOnPress, NO_SELECT_WEB } from "@/src/accessibility";

export default function Seal() {
  const { config } = useSiteConfig();
  const { language } = useAuth();
  const speakOnPress = useSpeakOnPress();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    valid: boolean;
    partner?: any;
    message: string;
  } | null>(null);

  const verify = async () => {
    if (!code.trim()) return;
    setLoading(true);
    try {
      const r = await api.verifySeal(code.trim());
      setResult(r);
    } catch (e: any) {
      setResult({ valid: false, message: "Erro ao verificar: " + (e.message || e) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Voltar" testID="back-button">
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </TouchableOpacity>
        <SpeakableText accessibilityRole="header" style={styles.title}>{t(language, "seal_title")}</SpeakableText>
        <View style={styles.iconBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.seal}>
          <SealCircle size={120} style={styles.sealRing} />
          <SpeakableText accessibilityRole="header" style={styles.sealName}>{config.app_name}</SpeakableText>
          <SpeakableText style={styles.sealTag}>{t(language, "seal_cert_subtitle")}</SpeakableText>
        </View>

        <SpeakableText style={styles.intro}>
          {t(language, "seal_intro")}
        </SpeakableText>

        <View style={styles.card}>
          <SpeakableText accessibilityRole="header" style={styles.cardTitle}>{t(language, "seal_verify_title")}</SpeakableText>
          <SpeakableText style={styles.cardHint}>
            {t(language, "seal_verify_hint")}
          </SpeakableText>
          <TextInput
            style={styles.input}
            value={code}
            onChangeText={(v) => setCode(v.toUpperCase())}
            placeholder="Ex.: A1B2C3D4E5"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="characters"
            accessibilityLabel="Código do selo do parceiro"
            testID="seal-code-input"
          />
          <TouchableOpacity
            style={[styles.verifyBtn, NO_SELECT_WEB]}
            onPress={verify}
            onLongPress={() => speakOnPress(t(language, "seal_verify_btn"))}
            disabled={loading || !code.trim()}
            accessibilityRole="button"
            accessibilityLabel="Verificar selo do parceiro"
            testID="verify-button"
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="shield-checkmark" size={18} color="#fff" />
                <Text style={styles.verifyText}>{t(language, "seal_verify_btn")}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {result && (
          <View
            style={[
              styles.resultCard,
              { backgroundColor: result.valid ? colors.successBg : "rgba(239,68,68,0.15)" },
              { borderColor: result.valid ? colors.success : colors.error },
            ]}
            testID="seal-result"
          >
            <Ionicons
              name={result.valid ? "checkmark-circle" : "close-circle"}
              size={36}
              color={result.valid ? colors.success : colors.error}
            />
            <Text style={[styles.resultTitle, { color: result.valid ? colors.success : colors.error }]}>
              {result.valid ? "Selo válido!" : "Selo não reconhecido"}
            </Text>
            <Text style={styles.resultMessage}>{result.message}</Text>
            {result.valid && result.partner && (
              <TouchableOpacity
                style={[styles.viewPartnerBtn, NO_SELECT_WEB]}
                onPress={() => router.replace(`/partner/${result.partner.id}`)}
                onLongPress={() => speakOnPress(result.partner.name)}
                accessibilityRole="button"
                accessibilityLabel={`Ver detalhes do parceiro ${result.partner.name}`}
                testID="view-partner-button"
              >
                <Text style={styles.viewPartnerText}>Ver detalhes do parceiro →</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <View style={styles.criteria}>
          <SpeakableText accessibilityRole="header" style={styles.criteriaTitle}>{t(language, "seal_criteria_title")}</SpeakableText>
          {[
            "Equipe treinada em mediação sensorial e audiodescrição",
            "Materiais informativos em braille e/ou audio",
            "Acessibilidade física (rampas, banheiros adaptados)",
            "Atendimento acolhedor para cães-guia",
            "Disponibilidade de profissionais de Libras (quando aplicável)",
          ].map((c, idx) => (
            <View key={idx} style={styles.criteriaItem}>
              <Ionicons name="checkmark-circle" size={18} color={colors.brand} />
              <Text style={styles.criteriaText}>{c}</Text>
            </View>
          ))}
        </View>

        <SealFooter />
      </ScrollView>
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
  content: { padding: spacing.md, paddingBottom: spacing.lg, gap: spacing.md },
  seal: { alignItems: "center", marginTop: spacing.sm },
  sealRing: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.badgeBg,
    borderWidth: 3,
    borderColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  sealImg: { width: 100, height: 100 },
  sealName: { color: colors.text, fontSize: 22, fontWeight: "800", marginTop: spacing.sm, textAlign: "center" },
  sealTag: { color: colors.brandLight, fontSize: 12, fontWeight: "700", letterSpacing: 1, textTransform: "uppercase" },
  intro: { color: colors.textSecondary, fontSize: 14, lineHeight: 22, textAlign: "center" },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  cardTitle: { color: colors.text, fontSize: fontSizes.h3, fontWeight: "700" },
  cardHint: { color: colors.textSecondary, fontSize: 13, lineHeight: 18 },
  input: {
    backgroundColor: colors.bg,
    color: colors.text,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: colors.border,
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 2,
    textAlign: "center",
  },
  verifyBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.brand,
    paddingVertical: 14,
    borderRadius: radii.pill,
    gap: 8,
  },
  verifyText: { color: "#fff", fontWeight: "800", fontSize: 16 },
  resultCard: {
    borderWidth: 2,
    borderRadius: radii.card,
    padding: spacing.lg,
    alignItems: "center",
    gap: 6,
  },
  resultTitle: { fontSize: 18, fontWeight: "800", marginTop: 4 },
  resultMessage: { color: colors.textSecondary, textAlign: "center", lineHeight: 20 },
  viewPartnerBtn: { marginTop: spacing.sm },
  viewPartnerText: { color: colors.brandLight, fontWeight: "700" },
  criteria: {
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  criteriaTitle: { color: colors.text, fontSize: fontSizes.body, fontWeight: "700", marginBottom: 4 },
  criteriaItem: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  criteriaText: { color: colors.textSecondary, fontSize: 13, flex: 1 },
});
