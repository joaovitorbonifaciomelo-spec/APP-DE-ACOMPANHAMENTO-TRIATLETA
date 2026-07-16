-- Schema Postgres (Supabase) equivalente ao SQLite local do app.
-- App pessoal de usuário único: RLS restringe tudo ao dono via auth.uid().

create table exercises (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users (id),
  name text not null,
  muscle_group text not null default ''
);

create table workout_templates (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users (id),
  name text not null
);

create table template_exercises (
  id bigint generated always as identity primary key,
  template_id bigint not null references workout_templates (id) on delete cascade,
  exercise_id bigint not null references exercises (id),
  position int not null,
  target_sets int not null default 3
);

create table strength_workouts (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users (id),
  template_id bigint references workout_templates (id),
  name text not null,
  date date not null,
  started_at timestamptz,
  duration_sec int,
  status text not null default 'done' check (status in ('active', 'done'))
);

create table exercise_logs (
  id bigint generated always as identity primary key,
  workout_id bigint not null references strength_workouts (id) on delete cascade,
  exercise_id bigint not null references exercises (id),
  position int not null
);

create table sets (
  id bigint generated always as identity primary key,
  log_id bigint not null references exercise_logs (id) on delete cascade,
  set_index int not null,
  weight numeric,
  reps int,
  done boolean not null default false
);

create table cardio_activities (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users (id),
  sport text not null check (sport in ('run', 'bike', 'swim', 'other')),
  title text not null default '',
  date date not null,
  distance_m numeric not null,
  duration_sec int not null,
  notes text not null default ''
);

create table races (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users (id),
  name text not null,
  date date not null,
  location text not null default '',
  start_time text not null default '',
  segments jsonb not null default '[]',
  goal_sec int,
  result_sec int,
  splits jsonb not null default '[]',
  is_pr boolean not null default false
);

create index idx_logs_workout on exercise_logs (workout_id);
create index idx_logs_exercise on exercise_logs (exercise_id);
create index idx_sets_log on sets (log_id);
create index idx_cardio_user_date on cardio_activities (user_id, date);
create index idx_workouts_user_date on strength_workouts (user_id, date);

-- RLS: cada linha pertence ao usuário autenticado
alter table exercises enable row level security;
alter table workout_templates enable row level security;
alter table template_exercises enable row level security;
alter table strength_workouts enable row level security;
alter table exercise_logs enable row level security;
alter table sets enable row level security;
alter table cardio_activities enable row level security;
alter table races enable row level security;

create policy "own rows" on exercises for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows" on workout_templates for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows" on cardio_activities for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows" on races for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows" on strength_workouts for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "via template" on template_exercises for all
  using (exists (select 1 from workout_templates t where t.id = template_id and t.user_id = auth.uid()))
  with check (exists (select 1 from workout_templates t where t.id = template_id and t.user_id = auth.uid()));
create policy "via workout" on exercise_logs for all
  using (exists (select 1 from strength_workouts w where w.id = workout_id and w.user_id = auth.uid()))
  with check (exists (select 1 from strength_workouts w where w.id = workout_id and w.user_id = auth.uid()));
create policy "via log" on sets for all
  using (exists (
    select 1 from exercise_logs l join strength_workouts w on w.id = l.workout_id
    where l.id = log_id and w.user_id = auth.uid()))
  with check (exists (
    select 1 from exercise_logs l join strength_workouts w on w.id = l.workout_id
    where l.id = log_id and w.user_id = auth.uid()));
