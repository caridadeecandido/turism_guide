import { View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect } from "react";

import { colors, fontSizes, radii, spacing, LOGO_URL } from "@/src/theme";
import { useAuth } from "@/src/auth-context";

export default function Login() {
  const { user, signIn, loading } = useAuth();

  useEffect(() => {
    if (user) router.replace("/");
  }, [user]);

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.top}>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Voltar"
          testID="back-button"
        >
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Image source={{ uri: LOGO_URL }} style={styles.logo} resizeMode="contain" accessibilityLabel="Logo Turismo que se Sente" />
        <Text accessibilityRole="header" style={styles.title}>Turismo que se Sente</Text>
        <Text style={styles.subtitle}>
          Faça login para salvar seus favoritos, sincronizar entre dispositivos e fazer reservas em parceiros acessíveis.
        </Text>

        <View style={styles.benefits}>
          {[
            { icon: "heart", text: "Favorite pontos turísticos" },
            { icon: "earth", text: "Conteúdo em PT, EN e ES" },
            { icon: "shield-checkmark", text: "Login seguro com Google" },
          ].map((b) => (
            <View key={b.icon} style={styles.benefit}>
              <View style={styles.benefitIcon}>
                <Ionicons name={b.icon as any} size={18} color={colors.brand} />
              </View>
              <Text style={styles.benefitText}>{b.text}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={styles.googleBtn}
          onPress={signIn}
          disabled={loading}
          accessibilityRole="button"
          accessibilityLabel="Entrar com a conta Google"
          testID="google-signin-button"
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <View style={styles.gIcon}>
                <Text style={styles.gIconText}>G</Text>
              </View>
              <Text style={styles.googleBtnText}>Entrar com Google</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.replace("/")}
          accessibilityRole="button"
          accessibilityLabel="Continuar sem login"
          testID="skip-login-button"
        >
          <Text style={styles.skip}>Continuar sem login</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.terms}>
        Ao continuar, você concorda com os termos do projeto Turismo que se Sente (SENAC/RN).
      </Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  top: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  iconBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  content: { flex: 1, justifyContent: "center", paddingHorizontal: spacing.lg, gap: spacing.lg },
  logo: { width: 200, height: 120, alignSelf: "center" },
  title: { color: colors.text, fontSize: 28, fontWeight: "800", textAlign: "center", marginTop: -10 },
  subtitle: { color: colors.textSecondary, fontSize: 15, lineHeight: 22, textAlign: "center" },
  benefits: { gap: spacing.sm, marginVertical: spacing.md },
  benefit: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  benefitIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.badgeBg,
    alignItems: "center",
    justifyContent: "center",
  },
  benefitText: { color: colors.text, fontSize: fontSizes.body, flex: 1 },
  googleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    paddingVertical: 14,
    borderRadius: radii.pill,
    gap: 12,
    minHeight: 56,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  gIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#4285F4",
    alignItems: "center",
    justifyContent: "center",
  },
  gIconText: { color: "#fff", fontWeight: "900", fontSize: 14 },
  googleBtnText: { color: "#202124", fontWeight: "700", fontSize: 16 },
  skip: { color: colors.textMuted, textAlign: "center", marginTop: spacing.sm, fontSize: 14, textDecorationLine: "underline" },
  terms: {
    color: colors.textMuted,
    textAlign: "center",
    fontSize: 11,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
});
