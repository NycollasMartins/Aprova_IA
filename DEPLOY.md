# Deploy no EasyPanel (Docker)

O AprovaIA é um app **SSR (TanStack Start)** que roda como servidor Node. O
[Dockerfile](Dockerfile) builda e serve via [server.mjs](server.mjs).

## Conceito importante: build-time × runtime

As variáveis começadas com **`VITE_`** são **embutidas no JavaScript do navegador
durante o build** — precisam existir como **Build Args**, não como env de runtime.
As variáveis **sem** `VITE_` são lidas pelo servidor em **runtime** (env normal).

| Variável | Onde entra | Para quê |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | **Build Arg** | URL do Supabase no bundle do navegador |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | **Build Arg** | anon key no navegador |
| `VITE_SUPABASE_PROJECT_ID` | **Build Arg** | id do projeto |
| `SUPABASE_URL` | Env (runtime) | usado em SSR / server functions |
| `SUPABASE_PUBLISHABLE_KEY` | Env (runtime) | idem |
| `SUPABASE_PROJECT_ID` | Env (runtime) | idem |
| `SUPABASE_SERVICE_ROLE_KEY` | Env (runtime) | **opcional**, só p/ operações admin no servidor |
| `PORT` | Env (runtime) | porta do servidor (default `3000`) |

> Se você esquecer os **Build Args** `VITE_*`, o app sobe mas o navegador não
> consegue falar com o Supabase (URL/anon ficam `undefined` no bundle).

## Passo a passo no EasyPanel

1. **Crie o projeto Supabase novo** e rode [supabase/init_new_project.sql](supabase/init_new_project.sql)
   no SQL Editor. Em **Authentication → Email**, desligue **"Confirm email"**.
   Anote: Project URL, anon/publishable key e o ref do projeto.

2. No EasyPanel, crie um **App** apontando para este repositório (ou suba o código).
   Em **Source/Build**, escolha **Dockerfile** (o build é detectado automaticamente).

3. Em **Build → Build Args**, adicione:
   ```
   VITE_SUPABASE_URL=https://<ref>.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=<anon key>
   VITE_SUPABASE_PROJECT_ID=<ref>
   ```

4. Em **Environment** (runtime), adicione:
   ```
   SUPABASE_URL=https://<ref>.supabase.co
   SUPABASE_PUBLISHABLE_KEY=<anon key>
   SUPABASE_PROJECT_ID=<ref>
   # opcional:
   SUPABASE_SERVICE_ROLE_KEY=<service role key>
   ```

5. Em **Network/Proxy**, aponte a porta interna para **3000** (o container expõe 3000;
   o EasyPanel injeta `PORT` automaticamente — o servidor respeita `PORT` se vier).

6. **Deploy**. Ao final, acesse o domínio: deve abrir a landing → "Começar" → cadastro
   → onboarding → dashboard.

## Rodar a imagem localmente (opcional, requer Docker)

```bash
docker build \
  --build-arg VITE_SUPABASE_URL=https://<ref>.supabase.co \
  --build-arg VITE_SUPABASE_PUBLISHABLE_KEY=<anon> \
  --build-arg VITE_SUPABASE_PROJECT_ID=<ref> \
  -t aprovaia .

docker run --rm -p 3000:3000 \
  -e SUPABASE_URL=https://<ref>.supabase.co \
  -e SUPABASE_PUBLISHABLE_KEY=<anon> \
  aprovaia
# abre em http://localhost:3000
```

## Sem Docker (Node puro)

```bash
npm install
npm run build:node      # gera dist/ com o preset Node do Nitro
npm start               # node server.mjs → http://localhost:3000
```
(As `VITE_*` são lidas do `.env` local no momento do `build:node`.)
