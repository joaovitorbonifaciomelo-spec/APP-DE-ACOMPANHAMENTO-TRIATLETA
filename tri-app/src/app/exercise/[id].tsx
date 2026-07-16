import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { BarChart } from '@/components/bar-chart';
import { Screen } from '@/components/screen';
import { Card, Mono, PRBadge, SectionLabel, SquareButton } from '@/components/ui';
import { useLiveQuery } from '@/data/hooks';
import { getExerciseDetail } from '@/data/repo';
import { colors, font, spacing } from '@/theme/tokens';
import { fmtDayMonth, fmtNumber } from '@/utils/format';

export default function ExerciseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data } = useLiveQuery((db) => getExerciseDetail(db, Number(id)), [id]);

  if (!data) return <Screen>{null}</Screen>;

  const { exercise, sessions, currentMax, allTimePR, pctChange8w } = data;
  const chartSessions = sessions.slice(-8);
  const recentFirst = [...sessions].reverse();

  return (
    <Screen>
      {/* Header com voltar + breadcrumb */}
      <View style={styles.header}>
        <SquareButton label="‹" onPress={() => router.back()} />
        <View style={{ flexShrink: 1 }}>
          <SectionLabel>Força{exercise.muscle_group ? ` · ${exercise.muscle_group}` : ''}</SectionLabel>
          <Text style={styles.title}>{exercise.name}</Text>
        </View>
      </View>

      {/* Stat cards */}
      <View style={styles.stats}>
        <Card style={styles.statCard}>
          <Text>
            <Mono size={20} color={colors.accent}>{fmtNumber(currentMax)}</Mono>
            <Mono size={11} color={colors.accent}> kg</Mono>
          </Text>
          <Text style={styles.statLabel}>carga atual</Text>
        </Card>
        <Card style={styles.statCard}>
          <Mono size={20}>
            {pctChange8w != null ? `${pctChange8w >= 0 ? '+' : ''}${Math.round(pctChange8w)}%` : '—'}
          </Mono>
          <Text style={styles.statLabel}>em 8 semanas</Text>
        </Card>
        <Card style={styles.statCard}>
          <Mono size={20}>{fmtNumber(allTimePR)}</Mono>
          <Text style={styles.statLabel}>PR (kg)</Text>
        </Card>
      </View>

      {/* Gráfico de carga máxima por sessão */}
      <Card style={{ marginTop: spacing.cardGap }}>
        <View style={styles.chartHeader}>
          <SectionLabel>Carga máxima por sessão</SectionLabel>
          <Mono size={11} bold={false} color={colors.text3}>{chartSessions.length} sem</Mono>
        </View>
        <View style={{ marginTop: 14 }}>
          <BarChart
            height={88}
            gap={6}
            minRatio={0.62}
            labelSize={9}
            bars={chartSessions.map((s, i) => ({
              value: s.maxWeight,
              highlight: i === chartSessions.length - 1,
              label: fmtNumber(s.maxWeight),
              labelHighlight: i === chartSessions.length - 1,
            }))}
          />
        </View>
      </Card>

      {/* Histórico de sessões */}
      <View style={{ marginTop: spacing.sectionGap }}>
        <Text style={styles.sectionTitle}>Histórico de sessões</Text>
        <View style={{ gap: spacing.cardGap, marginTop: 10 }}>
          {recentFirst.map((s) => (
            <Card key={`${s.workoutId}-${s.date}`}>
              <View style={styles.sessionRow}>
                <View style={{ flexShrink: 1 }}>
                  <Text style={styles.sessionDate}>{fmtDayMonth(s.date)}</Text>
                  <Text style={styles.sessionWeights}>
                    {s.weights.map((w) => fmtNumber(w)).join(' · ')} kg
                  </Text>
                </View>
                <View style={styles.sessionRight}>
                  <Mono size={12} bold={false} color={colors.text2}>{s.scheme}</Mono>
                  {s.isPR ? <PRBadge /> : null}
                </View>
              </View>
            </Card>
          ))}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    marginTop: 6,
  },
  title: {
    fontFamily: font.uiBold,
    fontSize: 20,
    letterSpacing: -0.4,
    color: colors.text,
    marginTop: 2,
  },
  stats: {
    flexDirection: 'row',
    gap: spacing.cardGap,
    marginTop: spacing.sectionGap,
  },
  statCard: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  statLabel: {
    fontFamily: font.ui,
    fontSize: 11,
    color: colors.text2,
    marginTop: 5,
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontFamily: font.uiSemiBold,
    fontSize: 15,
    color: colors.text,
  },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  sessionDate: {
    fontFamily: font.uiSemiBold,
    fontSize: 13,
    color: colors.text,
  },
  sessionWeights: {
    fontFamily: font.ui,
    fontSize: 11,
    color: colors.text2,
    marginTop: 3,
  },
  sessionRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
