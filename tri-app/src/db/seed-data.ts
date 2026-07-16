/**
 * Dados de demonstração espelhando o design (datas relativas a "hoje").
 * Consumidos pelo seed SQLite (nativo) e pelo bootstrap web (Supabase direto).
 */

export const SEED_EXERCISES: [name: string, group: string][] = [
  ['Agachamento livre', 'Inferiores'],
  ['Leg press 45°', 'Inferiores'],
  ['Cadeira extensora', 'Inferiores'],
  ['Panturrilha em pé', 'Inferiores'],
  ['Supino reto', 'Superiores'],
  ['Desenvolvimento halteres', 'Superiores'],
  ['Remada curvada', 'Superiores'],
];

export interface SeedTemplate {
  name: string;
  exercises: [name: string, targetSets: number][];
}

export const SEED_TEMPLATES: SeedTemplate[] = [
  {
    name: 'Inferiores A',
    exercises: [
      ['Agachamento livre', 3],
      ['Leg press 45°', 4],
      ['Cadeira extensora', 3],
      ['Panturrilha em pé', 4],
    ],
  },
  {
    name: 'Superiores A',
    exercises: [
      ['Supino reto', 4],
      ['Desenvolvimento halteres', 3],
      ['Remada curvada', 4],
    ],
  },
];

export type SeedSet = [weight: number, reps: number];
export interface SeedLog { name: string; sets: SeedSet[] }
export interface SeedWorkout { template: string; daysAgo: number; duration: number; logs: SeedLog[] }

const inferiores = (daysAgo: number, squat: SeedSet[], leg: SeedSet[], ext: SeedSet[], calf: SeedSet[]): SeedWorkout => ({
  template: 'Inferiores A', daysAgo, duration: 2520 + ((daysAgo * 97) % 600),
  logs: [
    { name: 'Agachamento livre', sets: squat },
    { name: 'Leg press 45°', sets: leg },
    { name: 'Cadeira extensora', sets: ext },
    { name: 'Panturrilha em pé', sets: calf },
  ],
});

/** progressão do agachamento (8 sessões ≈ 8 semanas): 70 → 80 kg (+14%) */
export const SEED_WORKOUTS: SeedWorkout[] = [
  inferiores(50, [[70, 8], [70, 8], [70, 8], [70, 8]], [[140, 10], [140, 10], [140, 10], [140, 10]], [[47.5, 12], [47.5, 12], [47.5, 12]], [[80, 15], [80, 15], [80, 15], [80, 15]]),
  inferiores(43, [[70, 8], [70, 8], [70, 8]], [[145, 10], [145, 10], [145, 10], [140, 10]], [[50, 12], [50, 12], [47.5, 12]], [[80, 15], [80, 15], [80, 15], [80, 15]]),
  inferiores(36, [[72.5, 8], [72.5, 8], [70, 8]], [[150, 10], [150, 10], [145, 10], [145, 10]], [[50, 12], [50, 12], [50, 12]], [[85, 15], [85, 15], [85, 15], [80, 15]]),
  inferiores(29, [[75, 8], [72.5, 8], [72.5, 8]], [[150, 10], [150, 10], [150, 10], [150, 10]], [[52.5, 12], [50, 12], [50, 12]], [[85, 15], [85, 15], [85, 15], [85, 15]]),
  inferiores(12, [[75, 8], [75, 8], [72.5, 8], [72.5, 8]], [[155, 10], [155, 10], [150, 10], [150, 10]], [[52.5, 12], [52.5, 12], [52.5, 12]], [[90, 15], [85, 15], [85, 15], [85, 15]]),
  inferiores(8, [[75, 8], [75, 8], [75, 8]], [[155, 10], [155, 10], [155, 10], [155, 10]], [[55, 12], [52.5, 12], [52.5, 12]], [[90, 15], [90, 15], [85, 15], [85, 15]]),
  inferiores(5, [[77.5, 8], [77.5, 8], [75, 7]], [[160, 10], [155, 10], [155, 10], [155, 10]], [[55, 12], [55, 12], [52.5, 12]], [[90, 15], [90, 15], [90, 15], [85, 15]]),
  inferiores(1, [[80, 8], [80, 8], [80, 8]], [[160, 10], [160, 10], [160, 10], [155, 10]], [[55, 12], [55, 12], [55, 12]], [[90, 15], [90, 15], [90, 15], [90, 15]]),
  {
    template: 'Superiores A', daysAgo: 16, duration: 2700,
    logs: [
      { name: 'Supino reto', sets: [[60, 10], [60, 10], [60, 10], [60, 10]] },
      { name: 'Desenvolvimento halteres', sets: [[22, 10], [22, 10], [22, 10]] },
      { name: 'Remada curvada', sets: [[65, 8], [65, 8], [65, 8], [65, 8]] },
    ],
  },
  {
    template: 'Superiores A', daysAgo: 9, duration: 2760,
    logs: [
      { name: 'Supino reto', sets: [[62, 10], [62, 10], [62, 10], [62, 10]] },
      { name: 'Desenvolvimento halteres', sets: [[24, 10], [24, 10], [22, 10]] },
      { name: 'Remada curvada', sets: [[70, 8], [70, 8], [65, 8], [65, 8]] },
    ],
  },
  {
    template: 'Superiores A', daysAgo: 2, duration: 2640,
    logs: [
      { name: 'Supino reto', sets: [[62, 10], [62, 10], [62, 10], [62, 10]] },
      { name: 'Desenvolvimento halteres', sets: [[24, 10], [24, 10], [24, 10]] },
      { name: 'Remada curvada', sets: [[70, 8], [70, 8], [70, 8], [70, 8]] },
    ],
  },
];

/** [sport, título, diasAtrás, distância m, duração s] */
export const SEED_CARDIO: [string, string, number, number, number][] = [
  ['run', 'Rodagem leve', 1, 8200, 45 * 60 + 10],
  ['run', 'Intervalado 6×800m', 4, 7600, 38 * 60 + 40],
  ['run', 'Longão', 6, 14000, 82 * 60 + 30],
  ['run', 'Rodagem', 8, 6000, 33 * 60],
  ['run', 'Progressivo', 11, 10000, 55 * 60 + 20],
  ['run', 'Rodagem', 14, 8000, 45 * 60 + 36],
  ['run', 'Regenerativo', 17, 5000, 29 * 60],
  ['run', 'Intervalado 5×1000m', 20, 8000, 42 * 60 + 24],
  ['swim', 'Natação — técnica', 2, 2000, 42 * 60],
  ['swim', 'Natação — resistência', 9, 2200, 48 * 60 + 24],
  ['swim', 'Natação — técnica', 16, 1800, 39 * 60 + 36],
  ['bike', 'Pedal — rodagem', 0, 40000, 87 * 60],
  ['bike', 'Pedal longo', 3, 56000, 125 * 60],
  ['bike', 'Pedal', 10, 45000, 100 * 60],
  ['bike', 'Pedal — giro', 17, 48000, 107 * 60],
];

export interface SeedRace {
  name: string;
  date: string;
  location?: string;
  start_time?: string;
  segments: { sport: string; label: string; distance_m: number }[];
  goal_sec?: number;
  result_sec?: number;
  splits?: { label: string; sec: number }[];
  is_pr?: boolean;
}

export const SEED_RACES: SeedRace[] = [
  {
    name: 'Aquathlon Rio — Sprint', date: '2026-08-10', location: 'Copacabana', start_time: '7h00',
    segments: [
      { sport: 'swim', label: 'natação', distance_m: 1000 },
      { sport: 'run', label: 'corrida', distance_m: 5000 },
    ],
    goal_sec: 35 * 60,
  },
  {
    name: 'Triatlo Sprint Santos', date: '2026-09-14',
    segments: [
      { sport: 'swim', label: 'natação', distance_m: 750 },
      { sport: 'bike', label: 'pedal', distance_m: 20000 },
      { sport: 'run', label: 'corrida', distance_m: 5000 },
    ],
  },
  {
    name: 'Aquathlon SP — Sprint', date: '2026-05-17', location: 'São Paulo',
    segments: [
      { sport: 'swim', label: 'natação', distance_m: 1000 },
      { sport: 'run', label: 'corrida', distance_m: 5000 },
    ],
    result_sec: 37 * 60 + 42,
    splits: [
      { label: 'swim', sec: 17 * 60 + 10 },
      { label: 'T1', sec: 62 },
      { label: 'run', sec: 19 * 60 + 30 },
    ],
  },
  {
    name: 'Corrida de rua 10K', date: '2026-03-22',
    segments: [{ sport: 'run', label: 'corrida', distance_m: 10000 }],
    result_sec: 53 * 60 + 20,
    is_pr: true,
  },
];
