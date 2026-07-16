# App de Acompanhamento — Triatleta

App pessoal de acompanhamento de treinos: força na academia (peso × séries × reps com evolução de carga e PRs), cardio manual (corrida/pedal/natação com pace automático) e provas com countdown e resultados.

➡️ **O app está em [`tri-app/`](tri-app/)** — veja o [README do projeto](tri-app/README.md) para rodar, arquitetura e deploy.

- **Stack**: Expo SDK 57 (React Native + React Native Web), expo-router, TypeScript
- **Dados**: Supabase (Postgres + Auth + RLS); nativo usa SQLite local com sync offline-first, web fala direto com o Supabase
- **Web/PWA**: deploy estático (Vercel) — "Adicionar à Tela de Início" no iPhone
