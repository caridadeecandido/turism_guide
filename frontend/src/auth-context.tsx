import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { Platform } from "react-native";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { router } from "expo-router";

import { tokenStorage, langStorage } from "@/src/auth-storage";

const BASE = process.env.EXPO_PUBLIC_BACKEND_URL;

export type AuthUser = {
  user_id: string;
  email: string;
  name: string;
  picture: string;
  favorites: string[];
  language: "pt" | "en" | "es";
};

type AuthCtx = {
  user: AuthUser | null;
  loading: boolean;
  language: "pt" | "en" | "es";
  setLanguage: (l: "pt" | "en" | "es") => Promise<void>;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
  toggleFavorite: (spotId: string) => Promise<void>;
  isFavorite: (spotId: string) => boolean;
};

const Ctx = createContext<AuthCtx | null>(null);

async function apiAuth<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}/api${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init?.headers || {}),
    },
  });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json() as Promise<T>;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [language, setLanguageState] = useState<"pt" | "en" | "es">("pt");

  const refresh = useCallback(async () => {
    const token = await tokenStorage.get();
    if (!token) {
      setUser(null);
      return;
    }
    try {
      const me = await apiAuth<AuthUser>("/auth/me", token);
      setUser(me);
      if (me.language) {
        setLanguageState(me.language);
        await langStorage.set(me.language);
      }
    } catch {
      await tokenStorage.clear();
      setUser(null);
    }
  }, []);

  const processSessionId = useCallback(async (sessionId: string) => {
    try {
      const res = await fetch(`${BASE}/api/auth/session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_token: sessionId }),
      });
      if (!res.ok) throw new Error("session creation failed");
      const data = await res.json();
      await tokenStorage.set(data.session_token);
      setUser(data.user);
    } catch (e) {
      console.warn("session error", e);
    }
  }, []);

  // Bootstrap: check URL on web, then check stored token
  useEffect(() => {
    (async () => {
      try {
        const lang = await langStorage.get();
        setLanguageState(lang);

        if (Platform.OS === "web" && typeof window !== "undefined") {
          const hashMatch = window.location.hash.match(/session_id=([^&]+)/);
          const queryMatch = window.location.search.match(/[?&]session_id=([^&]+)/);
          const sessionId = hashMatch?.[1] || queryMatch?.[1];
          if (sessionId) {
            await processSessionId(decodeURIComponent(sessionId));
            window.history.replaceState(null, "", window.location.pathname);
            setLoading(false);
            return;
          }
        } else {
          // Mobile cold start
          const initial = await Linking.getInitialURL();
          if (initial) {
            const m = initial.match(/[#?&]session_id=([^&]+)/);
            if (m) {
              await processSessionId(decodeURIComponent(m[1]));
              setLoading(false);
              return;
            }
          }
        }

        await refresh();
      } finally {
        setLoading(false);
      }
    })();

    if (Platform.OS !== "web") {
      const sub = Linking.addEventListener("url", async (e) => {
        const m = e.url.match(/[#?&]session_id=([^&]+)/);
        if (m) await processSessionId(decodeURIComponent(m[1]));
      });
      return () => sub.remove();
    }
  }, [processSessionId, refresh]);

  const signIn = useCallback(async () => {
    const redirectUrl =
      Platform.OS === "web"
        ? `${window.location.origin}/`
        : Linking.createURL("auth");
    const authUrl = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;

    if (Platform.OS === "web") {
      window.location.href = authUrl;
      return;
    }
    try {
      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl);
      if (result.type === "success" && result.url) {
        const m = result.url.match(/[#?&]session_id=([^&]+)/);
        if (m) await processSessionId(decodeURIComponent(m[1]));
      }
    } catch (e) {
      console.warn("signIn failed", e);
    }
  }, [processSessionId]);

  const signOut = useCallback(async () => {
    const token = await tokenStorage.get();
    if (token) {
      try {
        await apiAuth("/auth/logout", token, { method: "POST" });
      } catch {}
    }
    await tokenStorage.clear();
    setUser(null);
    router.replace("/");
  }, []);

  const setLanguage = useCallback(async (l: "pt" | "en" | "es") => {
    setLanguageState(l);
    await langStorage.set(l);
    const token = await tokenStorage.get();
    if (token) {
      try {
        await apiAuth("/me/language", token, {
          method: "PATCH",
          body: JSON.stringify({ language: l }),
        });
      } catch {}
    }
  }, []);

  const toggleFavorite = useCallback(async (spotId: string) => {
    const token = await tokenStorage.get();
    if (!token) {
      router.push("/login");
      return;
    }
    const isFav = user?.favorites?.includes(spotId);
    try {
      await apiAuth(`/me/favorites/${spotId}`, token, {
        method: isFav ? "DELETE" : "POST",
      });
      setUser((u) => {
        if (!u) return u;
        const favs = isFav
          ? u.favorites.filter((x) => x !== spotId)
          : [...u.favorites, spotId];
        return { ...u, favorites: favs };
      });
    } catch (e) {
      console.warn("toggleFavorite failed", e);
    }
  }, [user]);

  const isFavorite = useCallback(
    (spotId: string) => !!user?.favorites?.includes(spotId),
    [user],
  );

  return (
    <Ctx.Provider
      value={{ user, loading, language, setLanguage, signIn, signOut, refresh, toggleFavorite, isFavorite }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useAuth(): AuthCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used within AuthProvider");
  return v;
}
