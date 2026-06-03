import { View, Text, Image, StyleSheet, TouchableOpacity } from "react-native";
import { useSiteConfig } from "@/src/site-config";
import { colors, fontSizes, spacing } from "@/src/theme";
import { useA11y } from "@/src/accessibility";

/** Compact branded seal bar (used in screen headers). */
export function SealHeader({ onPress }: { onPress?: () => void }) {
  const { config } = useSiteConfig();
  const { speak } = useA11y();

  return (
    <TouchableOpacity
      style={styles.bar}
      onPress={onPress}
      activeOpacity={0.85}
      onFocus={() => speak(config.seal_alt)}
      accessibilityLabel={config.seal_alt}
      testID="seal-header"
    >
      <Image source={{ uri: config.seal_image_url }} style={styles.img} accessibilityLabel={config.seal_alt} resizeMode="contain" />
      <View style={{ flex: 1 }}>
        <Text style={styles.title} numberOfLines={1}>{config.header_banner_title}</Text>
        <Text style={styles.subtitle} numberOfLines={1}>{config.header_banner_subtitle}</Text>
      </View>
    </TouchableOpacity>
  );
}

export function SealFooter() {
  const { config } = useSiteConfig();
  const { speak } = useA11y();

  return (
    <View style={styles.footer} accessibilityLabel="Rodapé com selo de certificação">
      <Image
        source={{ uri: config.seal_image_url }}
        style={styles.footerImg}
        accessibilityLabel={config.seal_alt}
        resizeMode="contain"
      />
      <Text
        style={styles.footerText}
        onPress={() => speak(config.seal_alt)}
        accessibilityLabel={config.seal_alt}
        testID="seal-footer-text"
      >
        {config.footer_text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.brand,
  },
  img: { width: 48, height: 48 },
  title: { color: colors.text, fontSize: fontSizes.body, fontWeight: "800" },
  subtitle: { color: colors.brandLight, fontSize: 12, fontWeight: "600", marginTop: 2 },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  footerImg: { width: 32, height: 32 },
  footerText: { color: colors.textSecondary, fontSize: 12, textAlign: "center", flex: 1 },
});
