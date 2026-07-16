/**
 * Repositório de dados — variante WEB: fala direto com o Supabase (sem SQLite).
 * Mesma interface pública do repo.ts nativo; o handle `db` é ignorado.
 * RLS garante que só as linhas do usuário logado são visíveis.
 */

import type { SQLiteDatabase } from 'expo-sqlite';

import type { CardioActivity, Exercise, Race, RaceSegment, Sport, WorkoutTemplate } from '@/db/types';
import { getSupabase } from '@/lib/supabase';
import { mondayOf, toISODate } from '@/utils/format';
import { notifyDataChanged, subscribeData as subscribeDataInternal } from './events';

export { notifyDataChanged, subscribeData } from './events';

type DB = SQLiteDatabase; // ignorado na web
type Row = Record<string, any>;

function supa() {
  return getSupabase();
}

async function selectAll(table: string): Promise<Row[]> {
  const { data, error } = await supa().from(table).select('*').order('id');
  if (error) throw error;
  return data as Row[];
}

// ---------------------------------------------------------------------------
// Grafo de força (tabelas pequenas; junta em JS, espelhando a lógica nativa)
// ---------------------------------------------------------------------------

interface StrengthGraph {
  exercises: Row[];
  workouts: Row[]; // ordenados por date, id
  logs: Row[];
  sets: Row[]; // ordenados por set_index
}

// cache curto: evita rajadas de 4 fetches por consulta ao navegar entre telas
const GRAPH_TTL_MS = 10_000;
let graphCache: { at: number; promise: Promise<StrengthGraph> } | null = null;

function clearGraphCache(): void {
  graphCache = null;
}

subscribeDataInternal(clearGraphCache);

async function fetchStrengthGraph(): Promise<StrengthGraph> {
  if (graphCache && Date.now() - graphCache.at < GRAPH_TTL_MS) return graphCache.promise;
  const promise = (async () => {
    const [exercises, workouts, logs, sets] = await Promise.all([
      selectAll('exercises'),
      selectAll('strength_workouts'),
      selectAll('exercise_logs'),
      selectAll('sets'),
    ]);
    workouts.sort((a, b) => String(a.date).localeCompare(String(b.date)) || a.id - b.id);
    sets.sort((a, b) => a.set_index - b.set_index);
    return { exercises, workouts, logs, sets };
  })();
  graphCache = { at: Date.now(), promise };
  promise.catch(clearGraphCache);
  return promise;
}

const doneSetsOf = (g: StrengthGraph, logId: number) =>
  g.sets.filter((s) => s.log_id === logId && s.done && s.weight != null);

/** sessões concluídas de um exercício, em ordem cronológica */
function sessionsOf(g: StrengthGraph, exerciseId: number) {
  const result: { workout: Row; log: Row; sets: Row[] }[] = [];
  for (const w of g.workouts) {
    if (w.status !== 'done') continue;
    for (const log of g.logs.filter((l) => l.workout_id === w.id && l.exercise_id === exerciseId)) {
      const sets = doneSetsOf(g, log.id);
      if (sets.length > 0) result.push({ workout: w, log, sets });
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

export interface WeekSummary {
  workoutsCount: number;
  runKm: number;
  bikeKm: number;
  swimKm: number;
  dayMinutes: number[];
  todayIndex: number;
}

export async function getWeekSummary(_db: DB): Promise<WeekSummary> {
  const monday = mondayOf(new Date());
  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);
  const from = toISODate(monday);
  const to = toISODate(sunday);

  const [cardioRes, strengthRes] = await Promise.all([
    supa().from('cardio_activities').select('sport,date,distance_m,duration_sec').gte('date', from).lte('date', to),
    supa().from('strength_workouts').select('date,duration_sec').eq('status', 'done').gte('date', from).lte('date', to),
  ]);
  if (cardioRes.error) throw cardioRes.error;
  if (strengthRes.error) throw strengthRes.error;

  const dayMinutes = [0, 0, 0, 0, 0, 0, 0];
  const dayIndex = (iso: string) => {
    const [y, m, d] = iso.split('-').map(Number);
    return (new Date(y, m - 1, d, 12).getDay() + 6) % 7;
  };

  let runKm = 0; let bikeKm = 0; let swimKm = 0;
  for (const a of cardioRes.data as Row[]) {
    if (a.sport === 'run') runKm += a.distance_m / 1000;
    else if (a.sport === 'bike') bikeKm += a.distance_m / 1000;
    else if (a.sport === 'swim') swimKm += a.distance_m / 1000;
    dayMinutes[dayIndex(a.date)] += a.duration_sec / 60;
  }
  for (const w of strengthRes.data as Row[]) dayMinutes[dayIndex(w.date)] += (w.duration_sec ?? 3000) / 60;

  return {
    workoutsCount: cardioRes.data.length + strengthRes.data.length,
    runKm, bikeKm, swimKm,
    dayMinutes,
    todayIndex: (new Date().getDay() + 6) % 7,
  };
}

export interface ExerciseProgress {
  exerciseId: number;
  name: string;
  muscleGroup: string;
  currentMax: number;
  delta: number | null;
  lastScheme: string;
  spark: number[];
}

export async function getExerciseProgress(_db: DB, limit?: number): Promise<ExerciseProgress[]> {
  const g = await fetchStrengthGraph();
  const result: (ExerciseProgress & { lastDate: string })[] = [];

  for (const e of g.exercises) {
    const sessions = sessionsOf(g, e.id);
    if (sessions.length === 0) continue;
    const maxes = sessions.map((s) => Math.max(...s.sets.map((x) => x.weight)));
    const last = sessions[sessions.length - 1];
    result.push({
      exerciseId: e.id,
      name: e.name,
      muscleGroup: e.muscle_group,
      currentMax: maxes[maxes.length - 1],
      delta: maxes.length > 1 ? maxes[maxes.length - 1] - maxes[maxes.length - 2] : null,
      lastScheme: `${last.sets.length}×${last.sets[0]?.reps ?? '—'}`,
      spark: maxes.slice(-6),
      lastDate: last.workout.date,
    });
  }
  result.sort((a, b) => b.lastDate.localeCompare(a.lastDate));
  return (limit ? result.slice(0, limit) : result).map(({ lastDate: _l, ...rest }) => rest);
}

export async function getRecentCardio(_db: DB, limit = 3): Promise<CardioActivity[]> {
  const { data, error } = await supa()
    .from('cardio_activities').select('*')
    .order('date', { ascending: false }).order('id', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data as CardioActivity[];
}

// ---------------------------------------------------------------------------
// Cardio
// ---------------------------------------------------------------------------

export type SportFilter = Sport | 'all';

export async function listCardio(_db: DB, filter: SportFilter): Promise<CardioActivity[]> {
  let q = supa().from('cardio_activities').select('*')
    .order('date', { ascending: false }).order('id', { ascending: false });
  if (filter !== 'all') q = q.eq('sport', filter);
  const { data, error } = await q;
  if (error) throw error;
  return data as CardioActivity[];
}

export async function addCardio(
  _db: DB,
  a: { sport: Sport; title: string; date: string; distance_m: number; duration_sec: number; notes: string },
): Promise<void> {
  const { error } = await supa().from('cardio_activities').insert(a);
  if (error) throw error;
  notifyDataChanged();
}

// ---------------------------------------------------------------------------
// Evolução de carga
// ---------------------------------------------------------------------------

export interface ExerciseSession {
  workoutId: number;
  date: string;
  weights: number[];
  scheme: string;
  maxWeight: number;
  isPR: boolean;
}

export interface ExerciseDetail {
  exercise: Exercise;
  sessions: ExerciseSession[];
  currentMax: number;
  allTimePR: number;
  pctChange8w: number | null;
}

export async function getExerciseDetail(_db: DB, exerciseId: number): Promise<ExerciseDetail | null> {
  const g = await fetchStrengthGraph();
  const exercise = g.exercises.find((e) => e.id === exerciseId) as Exercise | undefined;
  if (!exercise) return null;

  const sessions: ExerciseSession[] = [];
  let runningPR = 0;
  for (const s of sessionsOf(g, exerciseId)) {
    const weights = s.sets.map((x) => x.weight as number);
    const maxWeight = Math.max(...weights);
    sessions.push({
      workoutId: s.workout.id,
      date: s.workout.date,
      weights,
      scheme: `${s.sets.length}×${s.sets[0]?.reps ?? '—'}`,
      maxWeight,
      isPR: maxWeight > runningPR,
    });
    runningPR = Math.max(runningPR, maxWeight);
  }

  if (sessions.length === 0) {
    return { exercise, sessions, currentMax: 0, allTimePR: 0, pctChange8w: null };
  }

  const eightWeeksAgo = new Date();
  eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);
  const windowSessions = sessions.filter((s) => s.date >= toISODate(eightWeeksAgo));
  const first = windowSessions[0];
  const last = windowSessions[windowSessions.length - 1];
  const pctChange8w =
    windowSessions.length > 1 && first.maxWeight > 0
      ? ((last.maxWeight - first.maxWeight) / first.maxWeight) * 100
      : null;

  return {
    exercise,
    sessions,
    currentMax: sessions[sessions.length - 1].maxWeight,
    allTimePR: Math.max(...sessions.map((s) => s.maxWeight)),
    pctChange8w,
  };
}

// ---------------------------------------------------------------------------
// Treino de força
// ---------------------------------------------------------------------------

export interface ActiveSet {
  id: number;
  setIndex: number;
  weight: number | null;
  reps: number | null;
  done: boolean;
  previous: string | null;
}

export interface ActiveExercise {
  logId: number;
  exerciseId: number;
  name: string;
  position: number;
  sets: ActiveSet[];
  previousSummary: string | null;
  previousMax: number | null;
}

export interface ActiveWorkout {
  id: number;
  name: string;
  startedAt: number;
  exercises: ActiveExercise[];
}

export interface TemplateSummary extends WorkoutTemplate {
  exerciseNames: string[];
}

function fmtWeight(w: number): string {
  return Number.isInteger(w) ? String(w) : String(w).replace('.', ',');
}

export interface TemplateItem {
  exerciseId: number;
  targetSets: number;
}

export async function addTemplate(_db: DB, name: string, items: TemplateItem[]): Promise<number> {
  const { data: tpl, error } = await supa().from('workout_templates').insert({ name }).select('id').single();
  if (error) throw error;
  if (items.length > 0) {
    const { error: teErr } = await supa().from('template_exercises').insert(
      items.map((item, position) => ({
        template_id: tpl.id,
        exercise_id: item.exerciseId,
        position,
        target_sets: item.targetSets,
      })),
    );
    if (teErr) throw teErr;
  }
  notifyDataChanged();
  return tpl.id;
}

export async function listTemplates(_db: DB): Promise<TemplateSummary[]> {
  const [templates, tplExercises, exercises] = await Promise.all([
    selectAll('workout_templates'),
    selectAll('template_exercises'),
    selectAll('exercises'),
  ]);
  const nameOf = (id: number) => exercises.find((e) => e.id === id)?.name ?? '?';
  return templates
    .sort((a, b) => String(a.name).localeCompare(String(b.name)))
    .map((t) => ({
      id: t.id,
      name: t.name,
      exerciseNames: tplExercises
        .filter((te) => te.template_id === t.id)
        .sort((a, b) => a.position - b.position)
        .map((te) => nameOf(te.exercise_id)),
    }));
}

/** sets da última sessão concluída do exercício, exceto o treino atual */
function previousSetsFrom(g: StrengthGraph, exerciseId: number, excludeWorkoutId: number): Row[] {
  const sessions = sessionsOf(g, exerciseId).filter((s) => s.workout.id !== excludeWorkoutId);
  return sessions.length > 0 ? sessions[sessions.length - 1].sets : [];
}

export async function getActiveWorkout(_db: DB): Promise<ActiveWorkout | null> {
  const g = await fetchStrengthGraph();
  const active = [...g.workouts].reverse().find((w) => w.status === 'active');
  if (!active) return null;

  const logs = g.logs
    .filter((l) => l.workout_id === active.id)
    .sort((a, b) => a.position - b.position);

  const exercises: ActiveExercise[] = logs.map((log) => {
    const sets = g.sets.filter((s) => s.log_id === log.id);
    const prev = previousSetsFrom(g, log.exercise_id, active.id);
    const prevMax = prev.length ? Math.max(...prev.map((s) => s.weight ?? 0)) : null;
    const exercise = g.exercises.find((e) => e.id === log.exercise_id);
    return {
      logId: log.id,
      exerciseId: log.exercise_id,
      name: exercise?.name ?? '?',
      position: log.position,
      previousSummary: prevMax != null ? `${fmtWeight(prevMax)} kg · ${prev.length}×${prev[0]?.reps ?? '—'}` : null,
      previousMax: prevMax,
      sets: sets.map((s, i) => ({
        id: s.id,
        setIndex: s.set_index,
        weight: s.weight,
        reps: s.reps,
        done: !!s.done,
        previous: prev[i] ? `${fmtWeight(prev[i].weight ?? 0)}×${prev[i].reps ?? '—'}` : null,
      })),
    };
  });

  return {
    id: active.id,
    name: active.name,
    startedAt: active.started_at ? new Date(active.started_at).getTime() : Date.now(),
    exercises,
  };
}

export async function startWorkout(_db: DB, templateId: number): Promise<number> {
  const g = await fetchStrengthGraph();

  // nunca dois treinos ativos (protege contra toque duplo)
  const existing = [...g.workouts].reverse().find((w) => w.status === 'active');
  if (existing) return existing.id;

  const [tplRes, teRes] = await Promise.all([
    supa().from('workout_templates').select('*').eq('id', templateId).single(),
    supa().from('template_exercises').select('*').eq('template_id', templateId).order('position'),
  ]);
  if (tplRes.error) throw tplRes.error;
  if (teRes.error) throw teRes.error;

  const { data: workout, error: wErr } = await supa()
    .from('strength_workouts')
    .insert({
      template_id: templateId,
      name: tplRes.data.name,
      date: toISODate(new Date()),
      started_at: new Date().toISOString(),
      status: 'active',
    })
    .select('id')
    .single();
  if (wErr) throw wErr;

  for (const te of teRes.data as Row[]) {
    const { data: log, error: lErr } = await supa()
      .from('exercise_logs')
      .insert({ workout_id: workout.id, exercise_id: te.exercise_id, position: te.position })
      .select('id')
      .single();
    if (lErr) throw lErr;

    const prev = previousSetsFrom(g, te.exercise_id, workout.id);
    const nSets = Math.max(te.target_sets, 0) || prev.length || 3;
    const rows = Array.from({ length: nSets }, (_, i) => {
      const source = prev[i] ?? prev[prev.length - 1];
      return {
        log_id: log.id,
        set_index: i,
        weight: source?.weight ?? null,
        reps: source?.reps ?? null,
        done: false,
      };
    });
    const { error: sErr } = await supa().from('sets').insert(rows);
    if (sErr) throw sErr;
  }
  notifyDataChanged();
  return workout.id;
}

/**
 * Escrita silenciosa: a tela do treino ativo atualiza otimisticamente,
 * então não dispara refetch global a cada série marcada — só invalida o cache.
 */
export async function updateSet(
  _db: DB,
  setId: number,
  patch: { weight?: number | null; reps?: number | null; done?: boolean },
): Promise<void> {
  const payload: Row = {};
  if (patch.weight !== undefined) payload.weight = patch.weight;
  if (patch.reps !== undefined) payload.reps = patch.reps;
  if (patch.done !== undefined) payload.done = patch.done;
  if (Object.keys(payload).length === 0) return;
  const { error } = await supa().from('sets').update(payload).eq('id', setId);
  if (error) throw error;
  clearGraphCache();
}

export async function addSetToLog(_db: DB, logId: number): Promise<void> {
  const { data, error } = await supa()
    .from('sets').select('*').eq('log_id', logId)
    .order('set_index', { ascending: false }).limit(1);
  if (error) throw error;
  const last = (data as Row[])[0];
  const { error: iErr } = await supa().from('sets').insert({
    log_id: logId,
    set_index: (last?.set_index ?? -1) + 1,
    weight: last?.weight ?? null,
    reps: last?.reps ?? null,
    done: false,
  });
  if (iErr) throw iErr;
  notifyDataChanged();
}

export async function listExercises(_db: DB): Promise<Exercise[]> {
  const { data, error } = await supa().from('exercises').select('*').order('name');
  if (error) throw error;
  return data as Exercise[];
}

export async function addExercise(_db: DB, name: string, muscleGroup: string): Promise<number> {
  const { data, error } = await supa()
    .from('exercises').insert({ name, muscle_group: muscleGroup }).select('id').single();
  if (error) throw error;
  notifyDataChanged();
  return data.id;
}

export async function addExerciseToWorkout(_db: DB, workoutId: number, exerciseId: number): Promise<void> {
  const g = await fetchStrengthGraph();
  const positions = g.logs.filter((l) => l.workout_id === workoutId).map((l) => l.position);
  const { data: log, error } = await supa()
    .from('exercise_logs')
    .insert({ workout_id: workoutId, exercise_id: exerciseId, position: positions.length ? Math.max(...positions) + 1 : 0 })
    .select('id')
    .single();
  if (error) throw error;

  const prev = previousSetsFrom(g, exerciseId, workoutId);
  const nSets = prev.length || 3;
  const rows = Array.from({ length: nSets }, (_, i) => {
    const source = prev[i] ?? prev[prev.length - 1];
    return {
      log_id: log.id,
      set_index: i,
      weight: source?.weight ?? null,
      reps: source?.reps ?? null,
      done: false,
    };
  });
  const { error: sErr } = await supa().from('sets').insert(rows);
  if (sErr) throw sErr;
  notifyDataChanged();
}

export async function finishWorkout(_db: DB, workoutId: number): Promise<void> {
  const { data: w, error } = await supa().from('strength_workouts').select('*').eq('id', workoutId).single();
  if (error) throw error;
  const duration = w.started_at
    ? Math.round((Date.now() - new Date(w.started_at).getTime()) / 1000)
    : null;

  const { data: logs, error: lErr } = await supa().from('exercise_logs').select('id').eq('workout_id', workoutId);
  if (lErr) throw lErr;
  const logIds = (logs as Row[]).map((l) => l.id);

  if (logIds.length > 0) {
    const { error: dErr } = await supa().from('sets').delete().eq('done', false).in('log_id', logIds);
    if (dErr) throw dErr;
    const { data: remainingSets, error: rErr } = await supa().from('sets').select('log_id').in('log_id', logIds);
    if (rErr) throw rErr;
    const withSets = new Set((remainingSets as Row[]).map((s) => s.log_id));
    const emptyLogs = logIds.filter((id) => !withSets.has(id));
    if (emptyLogs.length > 0) {
      const { error: eErr } = await supa().from('exercise_logs').delete().in('id', emptyLogs);
      if (eErr) throw eErr;
    }
    if (emptyLogs.length < logIds.length) {
      const { error: uErr } = await supa()
        .from('strength_workouts')
        .update({ status: 'done', duration_sec: duration })
        .eq('id', workoutId);
      if (uErr) throw uErr;
      notifyDataChanged();
      return;
    }
  }
  // treino ficou vazio: apaga (cascade remove filhos)
  const { error: delErr } = await supa().from('strength_workouts').delete().eq('id', workoutId);
  if (delErr) throw delErr;
  notifyDataChanged();
}

export async function cancelWorkout(_db: DB, workoutId: number): Promise<void> {
  const { error } = await supa().from('strength_workouts').delete().eq('id', workoutId);
  if (error) throw error;
  notifyDataChanged();
}

// ---------------------------------------------------------------------------
// Provas
// ---------------------------------------------------------------------------

export interface RacesData {
  next: Race | null;
  upcoming: Race[];
  results: Race[];
}

function toRace(row: Row): Race {
  return {
    id: row.id,
    name: row.name,
    date: row.date,
    location: row.location ?? '',
    start_time: row.start_time ?? '',
    segments: row.segments ?? [],
    goal_sec: row.goal_sec,
    result_sec: row.result_sec,
    splits: row.splits ?? [],
    is_pr: row.is_pr ? 1 : 0,
  };
}

export async function getRaces(_db: DB): Promise<RacesData> {
  const { data, error } = await supa().from('races').select('*').order('date');
  if (error) throw error;
  const races = (data as Row[]).map(toRace);
  const today = toISODate(new Date());
  const future = races.filter((r) => r.date >= today && r.result_sec == null);
  const results = races
    .filter((r) => r.result_sec != null)
    .sort((a, b) => b.date.localeCompare(a.date));
  return { next: future[0] ?? null, upcoming: future.slice(1), results };
}

export async function addRace(
  _db: DB,
  race: { name: string; date: string; location: string; start_time: string; segments: RaceSegment[]; goal_sec: number | null },
): Promise<void> {
  const { error } = await supa().from('races').insert(race);
  if (error) throw error;
  notifyDataChanged();
}

export type { RaceSegment, RaceSplit } from '@/db/types';
