import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { SQLiteDatabase } from 'expo-sqlite';

import { useDb } from './db-context';
import { subscribeData } from './repo';

/**
 * Executa uma query assíncrona e re-executa quando:
 * - a tela ganha foco;
 * - qualquer escrita notifica via notifyDataChanged();
 * - as deps mudam.
 */
export function useLiveQuery<T>(
  query: (db: SQLiteDatabase) => Promise<T>,
  deps: unknown[] = [],
): { data: T | undefined; reload: () => void } {
  const db = useDb();
  const [data, setData] = useState<T | undefined>(undefined);
  const queryRef = useRef(query);
  queryRef.current = query;
  const [tick, setTick] = useState(0);

  const reload = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => subscribeData(reload), [reload]);
  useFocusEffect(useCallback(() => { reload(); }, [reload]));

  useEffect(() => {
    let alive = true;
    queryRef.current(db).then((result) => {
      if (alive) setData(result);
    });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, tick, ...deps]);

  return { data, reload };
}
