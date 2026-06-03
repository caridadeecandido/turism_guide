import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import * as Speech from "expo-speech";
import * as Haptics from "expo-haptics";
import * as SecureStore from "expo-secure-store";

const KEY = "tqss_a11y_prefs";

export type A11yPrefs = {
  audioOnFocus: boolean;
  beepFeedback: boolean;
  haptic: boolean;
  largeButtons: boolean;
  panelOpen: boolean;
};

const DEFAULTS: A11yPrefs = {
  audioOnFocus: false,
  beepFeedback: false,
  haptic: true,
  largeButtons: false,
  panelOpen: false,
};

type Ctx = {
  prefs: A11yPrefs;
  set: (k: keyof A11yPrefs, v: boolean) => Promise<void>;
  /** Read a label aloud (uses prefs.audioOnFocus check internally). */
  speak: (text: string, locale?: string) => void;
  /** Play a short feedback beep. Honors prefs.beepFeedback. */
  beep: () => void;
  /** Vibrate. Honors prefs.haptic. */
  vibrate: (style?: "light" | "medium" | "heavy") => void;
};

const A11yCtx = createContext<Ctx | null>(null);

async function loadPrefs(): Promise<A11yPrefs> {
  try {
    const raw = Platform.OS === "web" ? localStorage.getItem(KEY) : await SecureStore.getItemAsync(KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return DEFAULTS;
  }
}

async function savePrefs(p: A11yPrefs) {
  const s = JSON.stringify(p);
  if (Platform.OS === "web") localStorage.setItem(KEY, s);
  else await SecureStore.setItemAsync(KEY, s);
}

export function AccessibilityProvider({ children }: { children: React.ReactNode }) {
  const [prefs, setPrefs] = useState<A11yPrefs>(DEFAULTS);
  const audioCtxRef = useRef<any>(null);

  useEffect(() => {
    loadPrefs().then(setPrefs);
  }, []);

  const set = useCallback(async (k: keyof A11yPrefs, v: boolean) => {
    setPrefs((prev) => {
      const next = { ...prev, [k]: v };
      savePrefs(next);
      return next;
    });
  }, []);

  const speak = useCallback((text: string, locale: string = "pt-BR") => {
    if (!prefs.audioOnFocus || !text) return;
    Speech.stop();
    Speech.speak(text, { language: locale, rate: 1.0 });
  }, [prefs.audioOnFocus]);

  const beep = useCallback(() => {
    if (!prefs.beepFeedback) return;
    if (Platform.OS === "web" && typeof window !== "undefined") {
      try {
        if (!audioCtxRef.current) {
          const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
          if (AudioCtx) audioCtxRef.current = new AudioCtx();
        }
        const ctx = audioCtxRef.current;
        if (!ctx) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.value = 880;
        osc.type = "sine";
        gain.gain.setValueAtTime(0.001, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.2);
      } catch {}
    } else {
      // Native: emit a haptic-ish "click" using haptics if enabled, plus a short speak("")
      Speech.stop();
      Speech.speak(" ", { language: "pt-BR", rate: 2.0 });
    }
  }, [prefs.beepFeedback]);

  const vibrate = useCallback((style: "light" | "medium" | "heavy" = "light") => {
    if (!prefs.haptic) return;
    if (Platform.OS === "web") {
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate(style === "heavy" ? 60 : style === "medium" ? 30 : 12);
      }
      return;
    }
    const s = style === "heavy" ? Haptics.ImpactFeedbackStyle.Heavy
      : style === "medium" ? Haptics.ImpactFeedbackStyle.Medium
      : Haptics.ImpactFeedbackStyle.Light;
    Haptics.impactAsync(s).catch(() => {});
  }, [prefs.haptic]);

  return (
    <A11yCtx.Provider value={{ prefs, set, speak, beep, vibrate }}>
      {children}
    </A11yCtx.Provider>
  );
}

export function useA11y(): Ctx {
  const v = useContext(A11yCtx);
  if (!v) throw new Error("useA11y must be used within AccessibilityProvider");
  return v;
}
