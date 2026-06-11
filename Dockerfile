# =====================================================================
# AprovaIA — imagem de produção (TanStack Start SSR em Node)
# Para EasyPanel: tipo "Dockerfile". Veja DEPLOY.md para variáveis.
# =====================================================================

# ---------- Stage 1: build ----------
FROM node:22-alpine AS builder
WORKDIR /app

# As variáveis VITE_* são embutidas no bundle do CLIENTE em build-time.
# No EasyPanel, passe-as em "Build" → "Build Args" (não como env de runtime).
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_PUBLISHABLE_KEY
ARG VITE_SUPABASE_PROJECT_ID
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL \
    VITE_SUPABASE_PUBLISHABLE_KEY=$VITE_SUPABASE_PUBLISHABLE_KEY \
    VITE_SUPABASE_PROJECT_ID=$VITE_SUPABASE_PROJECT_ID

# Instala dependências (inclui devDependencies, necessárias para o build).
COPY package.json ./
RUN npm install --no-audit --no-fund

# Copia o código e gera o build com o preset Node do Nitro
# (produz dist/server = handler SSR e dist/client = estáticos).
COPY . .
RUN NITRO_PRESET=node-server npm run build

# ---------- Stage 2: runtime ----------
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    HOST=0.0.0.0

# O bundle do servidor é autocontido: só precisamos do build e do server.mjs
# (que usa apenas APIs nativas do Node — sem node_modules em runtime).
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.mjs ./server.mjs
COPY --from=builder /app/package.json ./package.json

EXPOSE 3000
CMD ["node", "server.mjs"]
