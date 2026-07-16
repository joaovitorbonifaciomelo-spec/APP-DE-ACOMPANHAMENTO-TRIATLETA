/**
 * Repositório de dados — ÚNICO ponto de acesso das telas ao banco.
 *
 * Implementação atual: SQLite local (expo-sqlite). Para migrar/sincronizar com
 * Supabase, reimplementar estas funções sobre o client de `src/lib/supabase.ts`
 * (schema Postgres equivalente em `supabase/migrations/0001_schema.sql`) —
 * as telas não conhecem a fonte.
 */

import type { SQLiteDatabase } from 'expo-sqlite';

import type {
  CardioActivity, Exercise, Race, RaceRow, RaceSegment, RaceSplit, SetRow, Sport,
  StrengthWorkout, WorkoutTemplate,
} from '@/db/types';
import { parseRace } from '@/db/types';
import { mondayOf, toISODate } from '@/utils/format';

export { notifyDataChanged, subscribeData } from './events';
import { notifyDataChanged } from './events';

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

export interface WeekSummary {
  workoutsCount: number;
  runKm: number;
  bikeKm: number;
  swimKm: number;
  /** minutos de treino por dia da semana, índice 0 = segunda */
  dayMinutes: number[];
  /** índice de hoje na semana (0 = segunda) */
  todayIndex: number;
}

export async function getWeekSummary(db: SQLiteDatabase): Promise<WeekSummary> {
  const monday = mondayOf(new Date());
  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);
  const from = toISODate(monday);
  const to = toISODate(sunday);

  const cardio = await db.getAllAsync<Pick<CardioActivity, 'sport' | 'date' | 'distance_m' | 'duration_sec'>>(
    'SELECT sport, date, distance_m, duration_sec FROM cardio_activities WHERE date BETWEEN ? AND ?', from, to,
  );
  const strength = await db.getAllAsync<{ date: string; duration_sec: number | null }>(
    "SELECT date, duration_sec FROM strength_workouts WHERE status = 'done' AND date BETWEEN ? AND ?", from, to,
  );

  const dayMinutes = [0, 0, 0, 0, 0, 0, 0];
  const dayIndex = (iso: string) => {
    const [y, m, d] = iso.split('-').map(Number);
    return (new Date(y, m - 1, d, 12).getDay() + 6) % 7;
  };

  let runKm = 0; let bikeKm = 0; let swimKm = 0;
  for (const a of cardio) {
    if (a.sport === 'run') runKm += a.distance_m / 1000;
    else if (a.sport === 'bike') bikeKm += a.distance_m / 1000;
    else if (a.sport === 'swim') swimKm += a.distance_m / 1000;
    dayMinutes[dayIndex(a.date)] += a.duration_sec / 60;
  }
  for (const w of strength) dayMinutes[dayIndex(w.date)] += (w.duration_sec ?? 3000) / 60;

  return {
    workoutsCount: cardio.length + strength.length,
    runKm, bikeKm, swimKm,
    dayMinutes,
    todayIndex: (new Date().getDay() + 6) % 7,
  };
}

export interface ExerciseProgress {
  exerciseId: number;
  name: string;
  muscleGroup: string;
  /** carga máxima da sessão mais recente */
  currentMax: number;
  /** delta vs. sessão anterior (null se só há uma sessão) */
  delta: number | null;
  /** esquema da última sessão, ex. "4×8" */
  lastScheme: string;
  /** máximas das últimas sessões (ordem cronológica) p/ mini-gráfico */
  spark: number[];
}

interface SessionMaxRow {
  exercise_id: number;
  name: string;
  muscle_group: string;
  workout_id: number;
  date: string;
  max_weight: number;
  sets_count: number;
  top_reps: number;
}

async function sessionMaxes(db: SQLiteDatabase, exerciseId?: number): Promise<SessionMaxRow[]> {
  return db.getAllAsync<SessionMaxRow>(
    `SELECT e.id AS exercise_id, e.name, e.muscle_group, w.id AS workout_id, w.date,
            MAX(s.weight) AS max_weight, COUNT(s.id) AS sets_count,
            (SELECT s2.reps FROM sets s2 WHERE s2.log_id = l.id AND s2.done = 1 ORDER BY s2.set_index LIMIT 1) AS top_reps
     FROM sets s
     JOIN exercise_logs l ON l.id = s.log_id
     JOIN strength_workouts w ON w.id = l.workout_id
     JOIN exercises e ON e.id = l.exercise_id
     WHERE s.done = 1 AND s.weight IS NOT NULL AND w.status = 'done'
       ${exerciseId ? 'AND e.id = ?' : ''}
     GROUP BY l.id
     ORDER BY e.id, w.date ASC, w.id ASC`,
    ...(exerciseId ? [exerciseId] : []),
  );
}

export async function getExerciseProgress(db: SQLiteDatabase, limit?: number): Promise<ExerciseProgress[]> {
  const rows = await sessionMaxes(db);
  const byExercise = new Map<number, SessionMaxRow[]>();
  for (const r of rows) {
    const list = byExercise.get(r.exercise_id) ?? [];
    list.push(r);
    byExercise.set(r.exercise_id, list);
  }

  const result: ExerciseProgress[] = [];
  for (const sessions of byExercise.values()) {
    const last = sessions[sessions.length - 1];
    const prev = sessions.length > 1 ? sessions[sessions.length - 2] : null;
    result.push({
      exerciseId: last.exercise_id,
      name: last.name,
      muscleGroup: last.muscle_group,
      currentMax: last.max_weight,
      delta: prev ? last.max_weight - prev.max_weight : null,
      lastScheme: `${last.sets_count}×${last.top_reps ?? '—'}`,
      spark: sessions.slice(-6).map((s) => s.max_weight),
    });
  }
  // mais recentes primeiro (pela última data de sessão)
  result.sort((a, b) => {
    const lastA = byExercise.get(a.exerciseId)!;
    const lastB = byExercise.get(b.exerciseId)!;
    return lastB[lastB.length - 1].date.localeCompare(lastA[lastA.length - 1].date);
  });
  return limit ? result.slice(0, limit) : result;
}

export async function getRecentCardio(db: SQLiteDatabase, limit = 3): Promise<CardioActivity[]> {
  return db.getAllAsync<CardioActivity>(
    'SELECT * FROM cardio_activities ORDER BY date DESC, id DESC LIMIT ?', limit,
  );
}

// ---------------------------------------------------------------------------
// Cardio
// ---------------------------------------------------------------------------

export type SportFilter = Sport | 'all';

export async function listCardio(db: SQLiteDatabase, filter: SportFilter): Promise<CardioActivity[]> {
  if (filter === 'all') {
    return db.getAllAsync<CardioActivity>('SELECT * FROM cardio_activities ORDER BY date DESC, id DESC');
  }
  return db.getAllAsync<CardioActivity>(
    'SELECT * FROM cardio_activities WHERE sport = ? ORDER BY date DESC, id DESC', filter,
  );
}

export async function addCardio(
  db: SQLiteDatabase,
  a: { sport: Sport; title: string; date: string; distance_m: number; duration_sec: number; notes: string },
): Promise<void> {
  await db.runAsync(
    'INSERT INTO cardio_activities (sport, title, date, distance_m, duration_sec, notes) VALUES (?, ?, ?, ?, ?, ?)',
    a.sport, a.title, a.date, a.distance_m, a.duration_sec, a.notes,
  );
  notifyDataChanged();
}

// ---------------------------------------------------------------------------
// Evolução de carga (detalhe do exercício)
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
  sessions: ExerciseSession[]; // cronológico (antiga -> recente)
  currentMax: number;
  allTimePR: number;
  /** variação % da 1ª à última sessão dentro da janela de 8 semanas */
  pctChange8w: number | null;
}

export async function getExerciseDetail(db: SQLiteDatabase, exerciseId: number): Promise<ExerciseDetail | null> {
  const exercise = await db.getFirstAsync<Exercise>('SELECT * FROM exercises WHERE id = ?', exerciseId);
  if (!exercise) return null;

  const logs = await db.getAllAsync<{ log_id: number; workout_id: number; date: string }>(
    `SELECT l.id AS log_id, w.id AS workout_id, w.date
     FROM exercise_logs l JOIN strength_workouts w ON w.id = l.workout_id
     WHERE l.exercise_id = ? AND w.status = 'done'
     ORDER BY w.date ASC, w.id ASC`,
    exerciseId,
  );

  const sessions: ExerciseSession[] = [];
  let runningPR = 0;
  for (const log of logs) {
    const sets = await db.getAllAsync<SetRow>(
      'SELECT * FROM sets WHERE log_id = ? AND done = 1 AND weight IS NOT NULL ORDER BY set_index', log.log_id,
    );
    if (sets.length === 0) continue;
    const weights = sets.map((s) => s.weight!);
    const maxWeight = Math.max(...weights);
    const reps = sets[0].reps ?? 0;
    sessions.push({
      workoutId: log.workout_id,
      date: log.date,
      weights,
      scheme: `${sets.length}×${reps || '—'}`,
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
// Treino de força (fluxo de registro)
// ---------------------------------------------------------------------------

export interface ActiveSet {
  id: number;
  setIndex: number;
  weight: number | null;
  reps: number | null;
  done: boolean;
  /** resultado da sessão anterior p/ coluna "Anterior", ex. "75×8" */
  previous: string | null;
}

export interface ActiveExercise {
  logId: number;
  exerciseId: number;
  name: string;
  position: number;
  sets: ActiveSet[];
  /** ex. "75 kg · 4×8" */
  previousSummary: string | null;
  /** carga máx. da sessão anterior (p/ "anterior N kg" nos colapsados) */
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

export interface TemplateItem {
  exerciseId: number;
  targetSets: number;
}

export async function addTemplate(db: SQLiteDatabase, name: string, items: TemplateItem[]): Promise<number> {
  const r = await db.runAsync('INSERT INTO workout_templates (name) VALUES (?)', name);
  const templateId = Number(r.lastInsertRowId);
  for (let i = 0; i < items.length; i++) {
    await db.runAsync(
      'INSERT INTO template_exercises (template_id, exercise_id, position, target_sets) VALUES (?, ?, ?, ?)',
      templateId, items[i].exerciseId, i, items[i].targetSets,
    );
  }
  notifyDataChanged();
  return templateId;
}

export async function listTemplates(db: SQLiteDatabase): Promise<TemplateSummary[]> {
  const templates = await db.getAllAsync<WorkoutTemplate>('SELECT * FROM workout_templates ORDER BY name');
  const result: TemplateSummary[] = [];
  for (const t of templates) {
    const names = await db.getAllAsync<{ name: string }>(
      `SELECT e.name FROM template_exercises te JOIN exercises e ON e.id = te.exercise_id
       WHERE te.template_id = ? ORDER BY te.position`, t.id,
    );
    result.push({ ...t, exerciseNames: names.map((n) => n.name) });
  }
  return result;
}

/** sets 'done' da última sessão concluída do exercício (antes do treino atual) */
async function previousSets(db: SQLiteDatabase, exerciseId: number, excludeWorkoutId: number): Promise<SetRow[]> {
  const lastLog = await db.getFirstAsync<{ id: number }>(
    `SELECT l.id FROM exercise_logs l JOIN strength_workouts w ON w.id = l.workout_id
     WHERE l.exercise_id = ? AND w.status = 'done' AND w.id != ?
     ORDER BY w.date DESC, w.id DESC LIMIT 1`,
    exerciseId, excludeWorkoutId,
  );
  if (!lastLog) return [];
  return db.getAllAsync<SetRow>(
    'SELECT * FROM sets WHERE log_id = ? AND done = 1 ORDER BY set_index', lastLog.id,
  );
}

export async function getActiveWorkout(db: SQLiteDatabase): Promise<ActiveWorkout | null> {
  const w = await db.getFirstAsync<StrengthWorkout>(
    "SELECT * FROM strength_workouts WHERE status = 'active' ORDER BY id DESC LIMIT 1",
  );
  if (!w) return null;

  const logs = await db.getAllAsync<{ id: number; exercise_id: number; position: number; name: string }>(
    `SELECT l.id, l.exercise_id, l.position, e.name
     FROM exercise_logs l JOIN exercises e ON e.id = l.exercise_id
     WHERE l.workout_id = ? ORDER BY l.position`, w.id,
  );

  const exercises: ActiveExercise[] = [];
  for (const log of logs) {
    const sets = await db.getAllAsync<SetRow>('SELECT * FROM sets WHERE log_id = ? ORDER BY set_index', log.id);
    const prev = await previousSets(db, log.exercise_id, w.id);
    const prevMax = prev.length ? Math.max(...prev.map((s) => s.weight ?? 0)) : null;
    const prevReps = prev.length ? prev[0].reps : null;
    exercises.push({
      logId: log.id,
      exerciseId: log.exercise_id,
      name: log.name,
      position: log.position,
      previousSummary: prevMax != null ? `${fmtWeight(prevMax)} kg · ${prev.length}×${prevReps ?? '—'}` : null,
      previousMax: prevMax,
      sets: sets.map((s, i) => ({
        id: s.id,
        setIndex: s.set_index,
        weight: s.weight,
        reps: s.reps,
        done: s.done === 1,
        previous: prev[i] ? `${fmtWeight(prev[i].weight ?? 0)}×${prev[i].reps ?? '—'}` : null,
      })),
    });
  }

  return { id: w.id, name: w.name, startedAt: w.started_at ?? Date.now(), exercises };
}

function fmtWeight(w: number): string {
  return Number.isInteger(w) ? String(w) : String(w).replace('.', ',');
}

export async function startWorkout(db: SQLiteDatabase, templateId: number): Promise<number> {
  // nunca dois treinos ativos (protege contra toque duplo)
  const existing = await db.getFirstAsync<{ id: number }>(
    "SELECT id FROM strength_workouts WHERE status = 'active' ORDER BY id DESC LIMIT 1",
  );
  if (existing) return existing.id;

  const tpl = await db.getFirstAsync<WorkoutTemplate>('SELECT * FROM workout_templates WHERE id = ?', templateId);
  if (!tpl) throw new Error('template não encontrado');

  const wr = await db.runAsync(
    "INSERT INTO strength_workouts (template_id, name, date, started_at, status) VALUES (?, ?, ?, ?, 'active')",
    templateId, tpl.name, toISODate(new Date()), Date.now(),
  );
  const workoutId = Number(wr.lastInsertRowId);

  const tplExercises = await db.getAllAsync<{ exercise_id: number; position: number; target_sets: number }>(
    'SELECT exercise_id, position, target_sets FROM template_exercises WHERE template_id = ? ORDER BY position',
    templateId,
  );

  for (const te of tplExercises) {
    const lr = await db.runAsync(
      'INSERT INTO exercise_logs (workout_id, exercise_id, position) VALUES (?, ?, ?)',
      workoutId, te.exercise_id, te.position,
    );
    const logId = Number(lr.lastInsertRowId);
    // pré-preenche com a sessão anterior (comportamento do design)
    const prev = await previousSets(db, te.exercise_id, workoutId);
    const nSets = Math.max(te.target_sets, 0) || prev.length || 3;
    for (let i = 0; i < nSets; i++) {
      const source = prev[i] ?? prev[prev.length - 1];
      await db.runAsync(
        'INSERT INTO sets (log_id, set_index, weight, reps, done) VALUES (?, ?, ?, ?, 0)',
        logId, i, source?.weight ?? null, source?.reps ?? null,
      );
    }
  }
  notifyDataChanged();
  return workoutId;
}

export async function updateSet(
  db: SQLiteDatabase,
  setId: number,
  patch: { weight?: number | null; reps?: number | null; done?: boolean },
): Promise<void> {
  if (patch.weight !== undefined) await db.runAsync('UPDATE sets SET weight = ?, dirty = 1 WHERE id = ?', patch.weight, setId);
  if (patch.reps !== undefined) await db.runAsync('UPDATE sets SET reps = ?, dirty = 1 WHERE id = ?', patch.reps, setId);
  if (patch.done !== undefined) await db.runAsync('UPDATE sets SET done = ?, dirty = 1 WHERE id = ?', patch.done ? 1 : 0, setId);
  // sem notifyDataChanged: a tela do treino ativo atualiza otimisticamente
}

export async function addSetToLog(db: SQLiteDatabase, logId: number): Promise<void> {
  const last = await db.getFirstAsync<SetRow>(
    'SELECT * FROM sets WHERE log_id = ? ORDER BY set_index DESC LIMIT 1', logId,
  );
  await db.runAsync(
    'INSERT INTO sets (log_id, set_index, weight, reps, done) VALUES (?, ?, ?, ?, 0)',
    logId, (last?.set_index ?? -1) + 1, last?.weight ?? null, last?.reps ?? null,
  );
  notifyDataChanged();
}

export async function listExercises(db: SQLiteDatabase): Promise<Exercise[]> {
  return db.getAllAsync<Exercise>('SELECT * FROM exercises ORDER BY name');
}

export async function addExercise(db: SQLiteDatabase, name: string, muscleGroup: string): Promise<number> {
  const r = await db.runAsync('INSERT INTO exercises (name, muscle_group) VALUES (?, ?)', name, muscleGroup);
  notifyDataChanged();
  return Number(r.lastInsertRowId);
}

export async function addExerciseToWorkout(db: SQLiteDatabase, workoutId: number, exerciseId: number): Promise<void> {
  const pos = await db.getFirstAsync<{ p: number }>(
    'SELECT COALESCE(MAX(position), -1) + 1 AS p FROM exercise_logs WHERE workout_id = ?', workoutId,
  );
  const lr = await db.runAsync(
    'INSERT INTO exercise_logs (workout_id, exercise_id, position) VALUES (?, ?, ?)',
    workoutId, exerciseId, pos?.p ?? 0,
  );
  const logId = Number(lr.lastInsertRowId);
  const prev = await previousSets(db, exerciseId, workoutId);
  const nSets = prev.length || 3;
  for (let i = 0; i < nSets; i++) {
    const source = prev[i] ?? prev[prev.length - 1];
    await db.runAsync(
      'INSERT INTO sets (log_id, set_index, weight, reps, done) VALUES (?, ?, ?, ?, 0)',
      logId, i, source?.weight ?? null, source?.reps ?? null,
    );
  }
  notifyDataChanged();
}

/** registra tombstones (p/ deletar no Supabase) das linhas que têm remote_id */
async function tombstoneWhere(db: SQLiteDatabase, table: string, whereSql: string, ...params: (number | string)[]): Promise<void> {
  await db.runAsync(
    `INSERT INTO tombstones (table_name, remote_id)
     SELECT '${table}', remote_id FROM ${table} WHERE remote_id IS NOT NULL AND ${whereSql}`,
    ...params,
  );
}

/** Finaliza: grava duração, descarta séries não concluídas e logs/treino vazios. */
export async function finishWorkout(db: SQLiteDatabase, workoutId: number): Promise<void> {
  const w = await db.getFirstAsync<StrengthWorkout>('SELECT * FROM strength_workouts WHERE id = ?', workoutId);
  if (!w) return;
  const duration = w.started_at ? Math.round((Date.now() - w.started_at) / 1000) : null;

  await tombstoneWhere(db, 'sets', 'done = 0 AND log_id IN (SELECT id FROM exercise_logs WHERE workout_id = ?)', workoutId);
  await db.runAsync(
    'DELETE FROM sets WHERE done = 0 AND log_id IN (SELECT id FROM exercise_logs WHERE workout_id = ?)', workoutId,
  );
  await tombstoneWhere(db, 'exercise_logs', 'workout_id = ? AND id NOT IN (SELECT DISTINCT log_id FROM sets)', workoutId);
  await db.runAsync(
    'DELETE FROM exercise_logs WHERE workout_id = ? AND id NOT IN (SELECT DISTINCT log_id FROM sets)', workoutId,
  );
  const remaining = await db.getFirstAsync<{ n: number }>(
    'SELECT COUNT(*) AS n FROM exercise_logs WHERE workout_id = ?', workoutId,
  );
  if ((remaining?.n ?? 0) === 0) {
    await tombstoneWhere(db, 'strength_workouts', 'id = ?', workoutId);
    await db.runAsync('DELETE FROM strength_workouts WHERE id = ?', workoutId);
  } else {
    await db.runAsync(
      "UPDATE strength_workouts SET status = 'done', duration_sec = ?, dirty = 1 WHERE id = ?", duration, workoutId,
    );
  }
  notifyDataChanged();
}

export async function cancelWorkout(db: SQLiteDatabase, workoutId: number): Promise<void> {
  // o cascade remoto apaga logs/sets junto com o treino
  await tombstoneWhere(db, 'strength_workouts', 'id = ?', workoutId);
  await db.runAsync('DELETE FROM sets WHERE log_id IN (SELECT id FROM exercise_logs WHERE workout_id = ?)', workoutId);
  await db.runAsync('DELETE FROM exercise_logs WHERE workout_id = ?', workoutId);
  await db.runAsync('DELETE FROM strength_workouts WHERE id = ?', workoutId);
  notifyDataChanged();
}

// ---------------------------------------------------------------------------
// Provas
// ---------------------------------------------------------------------------

export interface RacesData {
  next: Race | null;
  upcoming: Race[];   // futuras além da próxima
  results: Race[];    // com resultado, mais recente primeiro
}

export async function getRaces(db: SQLiteDatabase): Promise<RacesData> {
  const rows = await db.getAllAsync<RaceRow>('SELECT * FROM races ORDER BY date ASC');
  const races = rows.map(parseRace);
  const today = toISODate(new Date());
  const future = races.filter((r) => r.date >= today && r.result_sec == null);
  const results = races
    .filter((r) => r.result_sec != null)
    .sort((a, b) => b.date.localeCompare(a.date));
  return { next: future[0] ?? null, upcoming: future.slice(1), results };
}

export async function addRace(
  db: SQLiteDatabase,
  race: { name: string; date: string; location: string; start_time: string; segments: RaceSegment[]; goal_sec: number | null },
): Promise<void> {
  await db.runAsync(
    'INSERT INTO races (name, date, location, start_time, segments, goal_sec) VALUES (?, ?, ?, ?, ?, ?)',
    race.name, race.date, race.location, race.start_time, JSON.stringify(race.segments), race.goal_sec,
  );
  notifyDataChanged();
}

export type { RaceSegment, RaceSplit };
