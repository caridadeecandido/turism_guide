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
    // Títulos de tela / botões compartilhados
    guides_title: "Guias Certificados",
    guide_detail_title: "Guia Certificado",
    partners_title: "Parceiros Acessíveis",
    seal_title: "Selo Digital",
    audio_title: "Experiência de áudio",
    menu_title: "Menu",
    seal_about_btn: "Sobre o selo Categoria Ouro",
    // Guias
    guides_hero_title: "Guias com Selo Categoria Ouro",
    guides_hero_sub: "Profissionais capacitados no Curso Turismo que se Sente (120h) — especialistas em audiodescrição, Libras, atendimento a PCD e neurodivergentes.",
    guides_all_access: "Todas acessibilidades",
    guides_empty: "Nenhum guia encontrado com esses filtros.",
    // Parceiros
    partners_hero_title: "Hotéis · Restaurantes · Passeios",
    partners_hero_sub: "Estabelecimentos certificados pelo selo Turismo que se Sente.",
    partners_empty: "Nenhum parceiro encontrado.",
    certified: "Certificado",
    reserve: "Reservar",
    // Perto de mim
    near_active_location: "Localização ativa",
    near_empty: "Nenhum ponto encontrado nesta categoria.",
    activate_location: "Ativar minha localização",
    update_location_short: "Atualizar localização",
    // Emergência
    emergency_hero_title: "Você está em segurança?",
    emergency_hero_sub: "Toque para ligar diretamente para os serviços de emergência ou compartilhar sua localização.",
    emergency_services: "Serviços de emergência",
    emergency_share: "Compartilhar localização",
    // Selo
    seal_cert_subtitle: "Certificação de Acessibilidade",
    seal_intro: "O Selo Turismo que se Sente certifica estabelecimentos que oferecem experiências verdadeiramente acessíveis a pessoas com deficiência visual, com foco em mediação sensorial e atendimento inclusivo.",
    seal_verify_title: "Verificar selo de um parceiro",
    seal_verify_hint: "Digite o código do selo do estabelecimento ou escaneie o QR code na fachada / cardápio.",
    seal_verify_btn: "Verificar selo",
    seal_criteria_title: "Critérios da certificação",
    // Menu
    menu_greeting: "Olá! Vamos explorar Natal juntos.",
    menu_sec_language: "Idioma",
    menu_sec_accessibility: "Acessibilidade",
    menu_sec_navigation: "Navegação",
    menu_sec_about: "Sobre",
    menu_map: "Mapa de Natal",
    menu_about_project: "Sobre o projeto",
    menu_feedback: "Enviar feedback",
    menu_admin: "Painel administrativo",
    menu_logout: "Sair da conta",
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
    // Screen titles / shared buttons
    guides_title: "Certified Guides",
    guide_detail_title: "Certified Guide",
    partners_title: "Accessible Partners",
    seal_title: "Digital Seal",
    audio_title: "Audio experience",
    menu_title: "Menu",
    seal_about_btn: "About the Gold Category seal",
    // Guides
    guides_hero_title: "Guides with Gold Category Seal",
    guides_hero_sub: "Professionals trained in the Turismo que se Sente Course (120h) — specialists in audio description, sign language, and service for people with disabilities and neurodivergent visitors.",
    guides_all_access: "All accessibilities",
    guides_empty: "No guides found with these filters.",
    // Partners
    partners_hero_title: "Hotels · Restaurants · Tours",
    partners_hero_sub: "Establishments certified by the Turismo que se Sente seal.",
    partners_empty: "No partners found.",
    certified: "Certified",
    reserve: "Book",
    // Near me
    near_active_location: "Location active",
    near_empty: "No spots found in this category.",
    activate_location: "Enable my location",
    update_location_short: "Update location",
    // Emergency
    emergency_hero_title: "Are you safe?",
    emergency_hero_sub: "Tap to call emergency services directly or share your location.",
    emergency_services: "Emergency services",
    emergency_share: "Share location",
    // Seal
    seal_cert_subtitle: "Accessibility Certification",
    seal_intro: "The Turismo que se Sente Seal certifies establishments that offer truly accessible experiences for people with visual impairments, focusing on sensory mediation and inclusive service.",
    seal_verify_title: "Verify a partner's seal",
    seal_verify_hint: "Enter the establishment's seal code or scan the QR code on the storefront / menu.",
    seal_verify_btn: "Verify seal",
    seal_criteria_title: "Certification criteria",
    // Menu
    menu_greeting: "Hi! Let's explore Natal together.",
    menu_sec_language: "Language",
    menu_sec_accessibility: "Accessibility",
    menu_sec_navigation: "Navigation",
    menu_sec_about: "About",
    menu_map: "Map of Natal",
    menu_about_project: "About the project",
    menu_feedback: "Send feedback",
    menu_admin: "Admin panel",
    menu_logout: "Sign out of account",
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
    // Títulos de pantalla / botones compartidos
    guides_title: "Guías Certificados",
    guide_detail_title: "Guía Certificado",
    partners_title: "Socios Accesibles",
    seal_title: "Sello Digital",
    audio_title: "Experiencia de audio",
    menu_title: "Menú",
    seal_about_btn: "Sobre el sello Categoría Oro",
    // Guías
    guides_hero_title: "Guías con Sello Categoría Oro",
    guides_hero_sub: "Profesionales capacitados en el Curso Turismo que se Sente (120h) — especialistas en audiodescripción, lengua de señas y atención a personas con discapacidad y neurodivergentes.",
    guides_all_access: "Todas las accesibilidades",
    guides_empty: "No se encontraron guías con estos filtros.",
    // Socios
    partners_hero_title: "Hoteles · Restaurantes · Paseos",
    partners_hero_sub: "Establecimientos certificados por el sello Turismo que se Sente.",
    partners_empty: "No se encontraron socios.",
    certified: "Certificado",
    reserve: "Reservar",
    // Cerca de mí
    near_active_location: "Ubicación activa",
    near_empty: "No se encontraron puntos en esta categoría.",
    activate_location: "Activar mi ubicación",
    update_location_short: "Actualizar ubicación",
    // Emergencia
    emergency_hero_title: "¿Estás a salvo?",
    emergency_hero_sub: "Toca para llamar directamente a los servicios de emergencia o compartir tu ubicación.",
    emergency_services: "Servicios de emergencia",
    emergency_share: "Compartir ubicación",
    // Sello
    seal_cert_subtitle: "Certificación de Accesibilidad",
    seal_intro: "El Sello Turismo que se Sente certifica establecimientos que ofrecen experiencias verdaderamente accesibles para personas con discapacidad visual, con enfoque en la mediación sensorial y la atención inclusiva.",
    seal_verify_title: "Verificar el sello de un socio",
    seal_verify_hint: "Ingresa el código del sello del establecimiento o escanea el código QR en la fachada / menú.",
    seal_verify_btn: "Verificar sello",
    seal_criteria_title: "Criterios de la certificación",
    // Menú
    menu_greeting: "¡Hola! Exploremos Natal juntos.",
    menu_sec_language: "Idioma",
    menu_sec_accessibility: "Accesibilidad",
    menu_sec_navigation: "Navegación",
    menu_sec_about: "Acerca",
    menu_map: "Mapa de Natal",
    menu_about_project: "Acerca del proyecto",
    menu_feedback: "Enviar comentarios",
    menu_admin: "Panel administrativo",
    menu_logout: "Cerrar sesión",
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
