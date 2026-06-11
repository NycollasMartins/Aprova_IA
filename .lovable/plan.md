# Plano de estabilização do AprovaIA (por fases)

**Premissas confirmadas:**
- Mantemos o que está construído (rotas, componentes, banco). Não vamos apagar.
- Login fica desativado: usuário entra direto no app pelo onboarding.
- Entrego em blocos de 2-3 fases, paro e espero seu OK antes do próximo bloco.

**Estado atual auditado:**
- Rotas do app: `dashboard`, `cronograma`, `revisoes`, `questoes`, `desempenho`, `tutor`, `configuracoes`, `owner`
- Onboarding existe e salva no Supabase OU em `localStorage` (quando sem login)
- Hooks: `useProfile`, `useRole`, `useImpersonation`
- Banco: `profiles`, `study_sessions`, `revisions`, `question_logs`, `user_roles` (todos com RLS)

**Conflito raiz que está causando a sensação de "tudo quebrado":**
Metade do app assume usuário logado (RLS exige `auth.uid()`), mas o login está desativado. Resultado: hooks consultam Supabase sem sessão, as queries voltam vazias, botões "salvar" silenciosamente falham, e cada tela mostra estados inconsistentes.

---

## BLOCO 1 — Fundação (entrego junto, você valida)

### Fase 1.1 — Camada de dados unificada (sem login)
- Criar um `useLocalStore` único que abstrai persistência: usa Supabase se houver sessão, senão `localStorage`.
- Centralizar perfil, sessões de estudo, revisões e logs de questões nesse hook.
- Remover chamadas Supabase diretas espalhadas pelas telas.
- Garantir que toda tela leia/escreva pelo mesmo lugar — fim das telas "vazias" porque a query falhou.

### Fase 1.2 — Limpeza de rotas e remoção de telas mortas
- Remover rotas órfãs de auth do menu (`login`, `cadastro`, `forgot-password`, `reset-password`) — os arquivos ficam, só somem da navegação.
- Remover/ocultar `_app.owner.tsx` enquanto não há login (impersonation não faz sentido sem sessão).
- Limpar `ImpersonationBanner` e `LogoutDialog` da árvore enquanto login está off.
- Onboarding vira a porta de entrada real: `/` → CTA → `/onboarding` → `/dashboard`.

---

## BLOCO 2 — Telas funcionais (entrego junto)

### Fase 2.1 — Dashboard real
- Cards mostram dados do `useLocalStore`: nº de sessões hoje, próxima revisão, % acertos da semana.
- Zero card decorativo — se não há dado, mostra estado vazio com CTA ("Comece registrando sua primeira sessão").
- Botões do dashboard navegam de verdade.

### Fase 2.2 — Cronograma + Revisões funcionais
- Cronograma: criar/editar/concluir/excluir sessão de estudo. Persiste via `useLocalStore`.
- Revisões: lista por data, marcar como feita, repetição espaçada simples (1d / 7d / 30d).
- Formulários salvam e o usuário vê a mudança imediatamente.

---

## BLOCO 3 — IA e métricas (entrego junto)

### Fase 3.1 — Questões com log real
- Tela de questões registra acertos/erros em `question_logs`.
- Filtro por matéria, contagem viva.

### Fase 3.2 — Desempenho com dados reais
- Gráficos calculados a partir de `question_logs` e `study_sessions` (sem mock).
- Estado vazio honesto quando não há dados.

### Fase 3.3 — Tutor IA conectado
- Conectar ao Lovable AI Gateway (Gemini Flash) — não precisa de chave do usuário.
- Conversa real, contexto do perfil/concurso do onboarding.

---

## BLOCO 4 — Configurações + polimento (entrego junto)

### Fase 4.1 — Configurações
- Editar perfil, preferências de notificação, modo foco — tudo salva no `useLocalStore`.
- Botão "Refazer onboarding" funcional.

### Fase 4.2 — Auditoria final
- Varredura: cada botão tem ação, cada formulário salva, cada gráfico tem fonte de dado real.
- Remover qualquer componente que sobrar sem uso.

---

## Detalhes técnicos

- `useLocalStore`: hook único com namespace `aprovaia:v1:*` no localStorage. Quando login voltar, basta trocar a implementação interna — a API pública dos hooks não muda.
- Schemas Zod nas escritas para garantir formato consistente entre localStorage e Supabase.
- Nenhuma migration nova neste plano (tabelas atuais já cobrem tudo).
- Rotas de auth ficam no disco mas sem links — reativar login é só re-adicionar `<Link>` no header e o guard em `_app.tsx`.

---

**Próximo passo:** se aprovar, começo pelo **BLOCO 1** (fases 1.1 + 1.2) e paro para você testar antes de seguir.