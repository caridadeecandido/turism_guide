import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { resolveAssetUrl } from "@/src/asset-url";

const BASE = process.env.EXPO_PUBLIC_BACKEND_URL;

// Official brand images are served by the backend from /static/brand.
// Stored as host-agnostic relative paths; resolved for display via resolveAssetUrl.
const LOGO_URL = "/static/brand/logo.jpeg";
const SEAL_URL = "/static/brand/selo.jpg";

export type SiteConfig = {
  id?: string;
  // Branding
  app_name: string;
  app_logo_url: string;
  app_icon_url: string;
  hero_image_url: string;
  seal_image_url: string;
  seal_alt: string;
  // Banners
  header_banner_title: string;
  header_banner_subtitle: string;
  footer_text: string;
  // Welcome
  welcome_pt: string;
  welcome_en: string;
  welcome_es: string;
  welcome_sub_pt: string;
  welcome_sub_en: string;
  welcome_sub_es: string;
  // About
  about_pt: string;
  about_en: string;
  about_es: string;
  mission_pt: string;
  mission_en: string;
  mission_es: string;
  vision_pt: string;
  vision_en: string;
  vision_es: string;
  // Contact
  contact_email: string;
  contact_phone: string;
  contact_whatsapp: string;
  contact_address: string;
  instagram: string;
  facebook: string;
  youtube: string;
  tiktok: string;
  website: string;
  // Promoters
  promoter_logos: string[];
  promoter_names: string[];
  // Emergency
  emergency_police: string;
  emergency_ambulance: string;
  emergency_fire: string;
  emergency_tourist: string;
  // Visibility
  show_guides_tab: boolean;
  show_marketplace_tab: boolean;
  show_about_tab: boolean;
};

const DEFAULTS: SiteConfig = {
  app_name: "Turismo que se Sente",
  app_logo_url: LOGO_URL,
  app_icon_url: LOGO_URL,
  hero_image_url: "https://images.unsplash.com/photo-1564769662533-4f00a87b4056?w=1200&q=80",
  seal_image_url: SEAL_URL,
  seal_alt: "Selo oficial Turismo que se Sente — Categoria Ouro",
  header_banner_title: "Turismo que se Sente",
  header_banner_subtitle: "Natal/RN acessível para todos",
  footer_text: "Projeto SENAC RN · Turismo que se Sente © 2026",
  welcome_pt: "Bem-vindo(a) a Natal!",
  welcome_en: "Welcome to Natal!",
  welcome_es: "¡Bienvenido(a) a Natal!",
  welcome_sub_pt: "Explore a cidade com autonomia e inclusão.",
  welcome_sub_en: "Explore the city with autonomy and inclusion.",
  welcome_sub_es: "Explora la ciudad con autonomía e inclusión.",
  about_pt: "",
  about_en: "",
  about_es: "",
  mission_pt: "",
  mission_en: "",
  mission_es: "",
  vision_pt: "",
  vision_en: "",
  vision_es: "",
  contact_email: "",
  contact_phone: "",
  contact_whatsapp: "",
  contact_address: "",
  instagram: "",
  facebook: "",
  youtube: "",
  tiktok: "",
  website: "",
  promoter_logos: [],
  promoter_names: [],
  emergency_police: "190",
  emergency_ambulance: "192",
  emergency_fire: "193",
  emergency_tourist: "(84) 3232-2000",
  show_guides_tab: true,
  show_marketplace_tab: true,
  show_about_tab: true,
};

// Image fields that may be stored as relative paths and must be resolved for display.
const IMAGE_FIELDS = ["app_logo_url", "app_icon_url", "seal_image_url", "hero_image_url"] as const;

// Resolve relative brand/image paths (e.g. "/static/brand/logo.jpeg") to absolute
// URLs for display, leaving the raw config untouched.
function resolveConfig(cfg: SiteConfig): SiteConfig {
  const out = { ...cfg };
  for (const field of IMAGE_FIELDS) out[field] = resolveAssetUrl(out[field]);
  return out;
}

type Ctx = {
  // Resolved config (absolute image URLs) — use this to DISPLAY images.
  config: SiteConfig;
  // Raw config (relative paths as returned by the API) — use this for ADMIN editing
  // so saved values stay host-agnostic.
  rawConfig: SiteConfig;
  refresh: () => Promise<void>;
};

const SiteCtx = createContext<Ctx>({
  config: resolveConfig(DEFAULTS),
  rawConfig: DEFAULTS,
  refresh: async () => {},
});

export function SiteConfigProvider({ children }: { children: React.ReactNode }) {
  const [rawConfig, setRawConfig] = useState<SiteConfig>(DEFAULTS);

  const refresh = useCallback(async () => {
    try {
      const r = await fetch(`${BASE}/api/site-config`);
      if (!r.ok) return;
      const data = await r.json();
      setRawConfig({ ...DEFAULTS, ...data });
    } catch {}
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const config = useMemo(() => resolveConfig(rawConfig), [rawConfig]);

  return <SiteCtx.Provider value={{ config, rawConfig, refresh }}>{children}</SiteCtx.Provider>;
}

export function useSiteConfig() {
  return useContext(SiteCtx);
}
