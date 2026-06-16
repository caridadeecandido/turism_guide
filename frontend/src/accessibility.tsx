import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import * as Haptics from "expo-haptics";
import * as SecureStore from "expo-secure-store";

const KEY = "tqss_a11y_prefs";

// Apenas preferências REAIS, que produzem efeito no app. (O leitor de tela do SO
// já lê os accessibilityLabel, então não duplicamos isso em opções placebo.)
export type A11yPrefs = {
  haptic: boolean;
  panelOpen: boolean;
};

const DEFAULTS: A11yPrefs = {
  haptic: true,
  panelOpen: false,
};

type Ctx = {
  prefs: A11yPrefs;
  set: (k: keyof A11yPrefs, v: boolean) => Promise<void>;
  /** Vibra em interações reais (toques em cartões/botões). Respeita prefs.haptic. */
  vibrate: (style?: "light" | "medium" | "heavy") => void;
};

const A11yCtx = createContext<Ctx | null>(null);

async function loadPrefs(): Promise<A11yPrefs> {
  try {
    const raw =
      Platform.OS === "web"
        ? (typeof localStorage !== "undefined" ? localStorage.getItem(KEY) : null)
        : await SecureStore.getItemAsync(KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw);
    // panelOpen nunca é restaurado aberto entre sessões.
    return { haptic: parsed.haptic ?? DEFAULTS.haptic, panelOpen: false };
  } catch {
    return DEFAULTS;
  }
}

async function savePrefs(p: A11yPrefs) {
  try {
    const s = JSON.stringify(p);
    if (Platform.OS === "web") {
      if (typeof localStorage !== "undefined") localStorage.setItem(KEY, s);
    } else {
      await SecureStore.setItemAsync(KEY, s);
    }
  } catch {}
}

export function AccessibilityProvider({ children }: { children: React.ReactNode }) {
  const [prefs, setPrefs] = useState<A11yPrefs>(DEFAULTS);
  // Espelho síncrono para ler a preferência atual sem closures defasados nem
  // efeitos colaterais dentro do updater de estado.
  const prefsRef = useRef<A11yPrefs>(prefs);

  useEffect(() => {
    prefsRef.current = prefs;
  }, [prefs]);

  useEffect(() => {
    loadPrefs().then((p) => {
      prefsRef.current = p;
      setPrefs(p);
    });
  }, []);

  const set = useCallback(async (k: keyof A11yPrefs, v: boolean) => {
    const next = { ...prefsRef.current, [k]: v };
    prefsRef.current = next;
    setPrefs(next);
    await savePrefs(next);
  }, []);

  const vibrate = useCallback((style: "light" | "medium" | "heavy" = "light") => {
    if (!prefsRef.current.haptic) return;
    if (Platform.OS === "web") {
      const nav: any = typeof navigator !== "undefined" ? navigator : null;
      if (nav?.vibrate) nav.vibrate(style === "heavy" ? 60 : style === "medium" ? 30 : 12);
      return;
    }
    const s =
      style === "heavy"
        ? Haptics.ImpactFeedbackStyle.Heavy
        : style === "medium"
          ? Haptics.ImpactFeedbackStyle.Medium
          : Haptics.ImpactFeedbackStyle.Light;
    Haptics.impactAsync(s).catch(() => {});
  }, []);

  return <A11yCtx.Provider value={{ prefs, set, vibrate }}>{children}</A11yCtx.Provider>;
}

export function useA11y(): Ctx {
  const v = useContext(A11yCtx);
  if (!v) throw new Error("useA11y must be used within AccessibilityProvider");
  return v;
}
