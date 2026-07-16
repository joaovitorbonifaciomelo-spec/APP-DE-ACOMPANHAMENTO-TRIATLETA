import type { SQLiteDatabase } from 'expo-sqlite';

/** Web: não há SQLite — o repo.web ignora o handle. */
export function useDb(): SQLiteDatabase {
  return null as unknown as SQLiteDatabase;
}
