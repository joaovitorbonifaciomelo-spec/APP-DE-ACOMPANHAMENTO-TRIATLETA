import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { BarChart } from '@/components/bar-chart';
import { Screen } from '@/components/screen';
import { Card, DeltaTag, Mono, SectionLabel, SectionTitle } from '@/components/ui';
import { useLiveQuery } from '@/data/hooks';
import { getExerciseProgress, getRecentCardio, getWeekSummary } from '@/data/repo';
import { SPORT_TAG, type Sport } from '@/db/types';
import { colors, font, spacing } from '@/theme/tokens';
import {
  fmtDistance, fmtDuration, fmtNumber, isoWeek, MONTHS_SHORT, paceFor, relativeDayLabel, WEEK_AXIS,
} from '@/utils/format';

export default function Dashboard() {
  const router = useRouter();
  const { data: week } = useLiveQuery((db) => getWeekSummary(db));
  const { data: progress } = useLiveQuery((db) => getExerciseProgress(db, 3));
  const { data: recent } = useLiveQuery((db) => getRecentCardio(db, 3));

  const now = new Date();
  const weekLabel = `Semana ${isoWeek(now)} · ${MONTHS_SHORT[now.getMonth()]} ${now.getFullYear()}`;

  return (
    <Screen>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <SectionLabel>{weekLabel}</SectionLabel>
          <Text style={styles.hello}>Olá, Atleta</Text>
        </View>
        <View style={styles.avatar}>
          <Text style={styles.avatarInitial}>A</Text>
        </View>
      </View>

      {/* Volume da semana */}
      <Card style={{ marginTop: spacing.sectionGap }}>
        <View style={styles.volumeHeader}>
          <SectionLabel>Volume da semana</SectionLabel>
          <Mono size={11} color={colors.accent}>{week ? `${week.workoutsCount} treinos` : '—'}</Mono>
        </View>

        <View style={styles.volumeCols}>
          <VolumeCol value={week ? fmtNumber(week.runKm) : '—'} sport="Corrida" />
          <View style={styles.volumeDivider} />
          <VolumeCol value={week ? fmtNumber(week.bikeKm) : '—'} sport="Pedal" />
          <View style={styles.volumeDivider} />
          <VolumeCol value={week ? fmtNumber(week.swimKm) : '—'} sport="Natação" />
        </View>

        <View style={{ marginTop: 16 }}>
          <BarChart
            height={44}
            gap={5}
            bars={WEEK_AXIS.map((label, i) => {
              const minutes = week?.dayMinutes[i] ?? 0;
              const future = week ? i > week.todayIndex : false;
              return {
                value: future ? null : minutes,
                dashed: future,
                highlight: minutes > 0,
                label,
              };
            })}
          />
        </View>
      </Card>

      {/* Evolução de carga */}
      <View style={{ marginTop: spacing.sectionGap }}>
        <SectionTitle link="ver tudo" onLinkPress={() => router.navigate('/forca')}>
          Evolução de carga
        </SectionTitle>
        <View style={{ gap: spacing.cardGap, marginTop: 10 }}>
          {(progress ?? []).map((p, idx) => (
            <Card key={p.exerciseId} onPress={() => router.push(`/exercise/${p.exerciseId}`)}>
              <View style={styles.progressRow}>
                <View style={{ flexShrink: 1 }}>
                  <Text style={styles.exerciseName}>{p.name}</Text>
                  <Text style={styles.exerciseMeta}>último: {p.lastScheme}</Text>
                </View>
                <View style={styles.progressValue}>
                  <Mono size={18}>{fmtNumber(p.currentMax)} kg</Mono>
                  {p.delta != null ? <DeltaTag delta={p.delta} /> : null}
                </View>
              </View>
              {idx === 0 && p.spark.length > 1 ? (
                <View style={{ marginTop: 12 }}>
                  <BarChart
                    height={26}
                    gap={4}
                    barRadius={2}
                    minRatio={0.5}
                    bars={p.spark.map((v, i) => ({ value: v, highlight: i === p.spark.length - 1 }))}
                  />
                </View>
              ) : null}
            </Card>
          ))}
        </View>
      </View>

      {/* Últimos treinos */}
      <View style={{ marginTop: spacing.sectionGap }}>
        <SectionTitle>Últimos treinos</SectionTitle>
        <View style={{ gap: spacing.cardGap, marginTop: 10 }}>
          {(recent ?? []).map((a) => {
            const pace = paceFor(a.sport as Sport, a.distance_m, a.duration_sec);
            return (
              <Card key={a.id} onPress={() => router.navigate('/cardio')}>
                <View style={styles.activityRow}>
                  <View style={styles.activityIcon}>
                    <Mono size={10} color={colors.accent}>{SPORT_TAG[a.sport as Sport]}</Mono>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.exerciseName}>{a.title}</Text>
                    <Text style={styles.exerciseMeta}>
                      {relativeDayLabel(a.date)} · {fmtDistance(a.sport as Sport, a.distance_m)} · {fmtDuration(a.duration_sec)}
                    </Text>
                  </View>
                  {pace ? (
                    <Text>
                      <Mono size={13}>{pace.value}</Mono>
                      <Mono size={11} color={colors.text2} bold={false}>{pace.unit === 'km/h' ? ` ${pace.unit}` : pace.unit}</Mono>
                    </Text>
                  ) : null}
                </View>
              </Card>
            );
          })}
        </View>
      </View>
    </Screen>
  );
}

function VolumeCol({ value, sport }: { value: string; sport: string }) {
  return (
    <View style={styles.volumeCol}>
      <Text>
        <Mono size={22}>{value}</Mono>
        <Mono size={12} color={colors.text2} bold={false}> km</Mono>
      </Text>
      <Text style={styles.volumeSport}>{sport}</Text>
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
  hello: {
    fontFamily: font.uiBold,
    fontSize: 26,
    letterSpacing: -0.52,
    color: colors.text,
    marginTop: 3,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontFamily: font.uiBold,
    fontSize: 15,
    color: colors.accent,
  },
  volumeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  volumeCols: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginTop: 14,
  },
  volumeCol: {
    flex: 1,
  },
  volumeDivider: {
    width: 1,
    backgroundColor: colors.border,
    marginHorizontal: 12,
  },
  volumeSport: {
    fontFamily: font.ui,
    fontSize: 12,
    color: colors.text2,
    marginTop: 3,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  progressValue: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 7,
  },
  exerciseName: {
    fontFamily: font.uiSemiBold,
    fontSize: 13,
    color: colors.text,
  },
  exerciseMeta: {
    fontFamily: font.ui,
    fontSize: 11,
    color: colors.text2,
    marginTop: 2,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  activityIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
