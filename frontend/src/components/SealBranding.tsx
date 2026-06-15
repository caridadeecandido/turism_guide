import { View, Text, Image, StyleSheet, TouchableOpacity } from "react-native";
import { useSiteConfig } from "@/src/site-config";
import { colors, fontSizes, spacing } from "@/src/theme";
import { useA11y } from "@/src/accessibility";

// A imagem do selo (static/brand/selo.jpg) é uma medalha redonda sobre fundo branco.
// Como o app é tema escuro, exibimos o selo recortado em CÍRCULO (sobre fundos escuros),
// com zoom calculado para a medalha dourada preencher o círculo sem borda branca.
// Medições da imagem: medalha ~776px de diâmetro, centro (456, 780) numa imagem 900x1600;
// 6% de folga garante que a borda dourada cubra o círculo sem sobrar branco.
const SEAL_IMG_W = 1.2294; // largura da imagem ÷ diâmetro do círculo
const SEAL_IMG_H = 2.1856; // altura da imagem ÷ diâmetro do círculo
const SEAL_IMG_LEFT = -0.1229;
const SEAL_IMG_TOP = -0.5655;

/** Selo recortado em círculo — use sobre fundos ESCUROS para esconder o fundo branco da imagem. */
export function SealCircle({ size, style }: { size: number; style?: any }) {
  const { config } = useSiteConfig();
  return (
    <View
      style={[{ width: size, height: size, borderRadius: size / 2, overflow: "hidden" }, style]}
      accessibilityRole="image"
      accessibilityLabel={config.seal_alt}
    >
      <Image
        source={{ uri: config.seal_image_url }}
        resizeMode="cover"
        style={{
          position: "absolute",
          width: size * SEAL_IMG_W,
          height: size * SEAL_IMG_H,
          left: size * SEAL_IMG_LEFT,
          top: size * SEAL_IMG_TOP,
        }}
      />
    </View>
  );
}

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
      accessibilityRole="button"
      accessibilityLabel={config.seal_alt}
      testID="seal-header"
    >
      <SealCircle size={48} />
      <View style={{ flex: 1 }}>
        <Text accessibilityRole="header" style={styles.title} numberOfLines={1}>{config.header_banner_title}</Text>
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
      <SealCircle size={32} />
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
  footerText: { color: colors.textSecondary, fontSize: 12, textAlign: "center", flex: 1 },
});
