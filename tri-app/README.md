# Tri Atleta

App mobile pessoal de acompanhamento para triatleta — treinos de força (peso × séries × reps com evolução de carga), histórico manual de cardio (pace calculado automaticamente) e provas. Implementado a partir do pacote de design em `../` (ver `README.md` do handoff).

## Rodar

```sh
npm install
npx expo start
```

Abra no Expo Go (Android/iOS) ou em um emulador (`a` / `i` no terminal do Metro). Na primeira execução o banco local é criado e populado com dados de exemplo espelhando o design.

## Stack

- **Expo SDK 57** + expo-router (tabs + stack + modais), TypeScript estrito
- **expo-sqlite** — persistência local-first (WAL)
- **@supabase/supabase-js** — preparado para nuvem (ver abaixo)
- Fontes Google: **Archivo** (UI) e **JetBrains Mono** (todos os números)
- **lucide-react-native** — ícones da tab bar

## Estrutura

```
src/
  app/                  rotas (expo-router)
    (tabs)/index.tsx    1. Dashboard
    (tabs)/forca.tsx    2. Registro de treino de força
    (tabs)/cardio.tsx   3. Histórico de cardio
    (tabs)/provas.tsx   6. Provas
    exercise/[id].tsx   4. Evolução de carga (detalhe do exercício)
    cardio-new.tsx      5. Registro manual de cardio (modal)
    race-new.tsx        Nova prova (modal)
    quick-add.tsx       Sheet do botão central "+"
  components/           tab bar, cards, gráficos de barra, primitivas de UI
  data/
    repo.ts             ÚNICO ponto de acesso a dados das telas
    hooks.ts            useLiveQuery (revalida em foco + após escritas)
  db/                   schema SQLite, seed, tipos
  theme/tokens.ts       tokens do design (cores, fontes, radius, espaçamento)
  utils/format.ts       pace, durações, datas e números pt-BR
supabase/
  migrations/0001_schema.sql   schema Postgres equivalente (com RLS)
```

## Derivados (calculados, nunca armazenados)

- **PR por exercício** — máxima histórica; badge PR em sessões que superam todas as anteriores.
- **Delta de carga** — última sessão vs. anterior (`▲ +5` / `= 0`).
- **Volume semanal** — km por modalidade + treinos/dia (gráfico de barras, dias futuros dashed).
- **Pace/velocidade** — corrida min/km · natação min/100m · pedal km/h, recalculado a cada edição.

## Supabase (banco na nuvem) — CONECTADO

Projeto: `bitmlpjavxgumxacrykh` (App De acompanhamento Triatleta, ca-central-1). Schema aplicado com RLS por usuário; config no `.env` (gitignorado).

**Modelo offline-first**: o app lê e grava sempre no SQLite local (instantâneo, funciona sem rede). Um motor de sync (`src/data/sync.ts`) envia as mudanças ao Supabase em background — a cada escrita (debounce 2,5s) e ao voltar ao primeiro plano. Deleções viram tombstones. Se o banco local está vazio e a nuvem tem dados (ex. reinstalação), o app restaura tudo da nuvem; se ambos estão vazios, popula o demo local e sobe para a nuvem.

**Login**: no primeiro uso o app pede e-mail + senha à sua escolha — a conta é criada na hora (confirmação de e-mail desabilitada no projeto, decisão consciente para app pessoal; dados protegidos por RLS). A sessão fica persistida; não pede login de novo.

**Diagnóstico**: `node scripts/verify-supabase.mjs` roda um teste de ponta a ponta (signup, CRUD com RLS, isolamento anônimo) usando o mesmo `.env` do app.

## Versão web (PWA) — uso no iPhone sem App Store

O app também roda como web app (React Native Web + expo-router static): deploy na Vercel e "Adicionar à Tela de Início" no Safari — ícone próprio, tela cheia, aparência nativa.

**Arquitetura por plataforma** (resolução `.web.ts` do Metro; as telas não mudam):
- **Nativo**: SQLite local + sync em background (offline-first);
- **Web**: `repo.web.ts` fala **direto com o Supabase** (requer internet; sem SQLite). `data-provider.web` e `sync.web` substituem o provider e o sync; o bootstrap web popula o demo na primeira conta vazia.

**Build web**: `npx expo export --platform web` → `dist/` (estático). O `vercel.json` já configura build e rewrites; os `EXPO_PUBLIC_*` do `.env` precisam existir no ambiente de build (na Vercel: Project Settings → Environment Variables).

**PWA**: `src/app/+html.tsx` (metas iOS), `public/manifest.json` e ícones gerados por `node scripts/make-icons.mjs`.
