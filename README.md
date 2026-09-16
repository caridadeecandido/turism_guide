# Turismo que se Sente

Aplicativo de turismo acessível para Natal/RN (projeto SENAC RN).

- `backend/` — API REST (FastAPI + Postgres), deploy como Vercel Function Python
- `frontend/` — App Expo / React Native (iOS, Android e Web), deploy como site estático na Vercel

Cada pasta é um **projeto Vercel separado** (Root Directory apontando pra
`backend/` e `frontend/` respectivamente), ligados ao mesmo repositório.

---

## Deploy do backend na Vercel

O backend roda como uma [Vercel Function Python](https://vercel.com/docs/frameworks/backend/fastapi)
— Vercel detecta o `app = FastAPI()` em `backend/server.py` automaticamente.

### Passos

1. Faça push do repositório para o GitHub.
2. No painel da Vercel: **Add New → Project**, selecione o repositório, e
   configure **Root Directory: `backend`**.
3. Em **Environment Variables**, defina as variáveis da tabela abaixo.
4. Deploy. Health check em `GET /api/health`.
5. Use a URL pública do projeto (ex.: `https://backend-xxxx.vercel.app`) no
   frontend, na variável `EXPO_PUBLIC_BACKEND_URL`.

Via CLI, de dentro de `backend/`: `npx vercel deploy --prod`.

### Variáveis de ambiente

| Variável | Obrigatória | Descrição |
|---|---|---|
| `DATABASE_URL` | sim | String de conexão Postgres (ex.: Neon `postgresql://user:pass@host/db?sslmode=require`). |
| `JWT_SECRET` | sim | Segredo para assinar os tokens JWT de admin. Use um valor longo e aleatório. |
| `DEFAULT_ADMIN_EMAIL` | sim | E-mail do admin criado no primeiro start. |
| `DEFAULT_ADMIN_PASSWORD` | sim | Senha do admin criada no primeiro start (troque após o primeiro login). |
| `BLOB_READ_WRITE_TOKEN` | sim* | Token do Vercel Blob, usado pelo upload de imagens do admin. Auto-preenchido ao conectar um Blob store ao projeto. |
| `EMERGENT_LLM_KEY` | não usado | Tradução automática via LLM foi desativada (pacote `emergentintegrations` não está no PyPI público, incompatível com o build da Vercel). Todo o conteúdo semeado já tem tradução manual EN/ES; conteúdo novo sem tradução manual retorna 503 no endpoint de tradução. |

\* Sem `BLOB_READ_WRITE_TOKEN`, `POST /admin/upload-image` retorna 503; o
restante do app segue funcionando. Opcionalmente, `BLOB_UPLOAD_FOLDER` define
a pasta de destino no Blob store (padrão `turismo-que-se-sente/uploads`).

Gere um `JWT_SECRET` seguro:

```bash
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

### Observações

- **Postgres não é provisionado pela Vercel.** Use um provedor gerenciado
  (ex.: Neon) e cole a connection string em `DATABASE_URL`.
- **Uploads de imagem** (admin) vão para o **Vercel Blob** — crie um store em
  **Storage → Blob** no dashboard e conecte ao projeto `backend`; isso
  popula `BLOB_READ_WRITE_TOKEN` automaticamente. As imagens de **marca**
  (`backend/static/brand/`) continuam versionadas no repo e são servidas em
  `/static/brand/...` via `app.mount()`.
- Seed automático (14 pontos + 6 parceiros + 5 guias + 1 admin + site config)
  roda só uma vez — na primeira request após o banco ficar vazio — e fica
  guardado por uma flag em processo (`backend/server.py`, `ensure_ready()`),
  então cold starts subsequentes não repetem o trabalho.

---

## Desenvolvimento local (backend)

```bash
cd backend
cp .env.example .env   # preencha os valores (veja a tabela acima), incl. DATABASE_URL
pip install -r requirements-dev.txt
uvicorn server:app --reload --port 8000
```

A API sobe em `http://localhost:8000` (health check em `/api/health`).

## Desenvolvimento local (frontend)

```bash
cd frontend
yarn install
# defina EXPO_PUBLIC_BACKEND_URL apontando para o backend (local ou Vercel)
yarn web        # ou: yarn android / yarn ios
```

---

## Conectar o frontend ao backend em produção

O app lê a URL do backend da variável **`EXPO_PUBLIC_BACKEND_URL`** (usada em
`src/api.ts`, `src/auth-context.tsx`, `src/site-config.tsx`, `src/admin-auth.tsx`,
`src/asset-url.ts`, etc.). Em produção, ela deve apontar para a **URL pública do
backend na Vercel**, por exemplo:

```
EXPO_PUBLIC_BACKEND_URL=https://backend-xxxx.vercel.app
```

> ⚠️ **Importante:** variáveis com o prefixo `EXPO_PUBLIC_` são **embutidas no bundle
> em tempo de build** (não são lidas em runtime). Defina o valor **antes** de gerar o
> build; para trocar a URL do backend, é preciso **refazer o build**. Use a URL sem
> barra final (o código já monta os caminhos `/api/...`). Como o backend habilita CORS
> para qualquer origem, o site estático pode chamá-lo de qualquer domínio.

A variável pode ser definida de duas formas:

- **No painel da Vercel** (projeto `frontend` → Environment Variables) — é
  assim que o build de produção lê o valor.
- **Inline** no comando de build (útil localmente/CI):
  ```bash
  EXPO_PUBLIC_BACKEND_URL=https://backend-xxxx.vercel.app npx expo export -p web
  ```

### Publicar o frontend na Vercel

1. **Add New → Project**, apontando para este repositório.
2. Configure **Root Directory: `frontend`**. O `frontend/vercel.json` já
   define o build command (`npx expo export -p web`), a pasta de saída
   (`dist`) e o rewrite SPA necessário pelas rotas dinâmicas do Expo Router
   (`/spot/[id]`, `/guide/[id]`, `/partner/[id]`, `/audio/[id]`).
3. Em **Environment Variables**, adicione `EXPO_PUBLIC_BACKEND_URL` com a URL
   do backend na Vercel.
4. Deploy. Via CLI, de dentro de `frontend/`: `npx vercel deploy --prod`.
