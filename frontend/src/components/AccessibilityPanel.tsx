import { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Switch, Animated, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, fontSizes, radii, spacing } from "@/src/theme";
import { useA11y } from "@/src/accessibility";

/**
 * Floating accessibility panel.
 * - Tap the FAB (top-right) to expand/collapse.
 * - Toggles persist between sessions.
 */
export function AccessibilityPanel() {
  const { prefs, set } = useA11y();
  const [anim] = useState(new Animated.Value(0));

  useEffect(() => {
    Animated.timing(anim, {
      toValue: prefs.panelOpen ? 1 : 0,
      duration: 250,
      useNativeDriver: false,
    }).start();
  }, [prefs.panelOpen, anim]);

  const togglePanel = () => {
    set("panelOpen", !prefs.panelOpen);
  };

  const onToggle = (key: keyof typeof prefs, v: boolean) => {
    set(key, v);
  };

  return (
    <>
      <TouchableOpacity
        style={styles.fab}
        onPress={togglePanel}
        accessibilityRole="button"
        accessibilityState={{ expanded: prefs.panelOpen }}
        accessibilityLabel={prefs.panelOpen ? "Fechar painel de acessibilidade" : "Abrir painel de acessibilidade"}
        testID="a11y-fab"
      >
        <Ionicons name="accessibility" size={26} color="#fff" />
      </TouchableOpacity>

      {prefs.panelOpen && (
        <Animated.View style={[styles.panel, { opacity: anim }]} testID="a11y-panel">
          <View style={styles.panelHeader}>
            <Ionicons name="accessibility" size={20} color={colors.brand} />
            <Text accessibilityRole="header" style={styles.panelTitle}>Acessibilidade</Text>
            <TouchableOpacity onPress={togglePanel} accessibilityRole="button" accessibilityLabel="Fechar painel de acessibilidade" testID="a11y-close">
              <Ionicons name="close" size={22} color={colors.text} />
            </TouchableOpacity>
          </View>

          <Toggle
            label="Audiodescrição ao tocar"
            hint="Lê o conteúdo em voz alta ao tocar nos itens"
            icon="volume-high"
            value={prefs.speakOnTouch}
            onChange={(v) => onToggle("speakOnTouch", v)}
            testID="toggle-speak"
          />

          <Text style={styles.note}>
            Use com o leitor de tela do aparelho (VoiceOver/TalkBack) DESLIGADO — se ele
            estiver ligado, o app não fala para não duplicar a leitura. Preferências
            salvas neste dispositivo.
          </Text>
        </Animated.View>
      )}
    </>
  );
}

function Toggle({ label, hint, icon, value, onChange, testID }: {
  label: string;
  hint: string;
  icon: keyof typeof Ionicons.glyphMap;
  value: boolean;
  onChange: (v: boolean) => void;
  testID: string;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={18} color={colors.brand} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowHint}>{hint}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: colors.surfaceElevated, true: colors.brand }}
        thumbColor="#fff"
        accessibilityLabel={label}
        accessibilityHint={hint}
        testID={testID}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    top: Platform.OS === "web" ? 16 : 56,
    right: 16,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 999,
    shadowColor: colors.brand,
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 10,
    borderWidth: 2,
    borderColor: "#fff",
  },
  panel: {
    position: "absolute",
    top: Platform.OS === "web" ? 78 : 120,
    right: 16,
    width: 320,
    maxWidth: "92%",
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.brand,
    zIndex: 998,
    shadowColor: "#000",
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 16,
  },
  panelHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: spacing.sm,
  },
  panelTitle: { color: colors.text, fontSize: fontSizes.h3, fontWeight: "800", flex: 1 },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 10, gap: spacing.sm },
  rowIcon: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.badgeBg,
    alignItems: "center", justifyContent: "center",
  },
  rowLabel: { color: colors.text, fontSize: 14, fontWeight: "700" },
  rowHint: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  note: { color: colors.textMuted, fontSize: 11, fontStyle: "italic", marginTop: spacing.sm, textAlign: "center" },
});
