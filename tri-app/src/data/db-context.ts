/**
 * Handle de banco por plataforma.
 * Nativo: contexto do expo-sqlite. Web (db-context.web.ts): dummy — o repo
 * web fala direto com o Supabase e ignora o handle.
 */
export { useSQLiteContext as useDb } from 'expo-sqlite';
