import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Switch,
  Alert,
  Platform,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

import { colors, fontSizes, radii, spacing, LOGO_URL } from "@/src/theme";
import { useAuth } from "@/src/auth-context";
import { t } from "@/src/i18n";
import { useA11y, useSpeakOnPress, NO_SELECT_WEB } from "@/src/accessibility";
import { SealFooter } from "@/src/components/SealBranding";
import { SpeakableText } from "@/src/components/SpeakableText";

export default function Menu() {
  const { user, signIn, signOut, language, setLanguage } = useAuth();
  const { prefs, set } = useA11y();
  const speakOnPress = useSpeakOnPress();

  const confirmLogout = () => {
    const cb = () => signOut();
    if (Platform.OS === "web") {
      if (window.confirm("Tem certeza que deseja sair?")) cb();
      return;
    }
    Alert.alert("Sair", "Tem certeza que deseja sair?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Sair", style: "destructive", onPress: cb },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Voltar" testID="back-button">
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </TouchableOpacity>
        <SpeakableText accessibilityRole="header" style={styles.headerTitle}>{t(language, "menu_title")}</SpeakableText>
        <View style={styles.iconBtn} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: spacing.lg }} showsVerticalScrollIndicator={false}>
        {/* Profile card */}
        <View style={styles.profile}>
          {user ? (
            <>
              {user.picture ? (
                <Image source={{ uri: user.picture }} style={styles.avatar} accessibilityLabel={`Foto de perfil de ${user.name}`} />
              ) : (
                <View style={styles.avatarFallback}>
                  <Text style={styles.avatarText}>{user.name?.[0]?.toUpperCase() || "U"}</Text>
                </View>
              )}
              <Text style={styles.userName}>{user.name}</Text>
              <Text style={styles.userEmail}>{user.email}</Text>
              <View style={styles.statRow}>
                <View style={styles.statBox}>
                  <Text style={styles.statValue}>{user.favorites?.length || 0}</Text>
                  <Text style={styles.statLabel}>Favoritos</Text>
                </View>
              </View>
            </>
          ) : (
            <>
              <Image source={{ uri: LOGO_URL }} style={styles.logo} resizeMode="contain" accessibilityLabel="Logo Turismo que se Sente" />
              <SpeakableText style={styles.greeting}>{t(language, "menu_greeting")}</SpeakableText>
              <TouchableOpacity
                style={[styles.loginBtn, NO_SELECT_WEB]}
                onPress={() => router.push("/login")}
                onLongPress={() => speakOnPress(t(language, "login"))}
                accessibilityRole="button"
                accessibilityLabel="Entrar com a conta Google"
                testID="goto-login-button"
              >
                <Ionicons name="logo-google" size={18} color="#fff" />
                <Text style={styles.loginBtnText}>{t(language, "login")}</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Idioma */}
        <Section title={t(language, "menu_sec_language")}>
          <View style={styles.langRow}>
            {(["pt", "en", "es"] as const).map((l) => (
              <TouchableOpacity
                key={l}
                style={[styles.langOption, language === l && styles.langOptionActive]}
                onPress={() => setLanguage(l)}
                accessibilityRole="button"
                accessibilityState={{ selected: language === l }}
                accessibilityLabel={`Mudar idioma para ${l === "pt" ? "Português" : l === "en" ? "Inglês" : "Espanhol"}`}
                testID={`menu-lang-${l}`}
              >
                <Text style={[styles.langLabel, language === l && styles.langLabelActive]}>
                  {l === "pt" ? "🇧🇷 Português" : l === "en" ? "🇺🇸 English" : "🇪🇸 Español"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Section>

        {/* Acessibilidade toggles */}
        <Section title={t(language, "menu_sec_accessibility")}>
          <View style={styles.card}>
            <ToggleRow
              icon="volume-high-outline"
              label="Audiodescrição (segure para ouvir)"
              value={prefs.speakOnTouch}
              onChange={(v) => set("speakOnTouch", v)}
              testID="toggle-speak"
            />
          </View>
        </Section>

        {/* Navegação */}
        <Section title={t(language, "menu_sec_navigation")}>
          <View style={styles.card}>
            <LinkRow icon="map" label={t(language, "menu_map")} onPress={() => router.push("/map")} testID="link-map" />
            <View style={styles.divider} />
            <LinkRow icon="people" label={t(language, "guides_title")} onPress={() => router.push("/guides")} testID="link-guides" />
            <View style={styles.divider} />
            <LinkRow icon="storefront" label={t(language, "partners_title")} onPress={() => router.push("/marketplace")} testID="link-marketplace" />
            <View style={styles.divider} />
            <LinkRow icon="ribbon" label={t(language, "seal_title")} onPress={() => router.push("/seal")} testID="link-seal" />
            <View style={styles.divider} />
            <LinkRow icon="warning" label={t(language, "emergency")} onPress={() => router.push("/emergency")} testID="link-emergency" iconColor={colors.error} />
          </View>
        </Section>

        {/* Sobre */}
        <Section title={t(language, "menu_sec_about")}>
          <View style={styles.card}>
            <LinkRow
              icon="information-circle"
              label={t(language, "menu_about_project")}
              onPress={() => router.push("/about")}
              testID="link-about-project"
            />
            <View style={styles.divider} />
            <LinkRow
              icon="chatbubble-outline"
              label={t(language, "menu_feedback")}
              onPress={() => Linking.openURL("mailto:feedback@turismoquesesente.com.br?subject=Feedback%20App")}
              testID="link-feedback"
            />
            <View style={styles.divider} />
            <LinkRow icon="cog-outline" label={t(language, "menu_admin")} onPress={() => router.push("/admin")} testID="link-admin" />
          </View>
        </Section>

        {/* Logout */}
        {user && (
          <TouchableOpacity style={[styles.logoutBtn, NO_SELECT_WEB]} onPress={confirmLogout} onLongPress={() => speakOnPress(t(language, "menu_logout"))} accessibilityRole="button" accessibilityLabel="Sair da conta" testID="logout-button">
            <Ionicons name="log-out-outline" size={20} color={colors.error} />
            <Text style={styles.logoutText}>{t(language, "menu_logout")}</Text>
          </TouchableOpacity>
        )}

        <Text style={styles.version}>v2.0.0 • Feito com ♥ em Natal/RN</Text>

        <SealFooter />
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <SpeakableText accessibilityRole="header" style={styles.sectionTitle}>{title}</SpeakableText>
      {children}
    </View>
  );
}

function ToggleRow({ icon, label, value, onChange, testID }: {
  icon: keyof typeof Ionicons.glyphMap; label: string; value: boolean; onChange: (v: boolean) => void; testID: string;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.iconWrap}><Ionicons name={icon} size={20} color={colors.brand} /></View>
      <Text style={[styles.rowLabel, { flex: 1 }]}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: colors.surfaceElevated, true: colors.brand }}
        thumbColor="#fff"
        accessibilityLabel={label}
        testID={testID}
      />
    </View>
  );
}

function LinkRow({ icon, label, onPress, iconColor, testID }: {
  icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; iconColor?: string; testID: string;
}) {
  const speakOnPress = useSpeakOnPress();
  return (
    <TouchableOpacity style={[styles.row, NO_SELECT_WEB]} onPress={onPress} onLongPress={() => speakOnPress(label)} testID={testID} accessibilityRole="button" accessibilityLabel={label}>
      <View style={styles.iconWrap}><Ionicons name={icon} size={20} color={iconColor || colors.brand} /></View>
      <Text style={[styles.rowLabel, { flex: 1 }]}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
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
  profile: { alignItems: "center", paddingVertical: spacing.lg, paddingHorizontal: spacing.md },
  logo: { width: 120, height: 80 },
  avatar: { width: 88, height: 88, borderRadius: 44, borderWidth: 3, borderColor: colors.brand },
  avatarFallback: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: colors.brand,
    alignItems: "center", justifyContent: "center",
  },
  avatarText: { color: "#fff", fontWeight: "800", fontSize: 32 },
  userName: { color: colors.text, fontSize: 20, fontWeight: "800", marginTop: spacing.sm },
  userEmail: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
  statRow: { flexDirection: "row", gap: spacing.md, marginTop: spacing.sm },
  statBox: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.card,
    borderWidth: 1, borderColor: colors.border,
    alignItems: "center", minWidth: 90,
  },
  statValue: { color: colors.brand, fontWeight: "800", fontSize: 20 },
  statLabel: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  greeting: { color: colors.text, fontSize: fontSizes.h3, fontWeight: "700", marginTop: spacing.sm, textAlign: "center" },
  loginBtn: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: colors.brand,
    paddingHorizontal: spacing.lg, paddingVertical: 12,
    borderRadius: radii.pill,
    gap: 8, marginTop: spacing.md,
  },
  loginBtnText: { color: "#fff", fontWeight: "800" },
  section: { paddingHorizontal: spacing.md, marginTop: spacing.md },
  sectionTitle: {
    color: colors.textMuted, fontSize: 12, fontWeight: "700",
    textTransform: "uppercase", letterSpacing: 1, marginBottom: spacing.sm,
  },
  langRow: { flexDirection: "row", gap: spacing.sm },
  langOption: {
    flex: 1,
    backgroundColor: colors.surface,
    paddingVertical: 12,
    borderRadius: radii.card,
    borderWidth: 1, borderColor: colors.border,
    alignItems: "center",
  },
  langOptionActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  langLabel: { color: colors.text, fontSize: 13, fontWeight: "700" },
  langLabelActive: { color: "#fff" },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    borderWidth: 1, borderColor: colors.border,
    overflow: "hidden",
  },
  row: { flexDirection: "row", alignItems: "center", padding: spacing.md, gap: spacing.sm, minHeight: 56 },
  iconWrap: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.badgeBg,
    alignItems: "center", justifyContent: "center",
  },
  rowLabel: { color: colors.text, fontSize: fontSizes.body, fontWeight: "600" },
  divider: { height: 1, backgroundColor: colors.border, marginLeft: 64 },
  logoutBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    marginHorizontal: spacing.md, marginTop: spacing.lg,
    padding: spacing.md, borderRadius: radii.card,
    borderWidth: 1, borderColor: colors.error,
    gap: 8,
  },
  logoutText: { color: colors.error, fontWeight: "700", fontSize: fontSizes.body },
  version: { color: colors.textMuted, textAlign: "center", marginTop: spacing.md, fontSize: 12 },
});
