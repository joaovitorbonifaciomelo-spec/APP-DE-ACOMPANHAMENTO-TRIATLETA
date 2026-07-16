/**
 * Web: não há SQLite nem sync — o repo.web fala direto com o Supabase.
 * O bootstrap apenas popula os dados de demonstração na primeira conta vazia.
 */

import type { SQLiteDatabase } from 'expo-sqlite';

import {
  SEED_CARDIO, SEED_EXERCISES, SEED_RACES, SEED_TEMPLATES, SEED_WORKOUTS,
} from '@/db/seed-data';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';
import { daysAgoISO } from '@/utils/format';
import { notifyDataChanged } from './events';

export async function bootstrapData(_db: SQLiteDatabase, hasSession: boolean): Promise<void> {
  if (!isSupabaseConfigured || !hasSession) return;
  try {
    const supa = getSupabase();
    const { count, error } = await supa.from('exercises').select('id', { count: 'exact', head: true });
    if (error) throw error;
    if ((count ?? 0) > 0) return;
    await seedSupabase();
    notifyDataChanged();
  } catch (e) {
    console.warn('[bootstrap] seed falhou:', e);
  }
}

/** web: escritas já vão direto ao Supabase — nada a sincronizar */
export function kickSync(_db: SQLiteDatabase, _delayMs?: number): void {}

async function seedSupabase(): Promise<void> {
  const supa = getSupabase();

  const { data: exRows, error: exErr } = await supa
    .from('exercises')
    .insert(SEED_EXERCISES.map(([name, muscle_group]) => ({ name, muscle_group })))
    .select('id,name');
  if (exErr) throw exErr;
  const exId = new Map((exRows as { id: number; name: string }[]).map((e) => [e.name, e.id]));

  const tplId = new Map<string, number>();
  for (const tpl of SEED_TEMPLATES) {
    const { data: t, error } = await supa.from('workout_templates').insert({ name: tpl.name }).select('id').single();
    if (error) throw error;
    tplId.set(tpl.name, t.id);
    const { error: teErr } = await supa.from('template_exercises').insert(
      tpl.exercises.map(([name, target_sets], position) => ({
        template_id: t.id,
        exercise_id: exId.get(name)!,
        position,
        target_sets,
      })),
    );
    if (teErr) throw teErr;
  }

  for (const w of SEED_WORKOUTS) {
    const { data: workout, error } = await supa
      .from('strength_workouts')
      .insert({
        template_id: tplId.get(w.template) ?? null,
        name: w.template,
        date: daysAgoISO(w.daysAgo),
        duration_sec: w.duration,
        status: 'done',
      })
      .select('id')
      .single();
    if (error) throw error;

    for (let li = 0; li < w.logs.length; li++) {
      const log = w.logs[li];
      const { data: logRow, error: lErr } = await supa
        .from('exercise_logs')
        .insert({ workout_id: workout.id, exercise_id: exId.get(log.name)!, position: li })
        .select('id')
        .single();
      if (lErr) throw lErr;
      const { error: sErr } = await supa.from('sets').insert(
        log.sets.map(([weight, reps], set_index) => ({
          log_id: logRow.id, set_index, weight, reps, done: true,
        })),
      );
      if (sErr) throw sErr;
    }
  }

  const { error: cErr } = await supa.from('cardio_activities').insert(
    SEED_CARDIO.map(([sport, title, ago, distance_m, duration_sec]) => ({
      sport, title, date: daysAgoISO(ago as number), distance_m, duration_sec,
    })),
  );
  if (cErr) throw cErr;

  const { error: rErr } = await supa.from('races').insert(
    SEED_RACES.map((r) => ({
      name: r.name,
      date: r.date,
      location: r.location ?? '',
      start_time: r.start_time ?? '',
      segments: r.segments,
      goal_sec: r.goal_sec ?? null,
      result_sec: r.result_sec ?? null,
      splits: r.splits ?? [],
      is_pr: r.is_pr ?? false,
    })),
  );
  if (rErr) throw rErr;
}
