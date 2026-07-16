export type Sport = 'run' | 'bike' | 'swim' | 'other';

export const SPORT_LABEL: Record<Sport, string> = {
  run: 'Corrida',
  bike: 'Pedal',
  swim: 'Natação',
  other: 'Outro',
};

export const SPORT_TAG: Record<Sport, string> = {
  run: 'RUN',
  bike: 'BIKE',
  swim: 'SWIM',
  other: 'MISC',
};

export interface Exercise {
  id: number;
  name: string;
  muscle_group: string;
}

export interface WorkoutTemplate {
  id: number;
  name: string;
}

export interface TemplateExercise {
  id: number;
  template_id: number;
  exercise_id: number;
  position: number;
  target_sets: number;
}

export type WorkoutStatus = 'active' | 'done';

export interface StrengthWorkout {
  id: number;
  template_id: number | null;
  name: string;
  date: string; // YYYY-MM-DD
  started_at: number | null; // epoch ms
  duration_sec: number | null;
  status: WorkoutStatus;
}

export interface ExerciseLog {
  id: number;
  workout_id: number;
  exercise_id: number;
  position: number;
}

export interface SetRow {
  id: number;
  log_id: number;
  set_index: number;
  weight: number | null;
  reps: number | null;
  done: 0 | 1;
}

export interface CardioActivity {
  id: number;
  sport: Sport;
  title: string;
  date: string;
  distance_m: number;
  duration_sec: number;
  notes: string;
}

export interface RaceSegment {
  sport: Sport;
  label: string; // "natação", "corrida", "pedal"
  distance_m: number;
}

export interface RaceSplit {
  label: string; // "swim", "T1", "run"
  sec: number;
}

export interface Race {
  id: number;
  name: string;
  date: string;
  location: string;
  start_time: string; // "7h00"
  segments: RaceSegment[];
  goal_sec: number | null;
  result_sec: number | null;
  splits: RaceSplit[];
  is_pr: 0 | 1;
}

/** linha crua da tabela races (segments/splits em JSON) */
export interface RaceRow extends Omit<Race, 'segments' | 'splits'> {
  segments: string;
  splits: string;
}

export function parseRace(row: RaceRow): Race {
  return {
    ...row,
    segments: JSON.parse(row.segments || '[]'),
    splits: JSON.parse(row.splits || '[]'),
  };
}
