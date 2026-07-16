import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { FixedBottomBar, Screen } from '@/components/screen';
import { CTAButton, SectionLabel } from '@/components/ui';
import { useDb } from '@/data/db-context';
import { addRace, type RaceSegment } from '@/data/repo';
import { colors, font, radius, spacing } from '@/theme/tokens';
import { parseDecimal, parseDuration } from '@/utils/format';

export default function NewRaceScreen() {
  const db = useDb();
  const router = useRouter();

  const [name, setName] = useState('');
  const [dateText, setDateText] = useState(''); // dd/mm/aaaa
  const [location, setLocation] = useState('');
  const [startTime, setStartTime] = useState('');
  const [swimText, setSwimText] = useState(''); // m
  const [bikeText, setBikeText] = useState(''); // km
  const [runText, setRunText] = useState(''); // km
  const [goalText, setGoalText] = useState('');

  const dateISO = parseBRDate(dateText);
  const canSave = name.trim().length > 0 && dateISO != null;

  const save = async () => {
    if (!canSave || dateISO == null) return;
    const segments: RaceSegment[] = [];
    const swim = parseDecimal(swimText);
    const bike = parseDecimal(bikeText);
    const run = parseDecimal(runText);
    if (swim != null && swim > 0) segments.push({ sport: 'swim', label: 'natação', distance_m: swim });
    if (bike != null && bike > 0) segments.push({ sport: 'bike', label: 'pedal', distance_m: bike * 1000 });
    if (run != null && run > 0) segments.push({ sport: 'run', label: 'corrida', distance_m: run * 1000 });

    await addRace(db, {
      name: name.trim(),
      date: dateISO,
      location: location.trim(),
      start_time: startTime.trim(),
      segments,
      goal_sec: goalText.trim() ? parseDuration(goalText) : null,
    });
    router.back();
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Screen hasCTA>
        <View style={styles.header}>
          <Text style={styles.title}>Nova prova</Text>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Text style={styles.cancel}>cancelar</Text>
          </Pressable>
        </View>

        <Field label="Nome" value={name} onChange={setName} placeholder="Aquathlon Rio — Sprint" />
        <View style={styles.row}>
          <Field label="Data" value={dateText} onChange={setDateText} placeholder="10/08/2026" flex keyboard="numbers-and-punctuation" />
          <Field label="Largada" value={startTime} onChange={setStartTime} placeholder="7h00" flex />
        </View>
        <Field label="Local" value={location} onChange={setLocation} placeholder="Copacabana" />

        <SectionLabel style={styles.segmentsLabel}>Segmentos</SectionLabel>
        <View style={styles.row}>
          <Field label="Natação (m)" value={swimText} onChange={setSwimText} placeholder="1000" flex small keyboard="decimal-pad" />
          <Field label="Pedal (km)" value={bikeText} onChange={setBikeText} placeholder="20" flex small keyboard="decimal-pad" />
          <Field label="Corrida (km)" value={runText} onChange={setRunText} placeholder="5" flex small keyboard="decimal-pad" />
        </View>

        <Field label="Meta de tempo (opcional)" value={goalText} onChange={setGoalText} placeholder="35:00" keyboard="numbers-and-punctuation" />
      </Screen>

      <FixedBottomBar>
        <CTAButton label="Salvar prova" onPress={save} style={!canSave ? { opacity: 0.4 } : undefined} />
      </FixedBottomBar>
    </View>
  );
}

function Field({
  label, value, onChange, placeholder, flex = false, small = false, keyboard,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  flex?: boolean;
  small?: boolean;
  keyboard?: 'decimal-pad' | 'numbers-and-punctuation';
}) {
  return (
    <View style={flex ? { flex: 1 } : undefined}>
      <SectionLabel style={[styles.fieldLabel, small && { fontSize: 10, letterSpacing: 0.8 }]}>{label}</SectionLabel>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.text3}
        keyboardType={keyboard}
        style={styles.input}
      />
    </View>
  );
}

/** "10/08/2026" -> "2026-08-10" (null se inválido) */
function parseBRDate(text: string): string | null {
  const m = text.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const [, d, mo, y] = m;
  const day = Number(d);
  const month = Number(mo);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return `${y}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
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
  row: {
    flexDirection: 'row',
    gap: spacing.cardGap,
  },
  fieldLabel: {
    marginTop: spacing.sectionGap,
    marginBottom: 8,
  },
  segmentsLabel: {
    marginTop: spacing.sectionGap + 4,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.input,
    paddingHorizontal: 13,
    paddingVertical: 12,
    fontFamily: font.uiMedium,
    fontSize: 14,
    color: colors.text,
  },
});
