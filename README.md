# AprovaIA

Plataforma de estudos para concursos públicos. O aluno se cadastra, escolhe um concurso do catálogo, e o sistema monta cronograma, revisões e métricas a partir do **edital vigente** desse concurso.

- **Frontend + servidor:** [TanStack Start](https://tanstack.com/start) (React 19, SSR, roteamento por arquivos) rodando em Node
- **Backend de dados:** [Supabase](https://supabase.com) (Postgres + Auth + Storage), com Row Level Security em todas as tabelas
- **UI:** Tailwind CSS v4 + [shadcn/ui](https://ui.shadcn.com) (Radix) + lucide-react + Recharts
- **Deploy:** Docker no EasyPanel ([DEPLOY.md](DEPLOY.md))

> O projeto nasceu no [Lovable](https://lovable.dev). Por isso alguns arquivos têm o cabeçalho "automatically generated" e o `vite.config.ts` usa o preset `@lovable.dev/vite-tanstack-config`. Hoje o código é mantido direto neste repositório.

---

## Sumário

1. [Rodando localmente](#1-rodando-localmente)
2. [Configurando o Supabase](#2-configurando-o-supabase)
3. [Variáveis de ambiente](#3-variáveis-de-ambiente)
4. [Deploy](#4-deploy)
5. [Arquitetura](#5-arquitetura)
6. [Mapa de pastas](#6-mapa-de-pastas)
7. [Telas: onde está cada uma e o que ela usa](#7-telas-onde-está-cada-uma-e-o-que-ela-usa)
8. [Banco de dados](#8-banco-de-dados)
9. [Como fazer… (receitas)](#9-como-fazer-receitas)
10. [Arquivos que você NÃO deve editar à mão](#10-arquivos-que-você-não-deve-editar-à-mão)
11. [Qualidade de código e convenções](#11-qualidade-de-código-e-convenções)
12. [Estado do projeto e roadmap](#12-estado-do-projeto-e-roadmap)
13. [Problemas comuns](#13-problemas-comuns)

---

## 1. Rodando localmente

**Pré-requisitos:** Node 22+ e npm. O repositório tem `bun.lock` e `package-lock.json`, mas o Docker usa **npm**, então use npm para não divergir.

```bash
git clone https://github.com/NycollasMartins/Aprova_IA.git
cd Aprova_IA
npm install
cp .env.example .env      # preencha com os dados do seu projeto Supabase (seção 3)
npm run dev               # o Vite mostra a URL local no terminal
```

Sem um projeto Supabase configurado (seção 2), o app abre a landing, mas cadastro/login falham.

### Scripts

| Comando | O que faz |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento com hot reload |
| `npm run build:node` | Build de produção para Node (gera `dist/`) |
| `npm start` | Sobe o build de produção (`node server.mjs`, porta 3000) |
| `npm run lint` | ESLint |
| `npm run format` | Prettier em todo o projeto |

> `npm run build` (sem `:node`) usa o alvo padrão do preset Lovable (Cloudflare). Para rodar em Node/Docker, use sempre `build:node`.

---

## 2. Configurando o Supabase

O schema inteiro está em **três arquivos SQL idempotentes** (podem ser rodados mais de uma vez sem erro). Rode no **SQL Editor** do Supabase, **nesta ordem**:

| Ordem | Arquivo | O que cria |
| --- | --- | --- |
| 1 | [supabase/init_new_project.sql](supabase/init_new_project.sql) | Base: `profiles`, `user_roles` (+ enum `app_role`), `study_sessions`, `question_logs`, `revisions`, funções `has_role` / `handle_new_user` / `set_updated_at`, RLS, bucket `avatars` |
| 2 | [supabase/edital_module.sql](supabase/edital_module.sql) | Catálogo de concursos e editais versionados: `concursos`, `editais`, `edital_materias`, `edital_topicos`, `user_concursos`, `user_topico_progresso`, função `is_admin` |
| 3 | [supabase/cronograma_module.sql](supabase/cronograma_module.sql) | Liga cronograma e revisões ao edital (colunas novas em `study_sessions`, `revisions` e `profiles`) |

Depois, no painel do Supabase:

1. **Authentication → Providers → Email → desligue "Confirm email".** É obrigatório: o fluxo assume que o cadastro já cria sessão e manda o aluno direto para o onboarding. Com a confirmação ligada, o onboarding roda sem sessão e quebra.
2. **Torne-se admin** para cadastrar concursos e editais. O `edital_module.sql` cria só um concurso de exemplo ("Polícia Federal — Agente (exemplo)"), que serve para testar e deve ser removido ou desativado em `/admin` antes de entrar aluno real. Cadastre-se no app e rode:
   ```sql
   INSERT INTO public.user_roles (user_id, role)
   SELECT id, 'owner' FROM auth.users WHERE email = 'seu@email.com'
   ON CONFLICT DO NOTHING;
   ```
3. Se trocar de projeto Supabase, atualize também o `project_id` em [supabase/config.toml](supabase/config.toml).

> **Sobre [supabase/migrations/](supabase/migrations/):** são as migrações originais geradas pelo Lovable, mantidas só como histórico. O conteúdo delas já está consolidado no `init_new_project.sql`. **Não rode as duas coisas.**

---

## 3. Variáveis de ambiente

O modelo completo está em [.env.example](.env.example). O conceito mais importante do projeto:

- **`VITE_*` são embutidas no JavaScript do navegador na hora do build.** Precisam existir quando `vite build` roda (no Docker, como **Build Args**). Mudar depois do build não tem efeito.
- **As sem `VITE_` são lidas pelo servidor em runtime** (SSR e server functions).

| Variável | Quando | Obrigatória | Uso |
| --- | --- | --- | --- |
| `VITE_SUPABASE_URL` | build | sim | URL do Supabase no navegador |
| `VITE_SUPABASE_PUBLISHABLE_KEY` (ou `VITE_SUPABASE_ANON_KEY`) | build | sim | chave pública (anon) no navegador |
| `VITE_SUPABASE_PROJECT_ID` | build | não | id do projeto |
| `SUPABASE_URL` | runtime | sim | SSR / server functions |
| `SUPABASE_PUBLISHABLE_KEY` (ou `SUPABASE_ANON_KEY`) | runtime | sim | SSR / server functions |
| `SUPABASE_SERVICE_ROLE_KEY` | runtime | não | só se usar `supabaseAdmin` ([client.server.ts](src/integrations/supabase/client.server.ts)). **Nunca** com prefixo `VITE_` |
| `PORT` / `HOST` | runtime | não | padrão `3000` / `0.0.0.0` |
| `DEBUG_SSR_ERRORS` | runtime | não | `1` mostra o stack trace real na página de erro. Só para diagnóstico; desligue depois |

O `.env` está no `.gitignore` e **nunca** deve ser commitado.

---

## 4. Deploy

Produção roda no **EasyPanel** a partir do [Dockerfile](Dockerfile), conectado a este repositório no branch `main`. **Com o app já configurado no EasyPanel, publicar uma versão nova é só dar push no `main`** (com auto-deploy ligado; senão, clique em Deploy no painel).

O passo a passo completo (Build Args, envs, porta, rodar a imagem localmente) está em **[DEPLOY.md](DEPLOY.md)**.

Duas coisas que já quebraram produção e você precisa saber:

1. **As `VITE_*` vão em Build Args, não em Environment.** Se faltarem, o app sobe, mas o navegador não fala com o Supabase.
2. **A imagem de runtime precisa do `node_modules` completo.** O bundle SSR não é autocontido: ele importa `h3-v2`, `react`, `@tanstack/*` etc. em runtime. `npm install --omit=dev` **não** basta (o `h3-v2` vem de devDependencies). Sem isso, toda rota dá `ERR_MODULE_NOT_FOUND`. O Dockerfile já copia o `node_modules` do estágio de build; não "otimize" isso sem testar.

**Antes de rodar SQL novo em produção:** rode primeiro num projeto Supabase de teste. Todos os SQLs são idempotentes, mas `ALTER TABLE` em produção não tem volta fácil.

---

## 5. Arquitetura

### Caminho de uma requisição em produção

```
Navegador ──► server.mjs (Node nativo, porta 3000)
                │
                ├─ arquivo existe em dist/client? ──► serve estático (/assets/* com cache de 1 ano)
                │
                └─ senão ──► dist/server/server.js  (build de src/server.ts)
                                │  wrapper que captura erros de SSR e renderiza src/lib/error-page.ts
                                ▼
                             TanStack Start  (src/start.ts: middlewares globais)
                                ▼
                             rota em src/routes/*  ──►  Supabase (direto do navegador, com RLS)
```

**O app fala com o Supabase direto do navegador** usando a chave pública. Quem garante que cada aluno só vê os próprios dados são as **políticas RLS no banco**, não o frontend. Hoje praticamente não há lógica de servidor própria: existe só o exemplo [src/lib/api/example.functions.ts](src/lib/api/example.functions.ts).

### Autenticação e fluxo do aluno

```
/ (landing) → /cadastro ou /login → /onboarding → /dashboard e demais telas
```

- O cadastro (`supabase.auth.signUp`) dispara o trigger `handle_new_user`, que cria a linha em `public.profiles`.
- O **guard de sessão** está em [src/routes/_app.tsx](src/routes/_app.tsx). Ele protege **todas** as rotas `_app.*`: sem sessão manda para `/login`; com `profiles.onboarding_completed = false` manda para `/onboarding`.
- A sessão fica no `localStorage` (gerenciada pelo supabase-js). Para chamar server functions autenticadas, [auth-attacher.ts](src/integrations/supabase/auth-attacher.ts) anexa o `Bearer` token automaticamente e [auth-middleware.ts](src/integrations/supabase/auth-middleware.ts) (`requireSupabaseAuth`) valida no servidor.

### Papéis

Tabela `user_roles` com enum `app_role`: `owner`, `admin`, `user`.

- No frontend: hook [useRole](src/hooks/useRole.ts) → `{ isAdmin, isOwner }`. Mostra o item "Admin" no menu.
- No banco: funções `has_role()` e `is_admin()` usadas nas políticas RLS. **A segurança real é essa.** Esconder um botão não protege nada.

### Estado global (providers)

```
__root.tsx       QueryClientProvider → ThemeProvider (tema por área do concurso)
  _app.tsx       ConcursoProvider (concurso ativo + edital vigente)
                   → StudyTimerProvider (cronômetro de horas líquidas)
                     → SidebarProvider → AppSidebar + página
```

| Contexto | Arquivo | Para que serve |
| --- | --- | --- |
| `useArea()` | [ThemeContext.tsx](src/contexts/ThemeContext.tsx) | Área do concurso (fiscal, militar, policial, tribunal, saúde, neutro). Define `data-theme` no `<html>` e troca a paleta de cores |
| `useConcurso()` | [ConcursoContext.tsx](src/contexts/ConcursoContext.tsx) | Concurso ativo, edital vigente, status (`sem_concurso` / `pre_edital` / `com_data`), troca de concurso. **É a base de cronograma, progresso e dashboard** |
| `useStudyTimer()` | [StudyTimerContext.tsx](src/contexts/StudyTimerContext.tsx) | Cronômetro do topo da tela. Persiste em `localStorage` (sobrevive a reload) e, ao finalizar, grava uma `study_session` |
| `useProfile()` / `useSession()` | [useProfile.ts](src/hooks/useProfile.ts) | Usuário logado + linha de `profiles`, com `updateProfile(patch)` |

### Busca de dados

As telas chamam `supabase.from(...)` diretamente dentro de `useEffect`/`useCallback`. O React Query está instalado e no provider, mas **ainda não é usado** pelas telas. Ao criar código novo, prefira React Query para ter cache e refetch.

---

## 6. Mapa de pastas

```
.
├── Dockerfile                 # build multi-stage para produção (ver DEPLOY.md)
├── server.mjs                 # servidor HTTP de produção (estáticos + SSR), sem dependências
├── vite.config.ts             # usa o preset Lovable — ler o comentário antes de adicionar plugins
├── components.json            # config do shadcn/ui
├── .env.example               # modelo de variáveis de ambiente
├── DEPLOY.md                  # deploy no EasyPanel
├── .lovable/                  # metadados do Lovable (plan.md é histórico e está DESATUALIZADO)
│
├── supabase/
│   ├── init_new_project.sql   # 1º — schema base
│   ├── edital_module.sql      # 2º — concursos/editais
│   ├── cronograma_module.sql  # 3º — cronograma/revisões ligados ao edital
│   ├── migrations/            # histórico do Lovable (não rodar)
│   └── config.toml            # project_id do Supabase
│
└── src/
    ├── routes/                # UMA TELA POR ARQUIVO (roteamento por arquivos — ver seção 7)
    │   ├── __root.tsx         # shell HTML, providers globais, página 404
    │   ├── _app.tsx           # layout da área logada + GUARD DE SESSÃO
    │   └── _app.*.tsx         # telas da área logada
    │
    ├── components/
    │   ├── ui/                # componentes shadcn/ui (botão, dialog, tabela…). Gerados via CLI
    │   ├── AppSidebar.tsx     # menu lateral (itens de navegação ficam aqui)
    │   ├── Topbar.tsx         # barra superior: título, seletor de concurso, cronômetro, avatar
    │   ├── ConcursoSelector.tsx    # dropdown de concurso ativo (na Topbar)
    │   ├── ConcursoCatalogList.tsx # lista do catálogo (onboarding e configurações)
    │   ├── EditalChangePopup.tsx   # pop-up "o edital mudou" (diff de tópicos)
    │   ├── StudyTimerWidget.tsx    # UI do cronômetro
    │   ├── AreaAmbience.tsx        # efeitos visuais de fundo por área
    │   ├── AreaSwitcher.tsx        # troca manual de área/tema
    │   └── Logo.tsx
    │
    ├── contexts/              # estado global (seção 5)
    ├── hooks/
    │   ├── useProfile.ts      # sessão + perfil
    │   ├── useRole.ts         # papéis (admin/owner)
    │   ├── use-mobile.tsx     # breakpoint mobile (usado pelo sidebar)
    │   └── useLocalStore.ts   # LEGADO — só o tipo LocalProfile ainda é usado
    │
    ├── lib/
    │   ├── cronograma.ts      # REGRAS do cronograma (distribuição de tópicos por dia) — funções puras
    │   ├── revisoes.ts        # REGRAS de revisão por desempenho (% acerto → intervalo) — funções puras
    │   ├── utils.ts           # cn() para classes Tailwind
    │   ├── config.server.ts   # config só de servidor (nunca vai para o navegador)
    │   ├── error-capture.ts / error-page.ts   # página de erro do SSR
    │   └── api/               # server functions (createServerFn)
    │
    ├── integrations/supabase/
    │   ├── client.ts          # cliente do navegador — `import { supabase } from "@/integrations/supabase/client"`
    │   ├── client.server.ts   # cliente admin (service role, ignora RLS) — só servidor
    │   ├── auth-attacher.ts / auth-middleware.ts  # token nas server functions
    │   └── types.ts           # tipos do banco (GERADO — seção 10)
    │
    ├── styles.css             # Tailwind + tokens de cor + temas por área ([data-theme="..."])
    ├── router.tsx / start.ts / server.ts   # bootstrap do TanStack Start
    └── routeTree.gen.ts       # GERADO automaticamente a partir de src/routes
```

O alias `@/` aponta para `src/`.

---

## 7. Telas: onde está cada uma e o que ela usa

Cada arquivo em `src/routes/` é uma URL. O prefixo `_app.` significa "dentro do layout logado" (com guard, sidebar e topbar); o `_app` não aparece na URL. Detalhes da convenção: [src/routes/README.md](src/routes/README.md).

| URL | Arquivo | Tabelas / recursos | Observações |
| --- | --- | --- | --- |
| `/` | [index.tsx](src/routes/index.tsx) | — | Landing pública |
| `/cadastro` | [cadastro.tsx](src/routes/cadastro.tsx) | `auth.signUp` | |
| `/login` | [login.tsx](src/routes/login.tsx) | `auth.signInWithPassword`, `profiles` | Redireciona para onboarding se incompleto |
| `/forgot-password` | [forgot-password.tsx](src/routes/forgot-password.tsx) | `auth.resetPasswordForEmail` | |
| `/reset-password` | [reset-password.tsx](src/routes/reset-password.tsx) | `auth.updateUser` | Destino do link do e-mail |
| `/onboarding` | [onboarding.tsx](src/routes/onboarding.tsx) | `profiles`, `concursos`, `editais`, `user_concursos` | 3 passos. Grava o perfil, vincula o concurso e copia dados do concurso para `profiles` (compatibilidade com telas antigas) |
| `/dashboard` | [_app.dashboard.tsx](src/routes/_app.dashboard.tsx) | `study_sessions`, `question_logs`, `revisions` | Cards e gráficos |
| `/cronograma` | [_app.cronograma.tsx](src/routes/_app.cronograma.tsx) | `edital_topicos`, `study_sessions`, `user_topico_progresso` | Gera sessões a partir dos tópicos do edital vigente. Regras em [lib/cronograma.ts](src/lib/cronograma.ts) |
| `/questoes` | [_app.questoes.tsx](src/routes/_app.questoes.tsx) | `question_logs` | Registro manual de acertos/erros por matéria |
| `/revisoes` | [_app.revisoes.tsx](src/routes/_app.revisoes.tsx) | `revisions`, `question_logs`, `study_sessions` | Modos manual/auto/combinado. Regras em [lib/revisoes.ts](src/lib/revisoes.ts) |
| `/desempenho` | [_app.desempenho.tsx](src/routes/_app.desempenho.tsx) | `question_logs` | Separada do Dashboard por decisão do cliente |
| `/configuracoes` | [_app.configuracoes.tsx](src/routes/_app.configuracoes.tsx) | `profiles`, storage `avatars`, `auth.updateUser` | Perfil, foto, senha, concurso, preferências de revisão |
| `/admin` | [_app.admin.tsx](src/routes/_app.admin.tsx) | `concursos`, `editais`, `edital_materias`, `edital_topicos` | CRUD do catálogo. Só `admin`/`owner` (UI via `useRole`; escrita bloqueada por RLS) |
| `/tutor` | [_app.tutor.tsx](src/routes/_app.tutor.tsx) | — | Placeholder "em breve". Fora do menu |

---

## 8. Banco de dados

### Modelo

```
auth.users ─1:1─ profiles
     │
     ├── user_roles             (owner | admin | user)
     ├── study_sessions ───────┐  (cronograma; tipo: novo | revisao | cronometro)
     ├── question_logs         │  (acertos/erros por matéria)
     ├── revisions ────────────┤  (origem: manual | auto | sugerida)
     ├── user_concursos ──┐    │  (qual concurso o aluno segue; 1 ativo por aluno)
     └── user_topico_progresso │
                          │    │
concursos ─1:N─ editais ─1:N─ edital_materias ─1:N─ edital_topicos
                (versionado: v1, v2… só 1 "vigente" por concurso, garantido por trigger)
```

### Regras que o banco garante (não reimplemente no frontend)

- **RLS em todas as tabelas.** O aluno só lê/escreve linhas com `user_id = auth.uid()`. Admin/owner leem tudo. Catálogo (`concursos`, `editais`, matérias, tópicos): todos leem, só admin escreve.
- **Um edital vigente por concurso** (trigger `editais_single_vigente`).
- **Um concurso ativo por aluno** (trigger `user_concursos_single_ativo`).
- **`updated_at` automático** (trigger `set_updated_at`).
- **Perfil criado no cadastro** (trigger `on_auth_user_created` → `handle_new_user`).
- **Retificação de edital:** cadastre uma nova versão no `/admin`. O `user_concursos.last_seen_edital_id` faz o [EditalChangePopup](src/components/EditalChangePopup.tsx) avisar o aluno.

### Colunas mantidas de propósito

`profiles.has_degree`, `degree_name` e `degree_area` (formação) **não aparecem mais na UI**, mas foram mantidas no banco por decisão do cliente. `profiles.target_concurso`, `exam_date` e `concurso_area` são uma cópia do concurso ativo, mantida para telas antigas; a fonte da verdade é `user_concursos` + `editais`.

---

## 9. Como fazer… (receitas)

### Adicionar uma tela nova na área logada
1. Crie `src/routes/_app.minha-tela.tsx`:
   ```tsx
   import { createFileRoute } from "@tanstack/react-router";
   import { Topbar } from "@/components/Topbar";

   export const Route = createFileRoute("/_app/minha-tela")({
     head: () => ({ meta: [{ title: "Minha Tela — AprovaIA" }] }),
     component: MinhaTela,
   });

   function MinhaTela() {
     return (
       <>
         <Topbar title="Minha Tela" />
         <main className="flex-1 p-4 sm:p-6">…</main>
       </>
     );
   }
   ```
2. Rode `npm run dev`: o `routeTree.gen.ts` é atualizado sozinho. A tela já nasce protegida pelo guard.
3. Para aparecer no menu, adicione um item ao array `main` em [AppSidebar.tsx](src/components/AppSidebar.tsx).

### Criar ou alterar uma tabela
1. Escreva o SQL **idempotente** (`CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`, `DROP POLICY IF EXISTS` antes de `CREATE POLICY`), seguindo o padrão dos módulos existentes. Para uma funcionalidade nova, crie `supabase/<nome>_module.sql` e acrescente-o à tabela da seção 2.
2. **Sempre** habilite RLS e crie as políticas. Tabela sem RLS fica exposta a qualquer pessoa com a chave pública.
3. Rode no SQL Editor (primeiro num projeto de teste).
4. Regenere os tipos:
   ```bash
   npx supabase gen types typescript --project-id <ref> > src/integrations/supabase/types.ts
   ```

### Mudar as regras de negócio
- **Distribuição do cronograma** (tópicos por dia, horários, carga): [src/lib/cronograma.ts](src/lib/cronograma.ts), `planSessions()` e `cargaDiaria()`.
- **Intervalos de revisão por desempenho** (faixas de % de acerto): [src/lib/revisoes.ts](src/lib/revisoes.ts), `intervaloPorDesempenho()`. Os intervalos padrão (2/4/7/15/30 dias) também existem como default da coluna `profiles.revisao_intervalos`.
- Esses arquivos são **funções puras** (sem React/Supabase). Mantenha assim: é o lugar mais fácil de testar.

### Mudar cores e temas
- Tokens de cor ficam em [src/styles.css](src/styles.css): `:root` é a base e cada `[data-theme="fiscal" | "militar" | …]` sobrescreve os tokens.
- Nova área: adicione ao tipo `ConcursoArea` e ao array `AREAS` em [ThemeContext.tsx](src/contexts/ThemeContext.tsx), crie o bloco `[data-theme="nova"]` no CSS e, se quiser detecção automática pelo nome do concurso, ajuste a regex em `detectArea()`.
- Use as classes semânticas (`bg-primary`, `text-muted-foreground`…), nunca cores fixas, senão o tema por área deixa de funcionar.

### Adicionar um componente de UI
Use o CLI do shadcn: `npx shadcn@latest add <componente>`. Ele cai em `src/components/ui/`.

### Lógica no servidor (segredos, chamadas a APIs externas)
Use `createServerFn` (exemplo em [src/lib/api/example.functions.ts](src/lib/api/example.functions.ts)):
- Para exigir login, adicione `.middleware([requireSupabaseAuth])`. O handler recebe `context.supabase` (com o usuário, respeitando RLS) e `context.userId`.
- Segredos: leia `process.env.X` **dentro** do handler ou de um arquivo `*.server.ts`, nunca com prefixo `VITE_`.
- `supabaseAdmin` ignora RLS. Use só quando for indispensável e sempre valide o usuário antes.

### Reativar o Tutor IA
A tela existe ([_app.tutor.tsx](src/routes/_app.tutor.tsx)), mas o backend nunca foi implementado. Recomendação: criar uma server function que chame a API do modelo (chave em env de runtime), usando o concurso ativo e o perfil como contexto. Depois, restaure o chat na tela e o item no menu.

### Tornar alguém admin
Veja o SQL na [seção 2](#2-configurando-o-supabase), com `role = 'admin'`.

---

## 10. Arquivos que você NÃO deve editar à mão

| Arquivo | Por quê | Como atualizar |
| --- | --- | --- |
| `src/routeTree.gen.ts` | Gerado pelo plugin do TanStack Router | Automático ao rodar `dev`/`build` |
| `src/integrations/supabase/types.ts` | Espelho do schema do banco | `supabase gen types` (seção 9) |
| `src/components/ui/*` | Vêm do shadcn | Pode customizar, mas prefira regenerar via CLI |

`client.ts`, `client.server.ts`, `auth-middleware.ts` e `auth-attacher.ts` dizem "automatically generated" porque vieram do Lovable. **O `client.ts` já foi customizado** (aceita `ANON_KEY` e `PUBLISHABLE_KEY` e dá uma mensagem de erro clara). Pode editar, mas com cuidado.

O [vite.config.ts](vite.config.ts) usa um preset que **já inclui** React, Tailwind, TanStack Start, Nitro e alias `@`. Adicionar esses plugins de novo quebra o build.

---

## 11. Qualidade de código e convenções

- **Idioma:** UI, comentários e nomes de domínio em português (`concurso`, `edital`, `topico`); infraestrutura em inglês.
- **Commits:** [Conventional Commits](https://www.conventionalcommits.org/pt-br/) (`feat:`, `fix(docker):`, `refactor:`…), como no histórico atual.
- **Formatação:** Prettier ([.prettierrc](.prettierrc)). Rode `npm run format` antes de commitar.
- **Sem testes automatizados** por enquanto. O ponto de partida natural é testar `src/lib/cronograma.ts` e `src/lib/revisoes.ts` (funções puras) com Vitest.

### Dívidas técnicas conhecidas

| Dívida | Impacto | Sugestão |
| --- | --- | --- |
| `npm run lint` acusa centenas de erros (quase todos de Prettier) + alguns `any` | Ruído | `npm run format` resolve a maioria; tipar os `any` |
| O Docker faz `npm install` sem lockfile (copia só `package.json`) | Builds podem pegar versões diferentes | Copiar `package-lock.json` e usar `npm ci` (testar o deploy depois) |
| Dois lockfiles (`bun.lock` e `package-lock.json`) | Confusão | Ficar só com npm e apagar `bun.lock`/`bunfig.toml` |
| Telas buscam dados com `useEffect` direto no Supabase | Sem cache e com código repetido | Migrar gradualmente para React Query |
| `src/hooks/useLocalStore.ts` é código morto (só o tipo `LocalProfile` é usado) | Confunde quem lê | Mover `LocalProfile` para `useProfile.ts` e apagar o arquivo |
| `.lovable/plan.md` descreve um plano antigo ("login desativado") | Informação errada | Ignorar ou apagar |
| "Recalcular cronograma" quando o edital muda ainda é só um aviso | Aluno precisa regerar manualmente | Implementar no `/cronograma` |

---

## 12. Estado do projeto e roadmap

| # | Etapa | Status |
| --- | --- | --- |
| 1 | Cadastro (sem campo de formação) | ✅ Feito |
| 2 | Edital + status do concurso (catálogo do admin, versões, pop-up de mudança) | ✅ Feito |
| 3 | Cronograma + revisões ligados ao edital | ✅ Feito |
| 4 | Cronômetro de horas líquidas | ✅ Feito |
| 5 | Banco de questões + simulados | ⏳ Pendente |
| 6 | Dashboard/Desempenho com dados do edital (Desempenho continua separado) | ⏳ Pendente |
| 7 | Área adaptativa (admin, animada) | ⏳ Pendente |
| — | Tutor IA | ⏸️ Pausado |

**Decisões do cliente (não mudar sem alinhar):**
- O edital é cadastrado **manualmente pelo admin**, sem importação de PDF nem scraping.
- O aluno escolhe concurso **só do catálogo**, sem texto livre. Hierarquia de **2 níveis: Matéria → Tópico**.
- **Desempenho continua como tela separada** do Dashboard.
- As colunas de formação ficam no banco, mesmo fora da UI.

---

## 13. Problemas comuns

| Sintoma | Causa provável | Solução |
| --- | --- | --- |
| Página "This page didn't load" em produção | Erro no SSR | Defina `DEBUG_SSR_ERRORS=1`, recarregue e leia o stack. Desligue depois |
| `ERR_MODULE_NOT_FOUND: Cannot find package 'h3-v2'` | Imagem sem `node_modules` | Ver seção 4, item 2 |
| `[Supabase] Variável(is) de ambiente ausente(s): VITE_SUPABASE_URL…` | `VITE_*` não estavam presentes no build | Adicionar como Build Args e rebuildar |
| Cadastro funciona, mas o onboarding não salva / volta para o login | "Confirm email" ligado no Supabase | Desligar (seção 2) |
| Catálogo de concursos vazio no onboarding | `edital_module.sql` não rodado, ou nenhum concurso com `ativo = true` | Rodar o SQL e cadastrar/ativar concursos em `/admin` |
| Query volta vazia sem erro | Bloqueada pela RLS (usuário errado ou policy faltando) | Conferir as policies da tabela no SQL do módulo |
| `relation "public.concursos" does not exist` | SQLs não rodados ou fora de ordem | Rodar os 3 arquivos da seção 2 na ordem |
| Tipo do Supabase não reconhece coluna nova | `types.ts` desatualizado | Regenerar (seção 9) |
| `EACCES` no `npm install` (macOS) | Cache do npm com arquivos de root | `npm install --cache /tmp/npm-cache` |
