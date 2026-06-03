/** Static i18n strings. Spot content is translated via backend LLM endpoint. */
export type Lang = "pt" | "en" | "es";

const strings = {
  pt: {
    welcome: "Bem-vindo(a) a Natal!",
    welcome_sub: "Explore a cidade com autonomia e inclusão.",
    search_placeholder: "Para onde você quer ir?",
    quick_access: "Acessos rápidos",
    featured: "Destaques de Natal",
    all_spots: "Todos os pontos turísticos",
    see_all: "Ver todos",
    listen_audio: "Ouvir audiodescrição",
    accessibility_mode: "Modo acessível ativado",
    accessibility_mode_sub: "Navegação por voz e audiodescrição habilitadas.",
    about: "Sobre este local",
    accessibility_info: "Informações de acessibilidade",
    address: "Endereço",
    near_me: "Perto de mim",
    map: "Mapa",
    marketplace: "Parceiros",
    emergency: "Emergência",
    login: "Entrar com Google",
    logout: "Sair",
    favorites: "Favoritos",
    update_location: "Atualizar minha localização",
    distance_from_you: "A {d} de você",
    away: "{d} de distância",
  },
  en: {
    welcome: "Welcome to Natal!",
    welcome_sub: "Explore the city with autonomy and inclusion.",
    search_placeholder: "Where do you want to go?",
    quick_access: "Quick access",
    featured: "Featured in Natal",
    all_spots: "All tourist spots",
    see_all: "See all",
    listen_audio: "Listen to audio description",
    accessibility_mode: "Accessible mode enabled",
    accessibility_mode_sub: "Voice navigation and audio description enabled.",
    about: "About this place",
    accessibility_info: "Accessibility information",
    address: "Address",
    near_me: "Near me",
    map: "Map",
    marketplace: "Partners",
    emergency: "Emergency",
    login: "Sign in with Google",
    logout: "Sign out",
    favorites: "Favorites",
    update_location: "Update my location",
    distance_from_you: "{d} from you",
    away: "{d} away",
  },
  es: {
    welcome: "¡Bienvenido(a) a Natal!",
    welcome_sub: "Explora la ciudad con autonomía e inclusión.",
    search_placeholder: "¿A dónde quieres ir?",
    quick_access: "Accesos rápidos",
    featured: "Destacados de Natal",
    all_spots: "Todos los puntos turísticos",
    see_all: "Ver todos",
    listen_audio: "Escuchar audiodescripción",
    accessibility_mode: "Modo accesible activado",
    accessibility_mode_sub: "Navegación por voz y audiodescripción habilitadas.",
    about: "Sobre este lugar",
    accessibility_info: "Información de accesibilidad",
    address: "Dirección",
    near_me: "Cerca de mí",
    map: "Mapa",
    marketplace: "Aliados",
    emergency: "Emergencia",
    login: "Iniciar con Google",
    logout: "Cerrar sesión",
    favorites: "Favoritos",
    update_location: "Actualizar mi ubicación",
    distance_from_you: "A {d} de ti",
    away: "{d} de distancia",
  },
} as const;

export type StringKey = keyof typeof strings.pt;

export function t(lang: Lang, key: StringKey, vars?: Record<string, string | number>): string {
  let s: string = (strings[lang] && (strings[lang] as any)[key]) || strings.pt[key] || key;
  if (vars) {
    Object.entries(vars).forEach(([k, v]) => {
      s = s.replace(`{${k}}`, String(v));
    });
  }
  return s;
}

// TTS locale code per language
export function ttsLocale(lang: Lang): string {
  if (lang === "en") return "en-US";
  if (lang === "es") return "es-ES";
  return "pt-BR";
}
