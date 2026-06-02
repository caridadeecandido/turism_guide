import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Linking,
  Alert,
  Switch,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";

import { colors, fontSizes, radii, spacing, LOGO_URL } from "@/src/theme";

type MenuItem = {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  subtitle?: string;
  toggle?: boolean;
  onPress?: () => void;
};

export default function Menu() {
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [highContrast, setHighContrast] = useState(true);
  const [hapticsEnabled, setHapticsEnabled] = useState(true);

  const sections: { title: string; items: MenuItem[] }[] = [
    {
      title: "Conta",
      items: [
        { key: "profile", label: "Perfil", icon: "person-outline" },
        { key: "favorites", label: "Favoritos", icon: "heart-outline" },
        { key: "history", label: "Histórico", icon: "time-outline" },
      ],
    },
    {
      title: "Acessibilidade",
      items: [
        { key: "audio", label: "Audiodescrição", icon: "volume-high-outline", toggle: true },
        { key: "contrast", label: "Alto contraste", icon: "contrast-outline", toggle: true },
        { key: "haptics", label: "Vibração tátil", icon: "phone-portrait-outline", toggle: true },
      ],
    },
    {
      title: "Configurações",
      items: [
        { key: "lang", label: "Idioma", subtitle: "Português (BR)", icon: "language-outline" },
        { key: "help", label: "Ajuda", icon: "help-circle-outline" },
        {
          key: "feedback",
          label: "Enviar feedback",
          icon: "chatbubble-outline",
          onPress: () => Linking.openURL("mailto:feedback@turismoquesesente.com.br?subject=Feedback%20App"),
        },
        { key: "about", label: "Sobre o aplicativo", icon: "information-circle-outline" },
      ],
    },
  ];

  const renderItem = (item: MenuItem) => {
    const isToggle = !!item.toggle;
    const value =
      item.key === "audio" ? audioEnabled :
      item.key === "contrast" ? highContrast :
      item.key === "haptics" ? hapticsEnabled : false;
    const setter =
      item.key === "audio" ? setAudioEnabled :
      item.key === "contrast" ? setHighContrast :
      item.key === "haptics" ? setHapticsEnabled : undefined;

    return (
      <TouchableOpacity
        key={item.key}
        style={styles.row}
        disabled={isToggle}
        onPress={item.onPress}
        accessibilityLabel={item.label}
        testID={`menu-${item.key}`}
      >
        <View style={styles.iconWrap}>
          <Ionicons name={item.icon} size={20} color={colors.brand} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.rowLabel}>{item.label}</Text>
          {item.subtitle && <Text style={styles.rowSubtitle}>{item.subtitle}</Text>}
        </View>
        {isToggle ? (
          <Switch
            value={value}
            onValueChange={setter}
            trackColor={{ false: colors.surfaceElevated, true: colors.brand }}
            thumbColor="#fff"
            testID={`toggle-${item.key}`}
          />
        ) : (
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        )}
      </TouchableOpacity>
    );
  };

  const callEmergency = () => {
    Alert.alert(
      "Ligar para emergência?",
      "Será efetuada uma chamada para o número 190 (Polícia Militar).",
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Ligar", style: "destructive", onPress: () => Linking.openURL("tel:190") },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => router.back()}
          accessibilityLabel="Voltar"
          testID="back-button"
        >
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Menu</Text>
        <View style={styles.iconBtn} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: spacing.lg }} showsVerticalScrollIndicator={false}>
        {/* Profile card */}
        <View style={styles.profile}>
          <Image source={{ uri: LOGO_URL }} style={styles.profileLogo} resizeMode="contain" />
          <Text style={styles.greeting}>Olá! Vamos explorar Natal juntos.</Text>
          <Text style={styles.subtext}>Turismo que se Sente</Text>
        </View>

        {sections.map((sec) => (
          <View key={sec.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{sec.title}</Text>
            <View style={styles.card}>
              {sec.items.map((item, idx) => (
                <View key={item.key}>
                  {renderItem(item)}
                  {idx < sec.items.length - 1 && <View style={styles.divider} />}
                </View>
              ))}
            </View>
          </View>
        ))}

        {/* Admin link */}
        <TouchableOpacity
          style={styles.adminBtn}
          onPress={() => router.push("/admin")}
          testID="admin-button"
          accessibilityLabel="Abrir painel administrativo"
        >
          <MaterialCommunityIcons name="cog-outline" size={20} color={colors.brandLight} />
          <Text style={styles.adminText}>Painel administrativo</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.brandLight} />
        </TouchableOpacity>

        {/* Emergency */}
        <TouchableOpacity
          style={styles.emergencyBtn}
          onPress={callEmergency}
          accessibilityLabel="Ligar para emergência"
          testID="emergency-button"
        >
          <Ionicons name="warning" size={22} color="#fff" />
          <Text style={styles.emergencyText}>Emergência</Text>
        </TouchableOpacity>

        <Text style={styles.version}>v1.0.0 • Feito com ♥ em Natal/RN</Text>
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
  headerTitle: { color: colors.text, fontSize: fontSizes.h3, fontWeight: "700" },
  profile: {
    alignItems: "center",
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  profileLogo: { width: 120, height: 80 },
  greeting: { color: colors.text, fontSize: fontSizes.h3, fontWeight: "700", marginTop: spacing.sm, textAlign: "center" },
  subtext: { color: colors.brandLight, fontSize: 13, marginTop: 4, fontWeight: "600" },
  section: { paddingHorizontal: spacing.md, marginTop: spacing.md },
  sectionTitle: { color: colors.textMuted, fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1, marginBottom: spacing.sm },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  row: { flexDirection: "row", alignItems: "center", padding: spacing.md, gap: spacing.sm, minHeight: 56 },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.badgeBg,
    alignItems: "center",
    justifyContent: "center",
  },
  rowLabel: { color: colors.text, fontSize: fontSizes.body, fontWeight: "600" },
  rowSubtitle: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
  divider: { height: 1, backgroundColor: colors.border, marginLeft: 64 },
  adminBtn: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.brand,
    gap: spacing.sm,
  },
  adminText: { color: colors.text, flex: 1, fontWeight: "600", fontSize: fontSizes.body },
  emergencyBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.error,
    margin: spacing.md,
    paddingVertical: 16,
    borderRadius: radii.card,
    gap: 8,
    shadowColor: colors.error,
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  emergencyText: { color: "#fff", fontWeight: "800", fontSize: 17 },
  version: { color: colors.textMuted, textAlign: "center", marginTop: spacing.md, fontSize: 12 },
});
