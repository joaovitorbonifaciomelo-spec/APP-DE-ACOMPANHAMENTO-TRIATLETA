import type { SQLiteDatabase } from 'expo-sqlite';

import { daysAgoISO } from '@/utils/format';
import {
  SEED_CARDIO, SEED_EXERCISES, SEED_RACES, SEED_TEMPLATES, SEED_WORKOUTS,
} from './seed-data';

/** Popula o SQLite local com os dados de demonstração (nativo). */
export async function seed(db: SQLiteDatabase): Promise<void> {
  const count = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM exercises');
  if ((count?.n ?? 0) > 0) return;

  const exId: Record<string, number> = {};
  for (const [name, group] of SEED_EXERCISES) {
    const r = await db.runAsync('INSERT INTO exercises (name, muscle_group) VALUES (?, ?)', name, group);
    exId[name] = Number(r.lastInsertRowId);
  }

  const tplId: Record<string, number> = {};
  for (const tpl of SEED_TEMPLATES) {
    const r = await db.runAsync('INSERT INTO workout_templates (name) VALUES (?)', tpl.name);
    tplId[tpl.name] = Number(r.lastInsertRowId);
    for (let i = 0; i < tpl.exercises.length; i++) {
      const [name, targetSets] = tpl.exercises[i];
      await db.runAsync(
        'INSERT INTO template_exercises (template_id, exercise_id, position, target_sets) VALUES (?, ?, ?, ?)',
        tplId[tpl.name], exId[name], i, targetSets,
      );
    }
  }

  for (const w of SEED_WORKOUTS) {
    const wr = await db.runAsync(
      "INSERT INTO strength_workouts (template_id, name, date, duration_sec, status) VALUES (?, ?, ?, ?, 'done')",
      tplId[w.template], w.template, daysAgoISO(w.daysAgo), w.duration,
    );
    const workoutId = Number(wr.lastInsertRowId);
    for (let li = 0; li < w.logs.length; li++) {
      const log = w.logs[li];
      const lr = await db.runAsync(
        'INSERT INTO exercise_logs (workout_id, exercise_id, position) VALUES (?, ?, ?)',
        workoutId, exId[log.name], li,
      );
      for (let si = 0; si < log.sets.length; si++) {
        const [weight, reps] = log.sets[si];
        await db.runAsync(
          'INSERT INTO sets (log_id, set_index, weight, reps, done) VALUES (?, ?, ?, ?, 1)',
          Number(lr.lastInsertRowId), si, weight, reps,
        );
      }
    }
  }

  for (const [sport, title, ago, dist, dur] of SEED_CARDIO) {
    await db.runAsync(
      'INSERT INTO cardio_activities (sport, title, date, distance_m, duration_sec) VALUES (?, ?, ?, ?, ?)',
      sport, title, daysAgoISO(ago), dist, dur,
    );
  }

  for (const race of SEED_RACES) {
    await db.runAsync(
      'INSERT INTO races (name, date, location, start_time, segments, goal_sec, result_sec, splits, is_pr) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      race.name, race.date, race.location ?? '', race.start_time ?? '',
      JSON.stringify(race.segments), race.goal_sec ?? null, race.result_sec ?? null,
      JSON.stringify(race.splits ?? []), race.is_pr ? 1 : 0,
    );
  }
}
