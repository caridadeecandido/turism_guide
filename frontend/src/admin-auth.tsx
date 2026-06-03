import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import { router } from "expo-router";

const BASE = process.env.EXPO_PUBLIC_BACKEND_URL;
const KEY = "tqss_admin_token";

async function storeGet(): Promise<string | null> {
  if (Platform.OS === "web") return localStorage.getItem(KEY);
  return await SecureStore.getItemAsync(KEY);
}
async function storeSet(token: string) {
  if (Platform.OS === "web") return localStorage.setItem(KEY, token);
  await SecureStore.setItemAsync(KEY, token);
}
async function storeClear() {
  if (Platform.OS === "web") return localStorage.removeItem(KEY);
  await SecureStore.deleteItemAsync(KEY);
}

export type AdminUser = { id: string; email: string; name: string };

type Ctx = {
  admin: AdminUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  signOut: () => Promise<void>;
  /** Returns Authorization header to attach to admin-protected requests. */
  authHeader: () => Promise<Record<string, string>>;
};

const AdminCtx = createContext<Ctx | null>(null);

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  const bootstrap = useCallback(async () => {
    const token = await storeGet();
    if (!token) {
      setAdmin(null);
      setLoading(false);
      return;
    }
    try {
      const r = await fetch(`${BASE}/api/admin/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) throw new Error(`${r.status}`);
      const me = await r.json();
      setAdmin({ id: me.id, email: me.email, name: me.name || "Administrador" });
    } catch {
      await storeClear();
      setAdmin(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const r = await fetch(`${BASE}/api/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({ detail: "Erro" }));
        return { ok: false, error: err.detail || "E-mail ou senha incorretos" };
      }
      const data = await r.json();
      await storeSet(data.access_token);
      setAdmin(data.admin);
      return { ok: true };
    } catch (e: any) {
      return { ok: false, error: e.message || "Falha de conexão" };
    }
  }, []);

  const signOut = useCallback(async () => {
    await storeClear();
    setAdmin(null);
    router.replace("/admin/login");
  }, []);

  const authHeader = useCallback(async (): Promise<Record<string, string>> => {
    const token = await storeGet();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, []);

  return (
    <AdminCtx.Provider value={{ admin, loading, signIn, signOut, authHeader }}>
      {children}
    </AdminCtx.Provider>
  );
}

export function useAdminAuth(): Ctx {
  const v = useContext(AdminCtx);
  if (!v) throw new Error("useAdminAuth must be used within AdminAuthProvider");
  return v;
}
