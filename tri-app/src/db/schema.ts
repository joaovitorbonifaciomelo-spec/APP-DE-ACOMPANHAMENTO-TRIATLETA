import type { SQLiteDatabase } from 'expo-sqlite';

const SCHEMA_VERSION = 2;

/** tabelas espelhadas no Supabase (ordem respeita dependências pai → filho) */
export const SYNCED_TABLES = [
  'exercises',
  'workout_templates',
  'template_exercises',
  'strength_workouts',
  'exercise_logs',
  'sets',
  'cardio_activities',
  'races',
] as const;

export type SyncedTable = (typeof SYNCED_TABLES)[number];

export async function migrateDbIfNeeded(db: SQLiteDatabase): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let current = row?.user_version ?? 0;
  if (current >= SCHEMA_VERSION) return;

  if (current < 1) {
    await db.execAsync(`
      PRAGMA journal_mode = 'wal';

      CREATE TABLE IF NOT EXISTS exercises (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        muscle_group TEXT NOT NULL DEFAULT ''
      );

      CREATE TABLE IF NOT EXISTS workout_templates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS template_exercises (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        template_id INTEGER NOT NULL REFERENCES workout_templates(id) ON DELETE CASCADE,
        exercise_id INTEGER NOT NULL REFERENCES exercises(id),
        position INTEGER NOT NULL,
        target_sets INTEGER NOT NULL DEFAULT 3
      );

      CREATE TABLE IF NOT EXISTS strength_workouts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        template_id INTEGER REFERENCES workout_templates(id),
        name TEXT NOT NULL,
        date TEXT NOT NULL,
        started_at INTEGER,
        duration_sec INTEGER,
        status TEXT NOT NULL DEFAULT 'done'
      );

      CREATE TABLE IF NOT EXISTS exercise_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        workout_id INTEGER NOT NULL REFERENCES strength_workouts(id) ON DELETE CASCADE,
        exercise_id INTEGER NOT NULL REFERENCES exercises(id),
        position INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS sets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        log_id INTEGER NOT NULL REFERENCES exercise_logs(id) ON DELETE CASCADE,
        set_index INTEGER NOT NULL,
        weight REAL,
        reps INTEGER,
        done INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS cardio_activities (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sport TEXT NOT NULL,
        title TEXT NOT NULL DEFAULT '',
        date TEXT NOT NULL,
        distance_m REAL NOT NULL,
        duration_sec INTEGER NOT NULL,
        notes TEXT NOT NULL DEFAULT ''
      );

      CREATE TABLE IF NOT EXISTS races (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        date TEXT NOT NULL,
        location TEXT NOT NULL DEFAULT '',
        start_time TEXT NOT NULL DEFAULT '',
        segments TEXT NOT NULL DEFAULT '[]',
        goal_sec INTEGER,
        result_sec INTEGER,
        splits TEXT NOT NULL DEFAULT '[]',
        is_pr INTEGER NOT NULL DEFAULT 0
      );

      CREATE INDEX IF NOT EXISTS idx_logs_workout ON exercise_logs(workout_id);
      CREATE INDEX IF NOT EXISTS idx_logs_exercise ON exercise_logs(exercise_id);
      CREATE INDEX IF NOT EXISTS idx_sets_log ON sets(log_id);
      CREATE INDEX IF NOT EXISTS idx_cardio_date ON cardio_activities(date);
      CREATE INDEX IF NOT EXISTS idx_workouts_date ON strength_workouts(date);
    `);
    current = 1;
  }

  if (current < 2) {
    // colunas de sincronização com o Supabase:
    // remote_id = id da linha no Postgres; dirty = pendente de envio
    for (const table of SYNCED_TABLES) {
      await db.execAsync(`
        ALTER TABLE ${table} ADD COLUMN remote_id INTEGER;
        ALTER TABLE ${table} ADD COLUMN dirty INTEGER NOT NULL DEFAULT 1;
      `);
    }
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS tombstones (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        table_name TEXT NOT NULL,
        remote_id INTEGER NOT NULL
      );
    `);
    current = 2;
  }

  await db.execAsync(`PRAGMA user_version = ${SCHEMA_VERSION}`);
}
