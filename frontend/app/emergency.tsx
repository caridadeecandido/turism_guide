import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Linking,
  Alert,
  Platform,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";

import { colors, fontSizes, radii, spacing } from "@/src/theme";
import { getCurrentCoords } from "@/src/geo";
import { useSiteConfig } from "@/src/site-config";

export default function Emergency() {
  const { config } = useSiteConfig();
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);

  const SERVICES = [
    { name: "SAMU", number: config.emergency_ambulance || "192", icon: "medkit", color: "#EF4444", description: "Emergências médicas" },
    { name: "Bombeiros", number: config.emergency_fire || "193", icon: "flame", color: "#F59E0B", description: "Resgate e incêndio" },
    { name: "Polícia Militar", number: config.emergency_police || "190", icon: "shield", color: "#3B82F6", description: "Segurança pública" },
    { name: "Turismo / DELETUR", number: config.emergency_tourist || "(84) 3232-2000", icon: "information-circle", color: "#A78BFA", description: "Atendimento ao turista" },
    { name: "Defesa Civil", number: "199", icon: "warning", color: "#10B981", description: "Desastres naturais" },
  ];

  useEffect(() => {
    getCurrentCoords().then(setCoords);
  }, []);

  const call = (svc: { name: string; number: string }) => {
    const cb = () => Linking.openURL(`tel:${svc.number.replace(/[^0-9+]/g, "")}`);
    if (Platform.OS === "web") {
      if (window.confirm(`Ligar para ${svc.name} (${svc.number})?`)) cb();
      return;
    }
    Alert.alert(
      `Ligar para ${svc.name}?`,
      `Será feita uma chamada para ${svc.number}.`,
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Ligar", style: "destructive", onPress: cb },
      ],
    );
  };

  const shareLocation = async (method: "whatsapp" | "sms" | "copy") => {
    if (!coords) {
      const msg = "Não foi possível obter sua localização. Verifique a permissão de localização.";
      if (Platform.OS === "web") window.alert(msg);
      else Alert.alert("Atenção", msg);
      return;
    }
    const text = `🚨 EMERGÊNCIA - Minha localização agora:\nhttps://www.google.com/maps?q=${coords.latitude},${coords.longitude}\n(Compartilhado via app Turismo que se Sente)`;
    if (method === "whatsapp") {
      Linking.openURL(`whatsapp://send?text=${encodeURIComponent(text)}`).catch(() =>
        Linking.openURL(`https://wa.me/?text=${encodeURIComponent(text)}`),
      );
    } else if (method === "sms") {
      const sep = Platform.OS === "ios" ? "&" : "?";
      Linking.openURL(`sms:${sep}body=${encodeURIComponent(text)}`);
    } else {
      await Clipboard.setStringAsync(text);
      if (Platform.OS === "web") window.alert("Localização copiada para área de transferência!");
      else Alert.alert("Copiado", "Localização copiada. Cole onde quiser compartilhar.");
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Voltar" testID="back-button">
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </TouchableOpacity>
        <Text accessibilityRole="header" style={styles.title}>Emergência</Text>
        <View style={styles.iconBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <Ionicons name="warning" size={36} color={colors.error} />
          </View>
          <Text accessibilityRole="header" style={styles.heroTitle}>Você está em segurança?</Text>
          <Text style={styles.heroSubtitle}>
            Toque para ligar diretamente para os serviços de emergência ou compartilhar sua localização.
          </Text>
        </View>

        <Text accessibilityRole="header" style={styles.sectionTitle}>Serviços de emergência</Text>
        {SERVICES.map((s) => (
          <TouchableOpacity
            key={s.number}
            style={styles.service}
            onPress={() => call(s)}
            accessibilityLabel={`Ligar para ${s.name} no número ${s.number}`}
            testID={`call-${s.number}`}
          >
            <View style={[styles.serviceIcon, { backgroundColor: s.color + "30" }]}>
              <Ionicons name={s.icon as any} size={24} color={s.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.serviceName}>{s.name}</Text>
              <Text style={styles.serviceDesc}>{s.description}</Text>
            </View>
            <View style={styles.serviceCall}>
              <Ionicons name="call" size={18} color="#fff" />
              <Text style={styles.serviceNumber}>{s.number}</Text>
            </View>
          </TouchableOpacity>
        ))}

        <Text accessibilityRole="header" style={[styles.sectionTitle, { marginTop: spacing.lg }]}>Compartilhar localização</Text>
        <View style={styles.coordsBox}>
          <MaterialCommunityIcons name="map-marker-radius" size={18} color={colors.brand} />
          <Text style={styles.coordsText}>
            {coords ? `${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}` : "Aguardando localização..."}
          </Text>
        </View>
        <View style={styles.shareRow}>
          <TouchableOpacity
            style={[styles.shareBtn, { backgroundColor: "#25D366" }]}
            onPress={() => shareLocation("whatsapp")}
            accessibilityRole="button"
            accessibilityLabel="Compartilhar minha localização por WhatsApp"
            testID="share-whatsapp"
          >
            <Ionicons name="logo-whatsapp" size={22} color="#fff" />
            <Text style={styles.shareText}>WhatsApp</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.shareBtn, { backgroundColor: "#3B82F6" }]}
            onPress={() => shareLocation("sms")}
            accessibilityRole="button"
            accessibilityLabel="Compartilhar minha localização por SMS"
            testID="share-sms"
          >
            <Ionicons name="chatbubble" size={22} color="#fff" />
            <Text style={styles.shareText}>SMS</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.shareBtn, { backgroundColor: colors.surfaceElevated }]}
            onPress={() => shareLocation("copy")}
            accessibilityRole="button"
            accessibilityLabel="Copiar minha localização"
            testID="share-copy"
          >
            <Ionicons name="copy-outline" size={22} color="#fff" />
            <Text style={styles.shareText}>Copiar</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.tipBox}>
          <Ionicons name="information-circle" size={20} color={colors.brandLight} />
          <Text style={styles.tipText}>
            Em caso de emergência médica, ligue para 192 imediatamente. Para acidentes graves, 193 (Bombeiros).
          </Text>
        </View>
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
  content: { padding: spacing.md, paddingBottom: spacing.lg, gap: spacing.sm },
  hero: { alignItems: "center", paddingVertical: spacing.md },
  heroIcon: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: "rgba(239,68,68,0.15)",
    borderWidth: 2,
    borderColor: colors.error,
    alignItems: "center", justifyContent: "center",
  },
  heroTitle: { color: colors.text, fontSize: 22, fontWeight: "800", marginTop: spacing.sm },
  heroSubtitle: { color: colors.textSecondary, fontSize: 14, textAlign: "center", lineHeight: 20, marginTop: 6, paddingHorizontal: spacing.md },
  sectionTitle: { color: colors.text, fontSize: fontSizes.h3, fontWeight: "700", marginTop: spacing.sm, marginBottom: spacing.sm },
  service: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    padding: spacing.md,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  serviceIcon: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  serviceName: { color: colors.text, fontWeight: "800", fontSize: fontSizes.body },
  serviceDesc: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  serviceCall: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: colors.error,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: radii.pill, gap: 6,
  },
  serviceNumber: { color: "#fff", fontWeight: "800", fontVariant: ["tabular-nums"] },
  coordsBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    padding: spacing.md,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  coordsText: { color: colors.text, fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace", fontSize: 13 },
  shareRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm },
  shareBtn: {
    flex: 1,
    flexDirection: "column",
    alignItems: "center",
    paddingVertical: spacing.md,
    borderRadius: radii.card,
    gap: 4,
  },
  shareText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  tipBox: {
    flexDirection: "row",
    backgroundColor: colors.badgeBg,
    borderRadius: radii.card,
    padding: spacing.md,
    gap: spacing.sm,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.brand,
  },
  tipText: { color: colors.textSecondary, fontSize: 13, flex: 1, lineHeight: 18 },
});
