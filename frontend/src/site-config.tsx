import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

const BASE = process.env.EXPO_PUBLIC_BACKEND_URL;

export type SiteConfig = {
  seal_image_url: string;
  seal_alt: string;
  header_banner_title: string;
  header_banner_subtitle: string;
  footer_text: string;
  welcome_pt: string;
  welcome_en: string;
  welcome_es: string;
  welcome_sub_pt: string;
  welcome_sub_en: string;
  welcome_sub_es: string;
};

const DEFAULTS: SiteConfig = {
  seal_image_url:
    "https://customer-assets.emergentagent.com/job_tourism-audio-guide/artifacts/4y5mw8k0_85a45e10-cbc2-40bd-a704-38c569e7c65c.jpeg",
  seal_alt: "Selo Turismo que se Sente",
  header_banner_title: "Turismo que se Sente",
  header_banner_subtitle: "Natal/RN acessível para todos",
  footer_text: "Projeto SENAC RN · Turismo que se Sente © 2026",
  welcome_pt: "Bem-vindo(a) a Natal!",
  welcome_en: "Welcome to Natal!",
  welcome_es: "¡Bienvenido(a) a Natal!",
  welcome_sub_pt: "Explore a cidade com autonomia e inclusão.",
  welcome_sub_en: "Explore the city with autonomy and inclusion.",
  welcome_sub_es: "Explora la ciudad con autonomía e inclusión.",
};

type Ctx = {
  config: SiteConfig;
  refresh: () => Promise<void>;
};

const SiteCtx = createContext<Ctx>({ config: DEFAULTS, refresh: async () => {} });

export function SiteConfigProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<SiteConfig>(DEFAULTS);

  const refresh = useCallback(async () => {
    try {
      const r = await fetch(`${BASE}/api/site-config`);
      if (!r.ok) return;
      const data = await r.json();
      setConfig({ ...DEFAULTS, ...data });
    } catch {}
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return <SiteCtx.Provider value={{ config, refresh }}>{children}</SiteCtx.Provider>;
}

export function useSiteConfig() {
  return useContext(SiteCtx);
}
