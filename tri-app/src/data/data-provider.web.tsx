import React from 'react';

/** Web: sem SQLite — o repo.web fala direto com o Supabase. */
export function DataProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
