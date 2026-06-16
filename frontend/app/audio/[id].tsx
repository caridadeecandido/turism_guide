import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import * as Speech from "expo-speech";
import * as Haptics from "expo-haptics";

import { colors, fontSizes, radii, spacing } from "@/src/theme";
import { api, TouristSpot } from "@/src/api";
import { resolveAssetUrl } from "@/src/asset-url";
import { useAuth } from "@/src/auth-context";
import { ttsLocale, t } from "@/src/i18n";
import { SpeakableText } from "@/src/components/SpeakableText";
import { useSpeakOnPress, NO_SELECT_WEB } from "@/src/accessibility";

export default function AudioExperience() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { language } = useAuth();
  const speakOnPress = useSpeakOnPress();
  const [spot, setSpot] = useState<TouristSpot | null>(null);
  const [audioText, setAudioText] = useState<string>("");
  const [spotName, setSpotName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [estimated, setEstimated] = useState(0);
  const [rate, setRate] = useState(1.0);
  const [showText, setShowText] = useState(false);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const data = await api.getSpot(id);
        setSpot(data);
        setSpotName(data.name);
        setAudioText(data.audio_description);
        const seconds = Math.max(15, Math.round(data.audio_description.length / 14));
        setEstimated(seconds);
      } finally {
        setLoading(false);
      }
    })();
    return () => {
      Speech.stop();
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [id]);

  // Re-translate when language changes
  useEffect(() => {
    if (!id || !spot) return;
    Speech.stop();
    setPlaying(false);
    setPaused(false);
    setProgress(0);
    setElapsed(0);
    if (language === "pt") {
      setAudioText(spot.audio_description);
      setSpotName(spot.name);
      return;
    }
    (async () => {
      try {
        const r = await api.translate(spot.id, language);
        setAudioText(r.audio_description);
        setSpotName(r.name);
        const seconds = Math.max(15, Math.round(r.audio_description.length / 14));
        setEstimated(seconds);
      } catch (e) {
        console.warn("translate failed", e);
      }
    })();
  }, [language, id, spot]);

  const startTick = (durationSec: number) => {
    if (tickRef.current) clearInterval(tickRef.current);
    const startElapsed = elapsed;
    const startTime = Date.now();
    tickRef.current = setInterval(() => {
      const newElapsed = startElapsed + (Date.now() - startTime) / 1000;
      if (newElapsed >= durationSec) {
        setElapsed(durationSec);
        setProgress(1);
        if (tickRef.current) clearInterval(tickRef.current);
      } else {
        setElapsed(newElapsed);
        setProgress(newElapsed / durationSec);
      }
    }, 200) as any;
  };

  const stopTick = () => {
    if (tickRef.current) clearInterval(tickRef.current);
  };

  const play = async () => {
    if (!spot) return;
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    Speech.stop();
    setElapsed(0);
    setProgress(0);
    setPlaying(true);
    setPaused(false);
    const textToSpeak = audioText || spot.audio_description;
    const locale = ttsLocale(language);
    const seconds = Math.max(15, Math.round(textToSpeak.length / (14 * rate)));
    setEstimated(seconds);
    startTick(seconds);
    Speech.speak(textToSpeak, {
      language: locale,
      pitch: 1.0,
      rate,
      onDone: () => {
        setPlaying(false);
        setPaused(false);
        setProgress(1);
        setElapsed(seconds);
        stopTick();
      },
      onStopped: () => {
        stopTick();
      },
      onError: () => {
        setPlaying(false);
        stopTick();
      },
    });
  };

  const pause = () => {
    Speech.stop();
    setPlaying(false);
    setPaused(true);
    stopTick();
  };

  const stop = () => {
    Speech.stop();
    setPlaying(false);
    setPaused(false);
    setProgress(0);
    setElapsed(0);
    stopTick();
  };

  const skipBack = () => {
    // Simulate skip back 10s by restarting (TTS doesn't support seek)
    stop();
  };

  const skipForward = () => {
    // TTS can't seek; stop and indicate via progress
    Speech.stop();
    setPlaying(false);
    setPaused(false);
    stopTick();
    setProgress(1);
    setElapsed(estimated);
  };

  const changeRate = () => {
    const next = rate === 1.0 ? 1.25 : rate === 1.25 ? 1.5 : rate === 1.5 ? 0.75 : 1.0;
    setRate(next);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.brand} size="large" />
      </View>
    );
  }

  if (!spot) {
    return (
      <View style={styles.center}>
        <Text style={{ color: colors.text }}>Conteúdo não encontrado.</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => {
            Speech.stop();
            router.back();
          }}
          accessibilityLabel="Voltar"
          testID="back-button"
        >
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </TouchableOpacity>
        <SpeakableText accessibilityRole="header" style={styles.topTitle}>{t(language, "audio_title")}</SpeakableText>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => setShowText((v) => !v)}
          accessibilityRole="button"
          accessibilityLabel={showText ? "Mostrar imagem" : "Mostrar texto da audiodescrição"}
          testID="toggle-text-button"
        >
          <Ionicons name={showText ? "image-outline" : "document-text-outline"} size={22} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: spacing.lg }} showsVerticalScrollIndicator={false}>
        {/* Album-style image */}
        <View style={styles.albumWrap}>
          <Image
            source={{ uri: resolveAssetUrl(spot.image_url) }}
            style={styles.albumImage}
            accessibilityLabel={spot.image_alt || `Foto de ${spotName || spot.name}`}
          />
        </View>

        {/* Title */}
        <View style={styles.titleWrap}>
          <SpeakableText accessibilityRole="header" style={styles.title} numberOfLines={2}>
            {spotName || spot.name}
          </SpeakableText>
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
            <Text style={styles.location}>
              {spot.neighborhood}, Natal – RN
            </Text>
          </View>
          {language !== "pt" && (
            <View style={styles.langPill}>
              <Ionicons name="language" size={12} color={colors.brand} />
              <Text style={styles.langPillText}>{language === "en" ? "English" : "Español"}</Text>
            </View>
          )}
        </View>

        {/* Progress bar */}
        <View style={styles.progressWrap}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
          </View>
          <View style={styles.timeRow}>
            <Text style={styles.time}>{formatTime(elapsed)}</Text>
            <Text style={styles.time}>{formatTime(estimated)}</Text>
          </View>
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          <TouchableOpacity
            style={styles.rateBtn}
            onPress={changeRate}
            accessibilityLabel={`Velocidade ${rate}x`}
            testID="rate-button"
          >
            <Text style={styles.rateText}>{rate}x</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.smallBtn}
            onPress={skipBack}
            accessibilityLabel="Retroceder"
            testID="skip-back-button"
          >
            <Ionicons name="play-skip-back" size={28} color={colors.text} />
          </TouchableOpacity>

          {playing ? (
            <TouchableOpacity
              style={styles.playBtn}
              onPress={pause}
              accessibilityRole="button"
              accessibilityLabel="Pausar audiodescrição"
              testID="pause-button"
            >
              <Ionicons name="pause" size={40} color="#fff" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.playBtn}
              onPress={play}
              accessibilityRole="button"
              accessibilityLabel={`${paused ? "Reiniciar" : "Reproduzir"} audiodescrição de ${spotName || spot.name}`}
              testID="play-button"
            >
              <Ionicons name="play" size={40} color="#fff" style={{ marginLeft: 4 }} />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.smallBtn}
            onPress={skipForward}
            accessibilityLabel="Avançar"
            testID="skip-forward-button"
          >
            <Ionicons name="play-skip-forward" size={28} color={colors.text} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.smallBtn}
            onPress={stop}
            accessibilityLabel="Parar"
            testID="stop-button"
          >
            <Ionicons name="stop" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Transcript */}
        <View style={styles.transcript}>
          <View style={styles.transcriptHeader}>
            <Ionicons name="document-text" size={18} color={colors.brand} />
            <Text accessibilityRole="header" style={styles.transcriptTitle}>Audiodescrição</Text>
          </View>
          <SpeakableText style={styles.transcriptText}>{audioText || spot.audio_description}</SpeakableText>
        </View>

        {/* Footer info */}
        <TouchableOpacity
          style={[styles.moreInfo, NO_SELECT_WEB]}
          onPress={() => router.push(`/spot/${spot.id}`)}
          onLongPress={() => speakOnPress(spotName || spot.name)}
          accessibilityRole="button"
          accessibilityLabel={`Mais informações sobre ${spotName || spot.name}`}
          testID="more-info-button"
        >
          <Ionicons name="information-circle-outline" size={20} color={colors.brandLight} />
          <Text style={styles.moreInfoText}>Mais informações sobre este local</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.brandLight} />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  iconBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  topTitle: { color: colors.text, fontSize: fontSizes.body, fontWeight: "700" },
  albumWrap: {
    width: 280,
    height: 280,
    alignSelf: "center",
    borderRadius: 24,
    overflow: "hidden",
    marginTop: spacing.md,
    shadowColor: colors.brand,
    shadowOpacity: 0.6,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 12,
  },
  albumImage: { width: "100%", height: "100%" },
  titleWrap: { alignItems: "center", marginTop: spacing.lg, paddingHorizontal: spacing.md },
  title: { color: colors.text, fontSize: 24, fontWeight: "800", textAlign: "center" },
  locationRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6 },
  location: { color: colors.textSecondary, fontSize: fontSizes.small },
  langPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.badgeBg,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.pill,
    gap: 4,
    marginTop: 8,
  },
  langPillText: { color: colors.brand, fontSize: 11, fontWeight: "700" },
  progressWrap: { paddingHorizontal: spacing.lg, marginTop: spacing.lg },
  progressBar: {
    height: 6,
    backgroundColor: colors.surfaceElevated,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: { height: "100%", backgroundColor: colors.brand },
  timeRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
  time: { color: colors.textMuted, fontSize: 12, fontVariant: ["tabular-nums"] },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    marginTop: spacing.lg,
    gap: spacing.md,
  },
  rateBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  rateText: { color: colors.brandLight, fontWeight: "800", fontSize: 13 },
  smallBtn: { width: 56, height: 56, alignItems: "center", justifyContent: "center" },
  playBtn: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.brand,
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 8,
  },
  transcript: {
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginTop: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  transcriptHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: spacing.sm },
  transcriptTitle: { color: colors.text, fontSize: fontSizes.body, fontWeight: "700" },
  transcriptText: { color: colors.textSecondary, fontSize: fontSizes.body, lineHeight: 24 },
  moreInfo: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  moreInfoText: { color: colors.text, flex: 1, fontSize: fontSizes.body, fontWeight: "600" },
});
