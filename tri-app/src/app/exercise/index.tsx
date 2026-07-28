import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { BarChart } from '@/components/bar-chart';
import { Screen } from '@/components/screen';
import { Card, DeltaTag, Mono, SectionLabel, SquareButton } from '@/components/ui';
import { useLiveQuery } from '@/data/hooks';
import { getExerciseProgress } from '@/data/repo';
import { colors, font, spacing } from '@/theme/tokens';
import { fmtNumber } from '@/utils/format';

/** Lista completa de evolução de carga — destino do "ver tudo" do dashboard. */
export default function ExerciseListScreen() {
  const router = useRouter();
  const { data: progress } = useLiveQuery((db) => getExerciseProgress(db));

  return (
    <Screen>
      <View style={styles.header}>
        <SquareButton label="‹" onPress={() => router.back()} />
        <View>
          <SectionLabel>Força</SectionLabel>
          <Text style={styles.title}>Evolução de carga</Text>
        </View>
      </View>

      {progress != null && progress.length === 0 ? (
        <Card style={styles.empty}>
          <Text style={styles.emptyText}>
            Nenhum treino de força registrado ainda. Inicie um treino na aba Força para começar a
            acompanhar sua evolução de carga.
          </Text>
        </Card>
      ) : (
        <View style={{ gap: spacing.cardGap, marginTop: spacing.sectionGap }}>
          {(progress ?? []).map((p, idx) => (
            <Card key={p.exerciseId} onPress={() => router.push(`/exercise/${p.exerciseId}`)}>
              <View style={styles.row}>
                <View style={{ flexShrink: 1 }}>
                  <Text style={styles.exerciseName}>{p.name}</Text>
                  <Text style={styles.exerciseMeta}>último: {p.lastScheme}</Text>
                </View>
                <View style={styles.valueCol}>
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
      )}
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  valueCol: {
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
  empty: {
    marginTop: spacing.sectionGap,
  },
  emptyText: {
    fontFamily: font.ui,
    fontSize: 12,
    color: colors.text2,
    lineHeight: 18,
  },
});
