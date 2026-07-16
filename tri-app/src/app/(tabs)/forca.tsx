import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { ExercisePicker } from '@/components/exercise-picker';
import { FixedBottomBar, Screen } from '@/components/screen';
import { Card, CTAButton, Mono, SectionLabel } from '@/components/ui';
import { useDb } from '@/data/db-context';
import { useLiveQuery } from '@/data/hooks';
import {
  addExerciseToWorkout, addSetToLog, cancelWorkout, deleteTemplate, finishWorkout,
  getActiveWorkout, listTemplates, startWorkout, updateSet,
  type ActiveExercise, type ActiveSet, type ActiveWorkout,
} from '@/data/repo';
import { colors, font, radius, spacing } from '@/theme/tokens';
import { fmtDuration, fmtNumber, parseDecimal } from '@/utils/format';

const REST_DEFAULT_SEC = 90;

export default function ForcaScreen() {
  const { data: workout } = useLiveQuery((dbase) => getActiveWorkout(dbase));

  if (workout === undefined) return <Screen>{null}</Screen>;
  if (workout === null) return <StartState />;
  return <ActiveWorkoutView workout={workout} />;
}

// ---------------------------------------------------------------------------
// Estado inicial: escolher template e iniciar treino
// ---------------------------------------------------------------------------

function StartState() {
  const db = useDb();
  const router = useRouter();
  const { data: templates } = useLiveQuery((dbase) => listTemplates(dbase));
  const [starting, setStarting] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  // confirmação de apagar volta ao normal após 3s
  useEffect(() => {
    if (confirmDeleteId == null) return;
    const t = setTimeout(() => setConfirmDeleteId(null), 3000);
    return () => clearTimeout(t);
  }, [confirmDeleteId]);

  const start = async (templateId: number) => {
    if (starting) return;
    setStarting(true);
    try {
      await startWorkout(db, templateId);
    } finally {
      setStarting(false);
    }
  };

  const onDeletePress = (templateId: number) => {
    if (confirmDeleteId === templateId) {
      setConfirmDeleteId(null);
      deleteTemplate(db, templateId);
    } else {
      setConfirmDeleteId(templateId);
    }
  };

  return (
    <Screen>
      <View style={styles.header}>
        <View>
          <SectionLabel>Treino de força</SectionLabel>
          <Text style={styles.title}>Iniciar treino</Text>
        </View>
      </View>

      <Text style={styles.startHint}>
        Escolha um treino para começar. Cargas e repetições vêm pré-preenchidas com a última sessão.
      </Text>

      <View style={{ gap: spacing.cardGap, marginTop: 14 }}>
        {(templates ?? []).map((t) => (
          <Card key={t.id} onPress={() => start(t.id)}>
            <View style={styles.queueRow}>
              <View style={{ flex: 1, flexShrink: 1 }}>
                <Text style={styles.exerciseName15}>{t.name}</Text>
                <Text style={styles.cardMeta} numberOfLines={1}>
                  {t.exerciseNames.join(' · ')}
                </Text>
              </View>
              <Pressable onPress={() => onDeletePress(t.id)} hitSlop={8} style={styles.deleteBtn}>
                <Text style={[styles.deleteText, confirmDeleteId === t.id && { color: '#ff7a7a' }]}>
                  {confirmDeleteId === t.id ? 'apagar?' : '×'}
                </Text>
              </Pressable>
              <Text style={styles.chevron}>›</Text>
            </View>
          </Card>
        ))}

        <Pressable
          onPress={() => router.push('/template-new')}
          style={({ pressed }) => [styles.addExercise, pressed && { opacity: 0.8 }]}>
          <Text style={styles.addExerciseText}>+ criar treino</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

// ---------------------------------------------------------------------------
// Treino ativo
// ---------------------------------------------------------------------------

type SetPatch = { weight?: number | null; reps?: number | null; done?: boolean };

function ActiveWorkoutView({ workout }: { workout: ActiveWorkout }) {
  const db = useDb();
  const [activeLogId, setActiveLogId] = useState<number | null>(null);
  const [restLeft, setRestLeft] = useState<number | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const elapsed = useElapsed(workout.startedAt);

  // UI otimista: mudanças de série aplicam na hora e gravam em segundo plano
  const [overlay, setOverlay] = useState<Record<number, SetPatch>>({});
  const pendingWrites = React.useRef<Promise<unknown>[]>([]);
  useEffect(() => {
    setOverlay({});
    pendingWrites.current = [];
  }, [workout.id]);

  const merged: ActiveWorkout = useMemo(
    () => ({
      ...workout,
      exercises: workout.exercises.map((e) => ({
        ...e,
        sets: e.sets.map((s) => {
          const p = overlay[s.id];
          if (!p) return s;
          return {
            ...s,
            weight: p.weight !== undefined ? p.weight : s.weight,
            reps: p.reps !== undefined ? p.reps : s.reps,
            done: p.done !== undefined ? p.done : s.done,
          };
        }),
      })),
    }),
    [workout, overlay],
  );

  // "descartar" pede um segundo toque; volta ao normal após 3s
  useEffect(() => {
    if (!confirmDiscard) return;
    const t = setTimeout(() => setConfirmDiscard(false), 3000);
    return () => clearTimeout(t);
  }, [confirmDiscard]);

  // exercício ativo: escolhido pelo usuário, senão o primeiro com série pendente
  const active: ActiveExercise | undefined = useMemo(() => {
    const byChoice = merged.exercises.find((e) => e.logId === activeLogId);
    if (byChoice) return byChoice;
    return merged.exercises.find((e) => e.sets.some((s) => !s.done)) ?? merged.exercises[0];
  }, [merged, activeLogId]);

  const queue = merged.exercises.filter((e) => e.logId !== active?.logId);
  const nextLogId = queue.find((e) => e.sets.some((s) => !s.done))?.logId;

  // countdown do descanso
  useEffect(() => {
    if (restLeft == null || restLeft <= 0) return;
    const t = setTimeout(() => setRestLeft((r) => (r != null ? r - 1 : null)), 1000);
    return () => clearTimeout(t);
  }, [restLeft]);

  const commitSet = (setId: number, patch: SetPatch) => {
    setOverlay((prev) => ({ ...prev, [setId]: { ...prev[setId], ...patch } }));
    pendingWrites.current.push(
      updateSet(db, setId, patch).catch((e) => console.warn('[serie] gravação falhou:', e)),
    );
  };

  const onToggleDone = (set: ActiveSet) => {
    const nowDone = !set.done;
    commitSet(set.id, { done: nowDone });
    if (nowDone) setRestLeft(REST_DEFAULT_SEC); // check dispara o descanso
  };

  const onFinish = async () => {
    if (finishing) return;
    setFinishing(true);
    try {
      await Promise.all(pendingWrites.current); // garante que tudo chegou no banco
      await finishWorkout(db, workout.id);
    } finally {
      setFinishing(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Screen hasCTA>
        <View style={styles.header}>
          <View>
            <SectionLabel>Treino de força</SectionLabel>
            <Text style={styles.title}>{workout.name}</Text>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 6 }}>
            <View style={styles.timerChip}>
              <Mono size={13} color={colors.accent}>{fmtDuration(elapsed)}</Mono>
            </View>
            <Pressable
              hitSlop={8}
              onPress={() => {
                if (confirmDiscard) cancelWorkout(db, workout.id);
                else setConfirmDiscard(true);
              }}>
              <Text style={[styles.discard, confirmDiscard && { color: '#ff7a7a' }]}>
                {confirmDiscard ? 'toque p/ confirmar' : 'descartar'}
              </Text>
            </Pressable>
          </View>
        </View>

        {active ? (
          <Card borderColor={colors.accentBorderSoft} style={{ marginTop: spacing.sectionGap }}>
            <View style={styles.activeHeader}>
              <View style={{ flexShrink: 1 }}>
                <Text style={styles.exerciseName15}>{active.name}</Text>
                {active.previousSummary ? (
                  <Text style={styles.cardMeta}>anterior: {active.previousSummary}</Text>
                ) : null}
              </View>
              <View style={styles.statusBadge}>
                <Text style={styles.statusBadgeText}>EM ANDAMENTO</Text>
              </View>
            </View>

            {/* grade de séries */}
            <View style={styles.gridHeader}>
              <Text style={[styles.gridLabel, { width: 40 }]}>Série</Text>
              <Text style={[styles.gridLabel, { flex: 1.2, textAlign: 'center' }]}>Carga kg</Text>
              <Text style={[styles.gridLabel, { flex: 1, textAlign: 'center' }]}>Reps</Text>
              <Text style={[styles.gridLabel, { flex: 1, textAlign: 'center' }]}>Anterior</Text>
              <Text style={[styles.gridLabel, { width: 34, textAlign: 'center' }]}>OK</Text>
            </View>

            {active.sets.map((set, i) => {
              const isCurrent = !set.done && active.sets.findIndex((s) => !s.done) === i;
              return (
                <SetRow
                  key={set.id}
                  set={set}
                  index={i}
                  isCurrent={isCurrent}
                  onToggleDone={() => onToggleDone(set)}
                  onCommit={(patch) => commitSet(set.id, patch)}
                />
              );
            })}

            <View style={styles.activeFooter}>
              <Pressable
                onPress={() => addSetToLog(db, active.logId)}
                style={({ pressed }) => [styles.addSetBtn, pressed && { opacity: 0.8 }]}>
                <Text style={styles.addSetText}>+ adicionar série</Text>
              </Pressable>
              <View style={styles.restChip}>
                <Mono size={12} color={colors.accent}>
                  descanso {fmtDuration(restLeft != null && restLeft > 0 ? restLeft : REST_DEFAULT_SEC)}
                </Mono>
              </View>
            </View>
          </Card>
        ) : null}

        {/* fila de exercícios */}
        <View style={{ gap: spacing.cardGap, marginTop: spacing.sectionGap }}>
          {queue.map((e) => (
            <Card key={e.logId} onPress={() => setActiveLogId(e.logId)}>
              <View style={styles.queueRow}>
                <View style={{ flexShrink: 1 }}>
                  <Text style={styles.exerciseName15}>{e.name}</Text>
                  <Text style={styles.cardMeta}>
                    {e.sets.length} séries
                    {e.previousMax != null ? ` · anterior ${fmtNumber(e.previousMax)} kg` : ''}
                  </Text>
                </View>
                {e.logId === nextLogId ? (
                  <Text style={styles.nextLabel}>a seguir ›</Text>
                ) : (
                  <Text style={styles.chevron}>›</Text>
                )}
              </View>
            </Card>
          ))}

          <Pressable
            onPress={() => setPickerOpen(true)}
            style={({ pressed }) => [styles.addExercise, pressed && { opacity: 0.8 }]}>
            <Text style={styles.addExerciseText}>+ adicionar exercício</Text>
          </Pressable>
        </View>
      </Screen>

      <FixedBottomBar>
        <CTAButton
          label={finishing ? 'Salvando…' : 'Finalizar treino'}
          onPress={onFinish}
          style={finishing ? { opacity: 0.6 } : undefined}
        />
      </FixedBottomBar>

      <ExercisePicker
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        excludeIds={workout.exercises.map((e) => e.exerciseId)}
        onPick={async (exerciseId) => {
          setPickerOpen(false);
          await addExerciseToWorkout(db, workout.id, exerciseId);
        }}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Linha da grade de séries
// ---------------------------------------------------------------------------

function SetRow({
  set, index, isCurrent, onToggleDone, onCommit,
}: {
  set: ActiveSet;
  index: number;
  isCurrent: boolean;
  onToggleDone: () => void;
  onCommit: (patch: SetPatch) => void;
}) {
  return (
    <View style={styles.setRow}>
      <Mono size={13} color={colors.text2} style={{ width: 40 }}>{index + 1}</Mono>

      <View style={{ flex: 1.2, paddingHorizontal: 3 }}>
        <TextInput
          defaultValue={set.weight != null ? fmtNumber(set.weight) : ''}
          keyboardType="decimal-pad"
          selectTextOnFocus
          placeholder="—"
          placeholderTextColor={colors.text3}
          onEndEditing={(e) => {
            onCommit({ weight: parseDecimal(e.nativeEvent.text) });
          }}
          style={[styles.setInput, isCurrent && styles.setInputCurrent]}
        />
      </View>

      <View style={{ flex: 1, paddingHorizontal: 3 }}>
        <TextInput
          defaultValue={set.reps != null ? String(set.reps) : ''}
          keyboardType="number-pad"
          selectTextOnFocus
          placeholder="—"
          placeholderTextColor={colors.text3}
          onEndEditing={(e) => {
            const r = parseDecimal(e.nativeEvent.text);
            onCommit({ reps: r != null ? Math.round(r) : null });
          }}
          style={styles.setInput}
        />
      </View>

      <Mono size={12} bold={false} color={colors.text3} style={{ flex: 1, textAlign: 'center' }}>
        {set.previous ?? '—'}
      </Mono>

      <View style={{ width: 34, alignItems: 'center' }}>
        <Pressable
          onPress={onToggleDone}
          hitSlop={8}
          style={[styles.check, set.done && styles.checkDone]}>
          {set.done ? <Text style={styles.checkMark}>✓</Text> : null}
        </Pressable>
      </View>
    </View>
  );
}

function useElapsed(startedAt: number): number {
  const [, force] = useState(0);
  useEffect(() => {
    const t = setInterval(() => force((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);
  return Math.max(0, Math.round((Date.now() - startedAt) / 1000));
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  title: {
    fontFamily: font.uiBold,
    fontSize: 22,
    letterSpacing: -0.44,
    color: colors.text,
    marginTop: 3,
  },
  startHint: {
    fontFamily: font.ui,
    fontSize: 12,
    color: colors.text2,
    marginTop: 14,
    lineHeight: 18,
  },
  timerChip: {
    backgroundColor: colors.surface2,
    borderRadius: radius.pill,
    paddingHorizontal: 13,
    paddingVertical: 7,
  },
  discard: {
    fontFamily: font.ui,
    fontSize: 11,
    color: colors.text3,
  },
  activeHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  statusBadge: {
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusBadgeText: {
    fontFamily: font.monoBold,
    fontSize: 10,
    color: colors.onAccent,
  },
  gridHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 4,
  },
  gridLabel: {
    fontFamily: font.mono,
    fontSize: 10,
    color: colors.text3,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  setInput: {
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.surface2,
    borderRadius: radius.input,
    paddingVertical: 10,
    fontFamily: font.monoBold,
    fontSize: 14,
    color: colors.text,
    textAlign: 'center',
  },
  setInputCurrent: {
    backgroundColor: 'transparent',
    borderColor: colors.accent,
    color: colors.accent,
  },
  check: {
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkDone: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  checkMark: {
    fontFamily: font.uiBold,
    fontSize: 14,
    color: colors.onAccent,
  },
  activeFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
  },
  addSetBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border2,
    borderRadius: radius.input,
    paddingVertical: 11,
    alignItems: 'center',
  },
  addSetText: {
    fontFamily: font.uiMedium,
    fontSize: 12,
    color: colors.text2,
  },
  restChip: {
    backgroundColor: colors.surface2,
    borderRadius: radius.input,
    paddingHorizontal: 13,
    paddingVertical: 11,
  },
  queueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  exerciseName15: {
    fontFamily: font.uiSemiBold,
    fontSize: 15,
    color: colors.text,
  },
  cardMeta: {
    fontFamily: font.ui,
    fontSize: 11,
    color: colors.text2,
    marginTop: 2,
  },
  nextLabel: {
    fontFamily: font.ui,
    fontSize: 12,
    color: colors.text2,
  },
  chevron: {
    fontFamily: font.ui,
    fontSize: 16,
    color: colors.text3,
  },
  deleteBtn: {
    minWidth: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    marginRight: 4,
  },
  deleteText: {
    fontFamily: font.uiMedium,
    fontSize: 13,
    color: colors.text3,
  },
  addExercise: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border2,
    borderRadius: radius.card,
    paddingVertical: 18,
    alignItems: 'center',
  },
  addExerciseText: {
    fontFamily: font.uiMedium,
    fontSize: 13,
    color: colors.text2,
  },
});
