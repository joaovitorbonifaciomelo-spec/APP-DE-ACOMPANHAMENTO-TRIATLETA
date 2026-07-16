import { SQLiteProvider } from 'expo-sqlite';
import React from 'react';

import { migrateDbIfNeeded } from '@/db/schema';

/** Nativo: abre o SQLite e roda migrações antes de renderizar. */
export function DataProvider({ children }: { children: React.ReactNode }) {
  return (
    <SQLiteProvider databaseName="triapp.db" onInit={migrateDbIfNeeded}>
      {children}
    </SQLiteProvider>
  );
}
