/**
 * Sincronização offline-first com o Supabase.
 *
 * Modelo: o SQLite local é a fonte de leitura/escrita do app (instantâneo,
 * funciona sem rede). Cada linha tem `remote_id` (id no Postgres) e `dirty`
 * (pendente de envio). Push envia dirty em ordem pai → filho; deleções locais
 * viram tombstones processados no push. Pull completo só no restore (banco
 * local vazio com dados na nuvem, ex. reinstalação).
 */

import type { SQLiteDatabase } from 'expo-sqlite';

import { SYNCED_TABLES, type SyncedTable } from '@/db/schema';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';
import { notifyDataChanged } from './repo';

// ---------------------------------------------------------------------------
// Mapeamento local <-> remoto por tabela
// ---------------------------------------------------------------------------

type Row = Record<string, any>;

/** id remoto de uma linha local (null se ainda não sincronizada) */
async function remoteIdOf(db: SQLiteDatabase, table: SyncedTable, localId: number | null): Promise<number | null> {
  if (localId == null) return null;
  const r = await db.getFirstAsync<{ remote_id: number | null }>(
    `SELECT remote_id FROM ${table} WHERE id = ?`, localId,
  );
  return r?.remote_id ?? null;
}

/** monta o payload remoto; retorna null se algum pai ainda não tem remote_id */
async function toRemote(db: SQLiteDatabase, table: SyncedTable, row: Row): Promise<Row | null> {
  switch (table) {
    case 'exercises':
      return { name: row.name, muscle_group: row.muscle_group };
    case 'workout_templates':
      return { name: row.name };
    case 'template_exercises': {
      const template_id = await remoteIdOf(db, 'workout_templates', row.template_id);
      const exercise_id = await remoteIdOf(db, 'exercises', row.exercise_id);
      if (template_id == null || exercise_id == null) return null;
      return { template_id, exercise_id, position: row.position, target_sets: row.target_sets };
    }
    case 'strength_workouts': {
      const template_id = row.template_id != null ? await remoteIdOf(db, 'workout_templates', row.template_id) : null;
      return {
        template_id,
        name: row.name,
        date: row.date,
        started_at: row.started_at != null ? new Date(row.started_at).toISOString() : null,
        duration_sec: row.duration_sec,
        status: row.status,
      };
    }
    case 'exercise_logs': {
      const workout_id = await remoteIdOf(db, 'strength_workouts', row.workout_id);
      const exercise_id = await remoteIdOf(db, 'exercises', row.exercise_id);
      if (workout_id == null || exercise_id == null) return null;
      return { workout_id, exercise_id, position: row.position };
    }
    case 'sets': {
      const log_id = await remoteIdOf(db, 'exercise_logs', row.log_id);
      if (log_id == null) return null;
      return { log_id, set_index: row.set_index, weight: row.weight, reps: row.reps, done: !!row.done };
    }
    case 'cardio_activities':
      return {
        sport: row.sport, title: row.title, date: row.date,
        distance_m: row.distance_m, duration_sec: row.duration_sec, notes: row.notes,
      };
    case 'races':
      return {
        name: row.name, date: row.date, location: row.location, start_time: row.start_time,
        segments: JSON.parse(row.segments || '[]'),
        goal_sec: row.goal_sec, result_sec: row.result_sec,
        splits: JSON.parse(row.splits || '[]'),
        is_pr: !!row.is_pr,
      };
  }
}

/** converte linha remota em valores locais (sem id) — inverso de toRemote */
function toLocal(table: SyncedTable, row: Row, maps: IdMaps): Row | null {
  switch (table) {
    case 'exercises':
      return { name: row.name, muscle_group: row.muscle_group ?? '' };
    case 'workout_templates':
      return { name: row.name };
    case 'template_exercises': {
      const template_id = maps.workout_templates.get(row.template_id);
      const exercise_id = maps.exercises.get(row.exercise_id);
      if (template_id == null || exercise_id == null) return null;
      return { template_id, exercise_id, position: row.position, target_sets: row.target_sets };
    }
    case 'strength_workouts':
      return {
        template_id: row.template_id != null ? maps.workout_templates.get(row.template_id) ?? null : null,
        name: row.name,
        date: row.date,
        started_at: row.started_at ? new Date(row.started_at).getTime() : null,
        duration_sec: row.duration_sec,
        status: row.status,
      };
    case 'exercise_logs': {
      const workout_id = maps.strength_workouts.get(row.workout_id);
      const exercise_id = maps.exercises.get(row.exercise_id);
      if (workout_id == null || exercise_id == null) return null;
      return { workout_id, exercise_id, position: row.position };
    }
    case 'sets': {
      const log_id = maps.exercise_logs.get(row.log_id);
      if (log_id == null) return null;
      return { log_id, set_index: row.set_index, weight: row.weight, reps: row.reps, done: row.done ? 1 : 0 };
    }
    case 'cardio_activities':
      return {
        sport: row.sport, title: row.title ?? '', date: row.date,
        distance_m: row.distance_m, duration_sec: row.duration_sec, notes: row.notes ?? '',
      };
    case 'races':
      return {
        name: row.name, date: row.date, location: row.location ?? '', start_time: row.start_time ?? '',
        segments: JSON.stringify(row.segments ?? []),
        goal_sec: row.goal_sec, result_sec: row.result_sec,
        splits: JSON.stringify(row.splits ?? []),
        is_pr: row.is_pr ? 1 : 0,
      };
  }
}

type IdMaps = Record<SyncedTable, Map<number, number>>;

// ---------------------------------------------------------------------------
// Push: envia dirty + tombstones
// ---------------------------------------------------------------------------

async function pushAll(db: SQLiteDatabase): Promise<void> {
  const supabase = getSupabase();

  // inserts/updates em ordem pai -> filho
  // (antes das deleções: ex. treinos precisam soltar template_id=null
  //  antes de o template ser apagado, senão o FK remoto barra)
  for (const table of SYNCED_TABLES) {
    const dirtyRows = await db.getAllAsync<Row>(`SELECT * FROM ${table} WHERE dirty = 1 ORDER BY id`);
    if (dirtyRows.length === 0) continue;

    const inserts: { localId: number; payload: Row }[] = [];
    for (const row of dirtyRows) {
      const payload = await toRemote(db, table, row);
      if (payload == null) continue; // pai ainda não sincronizado; tenta no próximo push
      if (row.remote_id == null) {
        inserts.push({ localId: row.id, payload });
      } else {
        const { error } = await supabase.from(table).update(payload).eq('id', row.remote_id);
        if (error) throw error;
        await db.runAsync(`UPDATE ${table} SET dirty = 0 WHERE id = ?`, row.id);
      }
    }

    // inserts em lote; a resposta preserva a ordem de inserção
    for (let i = 0; i < inserts.length; i += 100) {
      const chunk = inserts.slice(i, i + 100);
      const { data, error } = await supabase
        .from(table)
        .insert(chunk.map((c) => c.payload))
        .select('id');
      if (error) throw error;
      for (let j = 0; j < chunk.length; j++) {
        await db.runAsync(
          `UPDATE ${table} SET remote_id = ?, dirty = 0 WHERE id = ?`,
          (data as { id: number }[])[j].id, chunk[j].localId,
        );
      }
    }
  }

  // deleções por último, em ordem filho -> pai (cascades remotos cuidam do resto)
  const tombstones = await db.getAllAsync<{ id: number; table_name: string; remote_id: number }>(
    'SELECT * FROM tombstones',
  );
  const order = [...SYNCED_TABLES].reverse();
  for (const table of order) {
    const ids = tombstones.filter((t) => t.table_name === table).map((t) => t.remote_id);
    if (ids.length === 0) continue;
    const { error } = await supabase.from(table).delete().in('id', ids);
    if (error) throw error;
    await db.runAsync(
      `DELETE FROM tombstones WHERE table_name = ? AND remote_id IN (${ids.map(() => '?').join(',')})`,
      table, ...ids,
    );
  }
}

// ---------------------------------------------------------------------------
// Pull: restore completo quando o banco local está vazio
// ---------------------------------------------------------------------------

async function pullAll(db: SQLiteDatabase): Promise<number> {
  const supabase = getSupabase();
  const maps = Object.fromEntries(SYNCED_TABLES.map((t) => [t, new Map()])) as IdMaps;
  let total = 0;

  for (const table of SYNCED_TABLES) {
    const { data, error } = await supabase.from(table).select('*').order('id');
    if (error) throw error;
    for (const remoteRow of data as Row[]) {
      const local = toLocal(table, remoteRow, maps);
      if (local == null) continue;
      const cols = Object.keys(local);
      const r = await db.runAsync(
        `INSERT INTO ${table} (${cols.join(',')}, remote_id, dirty) VALUES (${cols.map(() => '?').join(',')}, ?, 0)`,
        ...cols.map((c) => local[c]),
        remoteRow.id,
      );
      maps[table].set(remoteRow.id, Number(r.lastInsertRowId));
      total++;
    }
  }
  return total;
}

// ---------------------------------------------------------------------------
// Bootstrap + agendamento
// ---------------------------------------------------------------------------

async function localIsEmpty(db: SQLiteDatabase): Promise<boolean> {
  for (const table of ['exercises', 'cardio_activities', 'races'] as const) {
    const r = await db.getFirstAsync<{ n: number }>(`SELECT COUNT(*) AS n FROM ${table}`);
    if ((r?.n ?? 0) > 0) return false;
  }
  return true;
}

/**
 * Primeira carga: com Supabase logado e banco local vazio, restaura da nuvem
 * (ex. reinstalação). Sem dados na nuvem, o app começa vazio.
 */
export async function bootstrapData(db: SQLiteDatabase, hasSession: boolean): Promise<void> {
  const empty = await localIsEmpty(db);
  if (!empty) return;

  if (isSupabaseConfigured && hasSession) {
    try {
      const pulled = await pullAll(db);
      if (pulled > 0) notifyDataChanged();
    } catch (e) {
      console.warn('[sync] restore falhou:', e);
    }
  }
}

let timer: ReturnType<typeof setTimeout> | null = null;
let running = false;
let rerun = false;

/** agenda um push com debounce; seguro chamar a cada escrita */
export function kickSync(db: SQLiteDatabase, delayMs = 2500): void {
  if (!isSupabaseConfigured) return;
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => runPush(db), delayMs);
}

async function runPush(db: SQLiteDatabase): Promise<void> {
  if (running) { rerun = true; return; }
  running = true;
  try {
    const { data } = await getSupabase().auth.getSession();
    if (data.session) await pushAll(db);
  } catch (e) {
    // offline/erro transitório: dirty continua marcado, próximo kick reenvia
    console.warn('[sync] push adiado:', e instanceof Error ? e.message : e);
  } finally {
    running = false;
    if (rerun) { rerun = false; kickSync(db, 500); }
  }
}
