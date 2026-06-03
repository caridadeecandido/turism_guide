# Turismo que se Sente — PRD (v3)

## Visão geral
Aplicativo móvel **acessível e profissional** (Expo / React Native + FastAPI + MongoDB) que apresenta os principais pontos turísticos de **Natal/RN** com **audiodescrição em português**, multi-idioma (PT/EN/ES via LLM), marketplace de parceiros certificados, mapa real (OpenStreetMap), botão de emergência, painel administrativo blindado (JWT) e painel flutuante global de acessibilidade.

## Stack
- **Frontend**: Expo SDK 54 + Expo Router (file-based), React Native 0.81, expo-speech (TTS pt-BR/en-US/es-ES), expo-haptics, expo-secure-store, @expo/vector-icons.
- **Backend**: FastAPI + Motor (MongoDB async), bcrypt + PyJWT (admin), Emergent LLM Key (`gpt-4o-mini` para traduções).
- **Identidade visual**: paleta roxo/violeta `#7C3AED` + fundo navy escuro `#0B1120` (WCAG AAA).

## Autenticação (dual)
- **Turista** — Emergent Google Auth (favoritos, idioma, reservas)
- **Administrador** — JWT custom protegido, login em `/admin/login` (`AdminAuthProvider` separado do `AuthProvider`)

### Admin default
- email: `admin@turismoquesesente.com.br`
- senha: `Natal@2026!`

## Painel administrativo (CMS) — `/admin/*`
Rotas blindadas por `AdminGate` (redireciona para `/admin/login` se sem token):
- `/admin` — lista + CRUD de pontos turísticos
- `/admin/site` — Site & Selo (texto, footer, boas-vindas PT/EN/ES, imagem do selo)
- `/admin/translations` — traduções manuais EN/ES (com auto-tradução por IA)
- `/admin/inquiries` — solicitações dos clientes (parceiros)

## Acessibilidade (Floating Panel)
Componente global `AccessibilityPanel` (top-right) sempre presente:
- **Audio-descrição interativa** (TTS sob foco)
- **Retorno auditivo (beeps)** — Web Audio API / Speech
- **Feedback tátil (vibração)** — Haptics nativos / `navigator.vibrate`
- **Locomoção reduzida** (botões grandes)
Preferências persistidas em SecureStore (mobile) / localStorage (web). Sincronizado com `/menu`.

## Selo Digital
- Imagem dinâmica vinda de `site_config.seal_image_url` (editável no admin)
- Exibido como `SealFooter` em Home, Menu e /seal
- Página `/seal` verifica códigos de selo dos parceiros via `GET /seal/verify/{code}`

## Telas (Tourist)
- `/` Home — boas-vindas dinâmicas (config), busca, acessos rápidos, destaques, lista + seletor idioma
- `/spot/[id]` Detalhe com hero, badges, audio CTA
- `/audio/[id]` Player TTS
- `/near` GPS + filtros
- `/map` OpenStreetMap WebView
- `/marketplace` Parceiros + filtros
- `/partner/[id]` Detalhe + inquiry form
- `/seal` Verificação de selo
- `/emergency` 190/192/193
- `/menu` Configurações + a11y toggles + Selo + Idioma + Admin
- `/login` Google Auth

## Backend — API (`/api/*`)
- **Públicos**: `/spots`, `/categories`, `/partners`, `/seal/verify/{code}`, `/site-config`, `/spots/{id}/translate?lang=`
- **Tourist auth**: `/auth/session`, `/auth/me`, `/auth/logout`, `/me/*`
- **Admin (JWT)**: `/admin/login`, `/admin/me`, `/admin/site-config`, `/admin/inquiries`, `/admin/upload-image`, `/admin/change-password` + todos `POST/PUT/DELETE` em `/spots` e `/seed`

## Tradução
- Manual (override) salvo em `spot.translations[lang]`
- Cache LLM em `db.translations` por `spot_id:lang`
- Fallback live: `emergentintegrations` + `gpt-4o-mini`

## Como editar / personalizar
1. Logar em `/admin/login`
2. **Site & Selo** — trocar imagem, textos, footer, boas-vindas (PT/EN/ES)
3. **Pontos turísticos** — CRUD completo + `image_alt` (acessibilidade) + lat/lng GPS
4. **Traduções** — auto-traduzir por IA ou revisar manualmente
5. **Solicitações** — receber reservas dos parceiros

## Observações
- TTS: usa `expo-speech` (nativo). No web depende de vozes do navegador.
- Imagens: URLs públicas (Pexels/Unsplash) + suporte a base64 via `/admin/upload-image`.
- Seed automático na 1ª inicialização (14 pontos + 6 parceiros + 1 admin + site config).
