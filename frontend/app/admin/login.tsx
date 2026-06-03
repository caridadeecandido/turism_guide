import { useState } from "react";
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity, ActivityIndicator, Image, ScrollView,
  KeyboardAvoidingView, Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { colors, fontSizes, radii, spacing, LOGO_URL } from "@/src/theme";
import { useAdminAuth } from "@/src/admin-auth";

export default function AdminLogin() {
  const { signIn } = useAdminAuth();
  const [email, setEmail] = useState("admin@turismoquesesente.com.br");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    if (!email.trim() || !password) {
      setError("Informe e-mail e senha.");
      return;
    }
    setLoading(true);
    const r = await signIn(email.trim().toLowerCase(), password);
    setLoading(false);
    if (!r.ok) setError(r.error || "Falha no login");
    else router.replace("/admin");
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.top}>
        <TouchableOpacity onPress={() => router.replace("/")} style={styles.back} testID="back-button">
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Image source={{ uri: LOGO_URL }} style={styles.logo} resizeMode="contain" />
          <Text style={styles.title}>Painel administrativo</Text>
          <Text style={styles.subtitle}>Acesso restrito ao administrador do sistema</Text>

          <View style={styles.field}>
            <Text style={styles.label}>E-mail</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="mail-outline" size={18} color={colors.textMuted} />
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                placeholderTextColor={colors.textMuted}
                testID="admin-email-input"
              />
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Senha</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} />
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!show}
                placeholderTextColor={colors.textMuted}
                testID="admin-password-input"
              />
              <TouchableOpacity onPress={() => setShow((s) => !s)} testID="toggle-show-password">
                <Ionicons name={show ? "eye-off" : "eye"} size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          </View>

          {error && (
            <View style={styles.errorBox} testID="admin-error">
              <Ionicons name="alert-circle" size={18} color={colors.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.btn}
            onPress={submit}
            disabled={loading}
            testID="admin-login-button"
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="shield-checkmark" size={18} color="#fff" />
                <Text style={styles.btnText}>Entrar como administrador</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={styles.tip}>
            <Ionicons name="information-circle" size={18} color={colors.brandLight} />
            <Text style={styles.tipText}>
              Acesso restrito a administradores autorizados. Tentativas de acesso são registradas.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  top: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  back: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  scroll: { padding: spacing.lg, paddingBottom: spacing.lg, gap: spacing.md },
  logo: { width: 140, height: 90, alignSelf: "center" },
  title: { color: colors.text, fontSize: 24, fontWeight: "800", textAlign: "center" },
  subtitle: { color: colors.textSecondary, fontSize: 14, textAlign: "center", marginTop: -8 },
  field: { gap: 6, marginTop: spacing.sm },
  label: { color: colors.textSecondary, fontSize: 13, fontWeight: "700" },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: spacing.md,
    gap: 8,
    minHeight: 52,
  },
  input: { flex: 1, color: colors.text, fontSize: 16 },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(239,68,68,0.15)",
    borderRadius: 12,
    padding: spacing.sm,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.error,
  },
  errorText: { color: colors.error, fontSize: 13, flex: 1 },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.brand,
    paddingVertical: 16,
    borderRadius: radii.pill,
    gap: 8,
    marginTop: spacing.sm,
  },
  btnText: { color: "#fff", fontWeight: "800", fontSize: 16 },
  tip: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    padding: spacing.md,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  tipText: { color: colors.textSecondary, fontSize: 12, flex: 1, lineHeight: 16 },
});
