# Turismo que se Sente

Aplicativo de turismo acessível para Natal/RN (projeto SENAC RN).

- `backend/` — API REST (FastAPI + MongoDB)
- `frontend/` — App Expo / React Native (iOS, Android e Web)

---

## Deploy do backend no Render

O backend é publicado como um **Web Service** no Render a partir do blueprint
[`render.yaml`](render.yaml) na raiz do repositório. A arquitetura atual é mantida
(FastAPI + MongoDB), com o start command via `uvicorn` ouvindo na porta fornecida
pela variável `PORT` do Render.

### Passos

1. Faça push do repositório para o GitHub/GitLab.
2. No painel do Render: **New + → Blueprint** e selecione este repositório.
   O Render lê o `render.yaml` automaticamente e cria o serviço.
   - Alternativa manual (**New + → Web Service**), apontando para a pasta `backend/`:
     - **Build Command:** `pip install --extra-index-url https://d33sy5i8bnduwe.cloudfront.net/simple/ -r requirements.txt`
     - **Start Command:** `uvicorn server:app --host 0.0.0.0 --port $PORT`
3. Em **Environment**, defina as variáveis de ambiente (tabela abaixo). Todas estão
   marcadas como `sync: false` no blueprint, então o Render pede o valor no painel —
   **nenhum segredo fica versionado**.
4. Confirme o deploy. O health check usa `GET /api/health`.
5. Use a URL pública do serviço (ex.: `https://turismo-que-se-sente-api.onrender.com`)
   no frontend, na variável `EXPO_PUBLIC_BACKEND_URL`.

### Variáveis de ambiente (definir no Render)

| Variável | Obrigatória | Descrição |
|---|---|---|
| `MONGO_URL` | sim | String de conexão do MongoDB (ex.: MongoDB Atlas `mongodb+srv://...`). |
| `DB_NAME` | sim | Nome do banco de dados. |
| `JWT_SECRET` | sim | Segredo para assinar os tokens JWT de admin. Use um valor longo e aleatório. |
| `DEFAULT_ADMIN_EMAIL` | sim | E-mail do admin criado no primeiro start. |
| `DEFAULT_ADMIN_PASSWORD` | sim | Senha do admin criada no primeiro start (troque após o primeiro login). |
| `CLOUDINARY_URL` | sim* | Credencial única do Cloudinary: `cloudinary://<api_key>:<api_secret>@<cloud_name>`. Usada pelo upload de imagens do admin. |
| `CLOUDINARY_CLOUD_NAME` | sim* | Alternativa ao `CLOUDINARY_URL` (use o trio abaixo OU a URL única). |
| `CLOUDINARY_API_KEY` | sim* | Parte do trio de credenciais do Cloudinary. |
| `CLOUDINARY_API_SECRET` | sim* | Parte do trio de credenciais do Cloudinary. |
| `EMERGENT_LLM_KEY` | opcional | Chave para tradução automática via LLM. Sem ela, a tradução ao vivo retorna 503 e o restante do app segue funcionando. |

\* Para o upload de imagens funcionar, defina **ou** `CLOUDINARY_URL`, **ou** o trio
`CLOUDINARY_CLOUD_NAME` + `CLOUDINARY_API_KEY` + `CLOUDINARY_API_SECRET`. Sem credenciais,
`POST /admin/upload-image` retorna 503; o restante do app segue funcionando. Opcionalmente,
`CLOUDINARY_UPLOAD_FOLDER` define a pasta de destino no Cloudinary (padrão `turismo-que-se-sente/uploads`).

Gere um `JWT_SECRET` seguro:

```bash
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

### Observações

- **MongoDB não é provisionado pelo Render.** Use um cluster gerenciado (ex.: MongoDB
  Atlas) e libere o acesso de rede do Render (IP allowlist `0.0.0.0/0` ou peering).
- **Uploads de imagem** (admin) vão para o **Cloudinary** — o endpoint retorna a
  `secure_url` (https absoluta e estável), então não dependem do disco efêmero do Render.
  As imagens de **marca** (`backend/static/brand/`) continuam versionadas no repo e são
  servidas em `/static/brand/...`.
- O `EMERGENT_LLM_KEY` e o pacote `emergentintegrations` (resolvido pelo
  `--extra-index-url` no build) são necessários apenas para a tradução automática.

---

## Desenvolvimento local (backend)

```bash
cd backend
cp .env.example .env   # preencha os valores (veja a tabela acima)
pip install --extra-index-url https://d33sy5i8bnduwe.cloudfront.net/simple/ -r requirements.txt
uvicorn server:app --reload --port 8000
```

A API sobe em `http://localhost:8000` (health check em `/api/health`).

## Desenvolvimento local (frontend)

```bash
cd frontend
yarn install
# defina EXPO_PUBLIC_BACKEND_URL apontando para o backend (local ou Render)
yarn web        # ou: yarn android / yarn ios
```

---

## Conectar o frontend ao backend em produção

O app lê a URL do backend da variável **`EXPO_PUBLIC_BACKEND_URL`** (usada em
`src/api.ts`, `src/auth-context.tsx`, `src/site-config.tsx`, `src/admin-auth.tsx`,
`src/asset-url.ts`, etc.). Em produção, ela deve apontar para a **URL pública do
backend no Render**, por exemplo:

```
EXPO_PUBLIC_BACKEND_URL=https://turismo-que-se-sente-api.onrender.com
```

> ⚠️ **Importante:** variáveis com o prefixo `EXPO_PUBLIC_` são **embutidas no bundle
> em tempo de build** (não são lidas em runtime). Defina o valor **antes** de gerar o
> build; para trocar a URL do backend, é preciso **refazer o build**. Use a URL sem
> barra final (o código já monta os caminhos `/api/...`). Como o backend habilita CORS
> para qualquer origem, o site estático pode chamá-lo de qualquer domínio.

A variável pode ser definida de duas formas:

- **Arquivo `.env`** na pasta `frontend/` (o Expo carrega automaticamente as variáveis
  `EXPO_PUBLIC_*`):
  ```
  EXPO_PUBLIC_BACKEND_URL=https://turismo-que-se-sente-api.onrender.com
  ```
- **Inline** no comando de build (útil em CI):
  ```bash
  EXPO_PUBLIC_BACKEND_URL=https://turismo-que-se-sente-api.onrender.com npx expo export -p web
  ```

### Build web (site estático)

```bash
cd frontend
yarn install
EXPO_PUBLIC_BACKEND_URL=https://turismo-que-se-sente-api.onrender.com npx expo export -p web
```

- O comando `npx expo export -p web` gera o site estático (o `app.json` já usa
  `web.bundler = "metro"` e `web.output = "static"`).
- A saída fica na pasta **`frontend/dist/`** — é esse diretório que você publica em
  qualquer host estático (Render Static Site, Netlify, Vercel, GitHub Pages,
  Cloudflare Pages, S3+CloudFront, etc.).

### Publicar no Render (Static Site)

1. **New + → Static Site**, apontando para este repositório.
2. Configure:
   - **Root Directory:** `frontend`
   - **Build Command:** `yarn install && npx expo export -p web`
   - **Publish Directory:** `dist`
3. Em **Environment**, adicione `EXPO_PUBLIC_BACKEND_URL` com a URL do backend no Render.
4. Se rotas dinâmicas (ex.: `/spot/<id>`) ou refresh/deep-link retornarem 404, adicione
   uma regra de **Rewrite** `/* → /index.html` (Redirects/Rewrites do Render) para que o
   roteamento do Expo Router seja resolvido no cliente.
