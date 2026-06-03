import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

const KEY = "tqss_session_token";

export const tokenStorage = {
  async get(): Promise<string | null> {
    if (Platform.OS === "web") {
      return localStorage.getItem(KEY);
    }
    return await SecureStore.getItemAsync(KEY);
  },
  async set(token: string): Promise<void> {
    if (Platform.OS === "web") {
      localStorage.setItem(KEY, token);
      return;
    }
    await SecureStore.setItemAsync(KEY, token);
  },
  async clear(): Promise<void> {
    if (Platform.OS === "web") {
      localStorage.removeItem(KEY);
      return;
    }
    await SecureStore.deleteItemAsync(KEY);
  },
};

const LANG_KEY = "tqss_language";

export const langStorage = {
  async get(): Promise<"pt" | "en" | "es"> {
    let v: string | null = null;
    if (Platform.OS === "web") v = localStorage.getItem(LANG_KEY);
    else v = await SecureStore.getItemAsync(LANG_KEY);
    return v === "en" || v === "es" ? v : "pt";
  },
  async set(lang: "pt" | "en" | "es"): Promise<void> {
    if (Platform.OS === "web") {
      localStorage.setItem(LANG_KEY, lang);
      return;
    }
    await SecureStore.setItemAsync(LANG_KEY, lang);
  },
};
