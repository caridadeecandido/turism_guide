import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Platform, AccessibilityInfo } from "react-native";
import * as Speech from "expo-speech";
import * as SecureStore from "expo-secure-store";
import { useAuth } from "@/src/auth-context";
import { ttsLocale } from "@/src/i18n";

const KEY = "tqss_a11y_prefs";

export type A11yPrefs = {
  // Audiodescrição ao tocar: lê o conteúdo em voz alta ao tocar (controlada pelo toggle).
  speakOnTouch: boolean;
  panelOpen: boolean;
};

const DEFAULTS: A11yPrefs = {
  speakOnTouch: false,
  panelOpen: false,
};

type Ctx = {
  prefs: A11yPrefs;
  set: (k: keyof A11yPrefs, v: boolean) => Promise<void>;
  /**
   * Fala um texto via TTS, mas SÓ se "Audiodescrição ao tocar" estiver ativa E
   * nenhum leitor de tela do sistema estiver ligado (evita leitura dupla).
   * Use sempre com texto JÁ no idioma atual.
   */
  speak: (text: string, locale?: string) => void;
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
    return {
      speakOnTouch: parsed.speakOnTouch ?? DEFAULTS.speakOnTouch,
      panelOpen: false, // nunca restaura aberto entre sessões
    };
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
  // Espelho síncrono para ler preferências sem closures defasados nem efeitos no updater.
  const prefsRef = useRef<A11yPrefs>(prefs);
  // Se um leitor de tela (VoiceOver/TalkBack) estiver ativo, não falamos (evita duplicar).
  const screenReaderRef = useRef<boolean>(false);

  useEffect(() => {
    prefsRef.current = prefs;
  }, [prefs]);

  useEffect(() => {
    loadPrefs().then((p) => {
      prefsRef.current = p;
      setPrefs(p);
    });
  }, []);

  useEffect(() => {
    // FAIL-OPEN no web: react-native-web faz isScreenReaderEnabled() resolver SEMPRE
    // true, o que suprimiria toda a fala. No web não há detecção confiável de leitor
    // de tela, então não detectamos — respeitamos só o toggle (screenReaderRef = false).
    // No nativo, detectamos de verdade para não duplicar a leitura.
    if (Platform.OS === "web") return;
    let mounted = true;
    AccessibilityInfo.isScreenReaderEnabled()
      .then((on) => {
        if (mounted) screenReaderRef.current = on;
      })
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener("screenReaderChanged", (on: boolean) => {
      screenReaderRef.current = on;
    });
    return () => {
      mounted = false;
      // RN >=0.65: subscription tem .remove(); fallback defensivo.
      (sub as any)?.remove?.();
    };
  }, []);

  const set = useCallback(async (k: keyof A11yPrefs, v: boolean) => {
    const next = { ...prefsRef.current, [k]: v };
    prefsRef.current = next;
    setPrefs(next);
    await savePrefs(next);
  }, []);

  const speak = useCallback((text: string, locale: string = "pt-BR") => {
    if (!prefsRef.current.speakOnTouch || !text) return;
    if (screenReaderRef.current) return; // leitor de tela já narra — não duplicar
    Speech.stop();
    Speech.speak(text, { language: locale });
  }, []);

  return (
    <A11yCtx.Provider value={{ prefs, set, speak }}>{children}</A11yCtx.Provider>
  );
}

export function useA11y(): Ctx {
  const v = useContext(A11yCtx);
  if (!v) throw new Error("useA11y must be used within AccessibilityProvider");
  return v;
}

/**
 * Hook compartilhado para "audiodescrição". Retorna uma função para chamar no
 * onLongPress (SEGURAR) com o texto JÁ localizado; ela fala na voz do idioma atual
 * (ttsLocale). O onPress simples deve só navegar. No-op quando o toggle está desligado
 * ou há leitor de tela ativo.
 */
export function useSpeakOnPress() {
  const { speak } = useA11y();
  const { language } = useAuth();
  return useCallback((text: string) => speak(text, ttsLocale(language)), [speak, language]);
}
