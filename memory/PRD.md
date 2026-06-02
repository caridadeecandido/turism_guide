# Turismo que se Sente — PRD

## Visão geral
Aplicativo móvel **acessível** (Expo / React Native) que apresenta os principais pontos turísticos de **Natal/RN** com **audiodescrição em português**, informações de acessibilidade, imagens reais e painel administrativo para edição fácil. Inspirado no projeto SENAC Barreira Roxa.

## Stack
- **Frontend**: Expo SDK 54 + Expo Router (file-based), React Native 0.81, expo-speech (TTS pt-BR), @expo/vector-icons.
- **Backend**: FastAPI + Motor (MongoDB async). 14 pontos turísticos pré-cadastrados (seed automático).
- **Identidade visual**: paleta roxo/violeta `#7C3AED` (extraída da logo do projeto) + fundo navy escuro `#0B1120` para alto contraste WCAG AAA.

## Features Entregues
- **Home**: boas-vindas, busca, 6 acessos rápidos por categoria, banner de acessibilidade, destaques horizontais, lista completa
- **Detalhe do Atrativo** (`/spot/[id]`): hero image, badges de acessibilidade, descrição completa, CTA "Ouvir audiodescrição", endereço, lista de recursos
- **Experiência de Áudio** (`/audio/[id]`): player com play/pause/parar/avançar/retroceder, controle de velocidade (0.75x–1.5x), barra de progresso, transcrição visível, narração via TTS pt-BR nativo do dispositivo (`expo-speech`)
- **Perto de Mim** (`/near`): lista com chips de filtro por categoria, ordenação por distância
- **Menu/Configurações** (`/menu`): toggles de audiodescrição/contraste/vibração, idioma, ajuda, feedback por e-mail, botão **Emergência** (liga para 190)
- **Painel Admin** (`/admin`): CRUD completo dos pontos turísticos (Criar, Editar, Excluir) — qualquer pessoa pode editar nome, categoria, endereço, imagem, descrição, audiodescrição, badges e recursos de acessibilidade

## Pontos Turísticos Pré-Cadastrados (14)
Morro do Careca, Forte dos Reis Magos, Praia de Ponta Negra, Parque das Dunas, Dunas de Genipabu, Praia da Pipa, Maracajaú, Centro Histórico — Cidade Alta, Praia do Meio, Praia dos Artistas, Mirante de Mãe Luiza, Catedral Nova de Natal, Café do Forte, Hotel Parque da Costeira.

## API (todas com prefixo `/api`)
- `GET /spots` (com query `category`, `featured`)
- `GET /spots/{id}`
- `POST /spots`, `PUT /spots/{id}`, `DELETE /spots/{id}`
- `GET /categories`
- `POST /seed` (idempotente — reseta para os 14 padrões)

## Como editar facilmente
1. Abrir o app → tap no ícone de engrenagem (canto superior direito da home) **ou** Menu → Painel administrativo.
2. Botão **+** para criar; ícone de lápis para editar; ícone de lixeira para excluir.
3. Campos editáveis: nome, categoria, bairro, endereço, URL da imagem, distância, descrição curta, descrição completa, **audiodescrição (texto narrado)**, selos, recursos, destaque na home.
4. Para alterar a paleta de cores ou tipografia globalmente: edite `/app/frontend/src/theme.ts`.

## Observações
- **TTS**: usa `expo-speech` (offline, pt-BR nativo) — funciona perfeitamente em Expo Go / build nativo. No preview web pode não ter voz pt-BR instalada.
- **Imagens**: URLs do Pexels/Unsplash — o admin permite trocar por qualquer URL.
- **Logo oficial** carregada da URL pública do projeto (constante `LOGO_URL` em `theme.ts`).
- **Sem autenticação** — o painel admin está aberto (atende ao requisito "fácil de editar").
