/**
 * Web: não há SQLite nem sync — o repo.web fala direto com o Supabase.
 * Sem seed de demonstração: o app começa vazio (estados vazios do design).
 */

import type { SQLiteDatabase } from 'expo-sqlite';

export async function bootstrapData(_db: SQLiteDatabase, _hasSession: boolean): Promise<void> {
  // nada a preparar na web
}

/** web: escritas já vão direto ao Supabase — nada a sincronizar */
export function kickSync(_db: SQLiteDatabase, _delayMs?: number): void {}
