import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { FixedBottomBar, Screen } from '@/components/screen';
import { Card, CTAButton, Mono, SectionLabel } from '@/components/ui';
import { useDb } from '@/data/db-context';
import { addCardio } from '@/data/repo';
import { SPORT_LABEL, type Sport } from '@/db/types';
import { colors, font, radius, spacing } from '@/theme/tokens';
import { daysAgoISO, fmtDayMonth, paceFor, parseDecimal, parseDuration, relativeDayLabel } from '@/utils/format';

const SPORTS: Sport[] = ['run', 'bike', 'swim', 'other'];

export default function NewCardioScreen() {
  const db = useDb();
  const router = useRouter();

  const [sport, setSport] = useState<Sport>('run');
  const [daysAgo, setDaysAgo] = useState(0);
  const [distanceText, setDistanceText] = useState('');
  const [durationText, setDurationText] = useState('');
  const [notes, setNotes] = useState('');
  const [focused, setFocused] = useState<'dist' | 'time' | null>(null);

  const distanceUnit = sport === 'swim' ? 'm' : 'km';

  const pace = useMemo(() => {
    const dist = parseDecimal(distanceText);
    const dur = parseDuration(durationText);
    if (dist == null || dur == null || dist <= 0 || dur <= 0) return null;
    const distanceM = sport === 'swim' ? dist : dist * 1000;
    return paceFor(sport, distanceM, dur);
  }, [sport, distanceText, durationText]);

  const canSave = pace != null;

  const save = async () => {
    const dist = parseDecimal(distanceText);
    const dur = parseDuration(durationText);
    if (dist == null || dur == null) return;
    await addCardio(db, {
      sport,
      title: '',
      date: daysAgoISO(daysAgo),
      distance_m: sport === 'swim' ? dist : dist * 1000,
      duration_sec: dur,
      notes: notes.trim(),
    });
    router.back();
  };

  const dateISO = daysAgoISO(daysAgo);
  const rel = relativeDayLabel(dateISO);
  const dateLabel = `${rel.charAt(0).toUpperCase()}${rel.slice(1)}, ${fmtDayMonth(dateISO)}`;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Screen hasCTA>
        <View style={styles.header}>
          <Text style={styles.title}>Novo treino</Text>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Text style={styles.cancel}>cancelar</Text>
          </Pressable>
        </View>

        {/* Modalidade */}
        <SectionLabel style={styles.label}>Modalidade</SectionLabel>
        <View style={styles.sportGrid}>
          {SPORTS.map((s) => {
            const active = sport === s;
            return (
              <Pressable
                key={s}
                onPress={() => setSport(s)}
                style={[styles.sportBtn, active && styles.sportBtnActive]}>
                <Text style={[styles.sportBtnText, active && styles.sportBtnTextActive]}>
                  {SPORT_LABEL[s]}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Data */}
        <SectionLabel style={styles.label}>Data</SectionLabel>
        <Card style={styles.dateRow}>
          <Text style={styles.dateText}>{dateLabel}</Text>
          <View style={styles.dateControls}>
            <Pressable onPress={() => setDaysAgo((d) => d + 1)} hitSlop={8} style={styles.dateStep}>
              <Text style={styles.dateStepText}>‹</Text>
            </Pressable>
            <Pressable
              onPress={() => setDaysAgo((d) => Math.max(0, d - 1))}
              hitSlop={8}
              style={[styles.dateStep, daysAgo === 0 && { opacity: 0.35 }]}>
              <Text style={styles.dateStepText}>›</Text>
            </Pressable>
          </View>
        </Card>

        {/* Distância / Tempo */}
        <View style={styles.bigInputs}>
          <View style={{ flex: 1 }}>
            <SectionLabel style={styles.label}>Distância</SectionLabel>
            <View style={[styles.bigInputBox, focused === 'dist' && styles.bigInputBoxFocused]}>
              <TextInput
                value={distanceText}
                onChangeText={setDistanceText}
                onFocus={() => setFocused('dist')}
                onBlur={() => setFocused((f) => (f === 'dist' ? null : f))}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={colors.text3}
                style={[styles.bigInput, focused === 'dist' && { color: colors.accent }]}
              />
              <Mono size={12} bold={false} color={colors.text2}> {distanceUnit}</Mono>
            </View>
          </View>
          <View style={{ flex: 1 }}>
            <SectionLabel style={styles.label}>Tempo</SectionLabel>
            <View style={[styles.bigInputBox, focused === 'time' && styles.bigInputBoxFocused]}>
              <TextInput
                value={durationText}
                onChangeText={setDurationText}
                onFocus={() => setFocused('time')}
                onBlur={() => setFocused((f) => (f === 'time' ? null : f))}
                keyboardType="numbers-and-punctuation"
                placeholder="45:10"
                placeholderTextColor={colors.text3}
                style={[styles.bigInput, focused === 'time' && { color: colors.accent }]}
              />
            </View>
          </View>
        </View>

        {/* Pace calculado */}
        <Card style={styles.paceCard}>
          <SectionLabel>{sport === 'bike' ? 'Velocidade' : 'Pace calculado'}</SectionLabel>
          <Text>
            <Mono size={22} color={pace ? colors.accent : colors.text3}>{pace ? pace.value : '—'}</Mono>
            {pace ? (
              <Mono size={12} color={colors.text2} bold={false}>
                {pace.unit === 'km/h' ? ` ${pace.unit}` : ` ${pace.unit}`}
              </Mono>
            ) : null}
          </Text>
        </Card>

        {/* Notas */}
        <SectionLabel style={styles.label}>Notas (opcional)</SectionLabel>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder="Como foi o treino?"
          placeholderTextColor={colors.text3}
          multiline
          textAlignVertical="top"
          style={styles.notes}
        />
      </Screen>

      <FixedBottomBar>
        <CTAButton label="Salvar treino" onPress={save} style={!canSave ? { opacity: 0.4 } : undefined} />
      </FixedBottomBar>
    </View>
  );
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
    fontSize: 24,
    letterSpacing: -0.48,
    color: colors.text,
  },
  cancel: {
    fontFamily: font.ui,
    fontSize: 13,
    color: colors.text2,
  },
  label: {
    marginTop: spacing.sectionGap,
    marginBottom: 9,
  },
  sportGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  sportBtn: {
    flex: 1,
    backgroundColor: colors.surface2,
    borderRadius: radius.input,
    paddingVertical: 12,
    alignItems: 'center',
  },
  sportBtnActive: {
    backgroundColor: colors.accent,
  },
  sportBtnText: {
    fontFamily: font.uiSemiBold,
    fontSize: 13,
    color: colors.text2,
  },
  sportBtnTextActive: {
    color: colors.onAccent,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
  },
  dateText: {
    fontFamily: font.uiMedium,
    fontSize: 14,
    color: colors.text,
  },
  dateControls: {
    flexDirection: 'row',
    gap: 8,
  },
  dateStep: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateStepText: {
    fontFamily: font.uiSemiBold,
    fontSize: 16,
    color: colors.text2,
    lineHeight: 19,
  },
  bigInputs: {
    flexDirection: 'row',
    gap: spacing.cardGap,
  },
  bigInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.cardSm,
    paddingVertical: 6,
    minHeight: 66,
  },
  bigInputBoxFocused: {
    borderColor: colors.accent,
    backgroundColor: 'transparent',
  },
  bigInput: {
    fontFamily: font.monoBold,
    fontSize: 24,
    color: colors.text,
    textAlign: 'center',
    minWidth: 52,
    padding: 0,
  },
  paceCard: {
    marginTop: spacing.cardGap,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface2,
  },
  notes: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.cardSm,
    minHeight: 96,
    padding: 13,
    fontFamily: font.ui,
    fontSize: 13,
    color: colors.text,
  },
});
