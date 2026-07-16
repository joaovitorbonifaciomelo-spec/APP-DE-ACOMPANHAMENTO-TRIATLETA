import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/screen';
import { Card, Mono, PRBadge, SquareButton } from '@/components/ui';
import { useLiveQuery } from '@/data/hooks';
import { getRaces } from '@/data/repo';
import type { Race } from '@/db/types';
import { colors, font, radius, spacing } from '@/theme/tokens';
import {
  daysUntil, fmtDayMonthCaps, fmtDayMonthYear, fmtDuration, fmtSegmentDistance,
} from '@/utils/format';

export default function ProvasScreen() {
  const router = useRouter();
  const { data } = useLiveQuery((db) => getRaces(db));

  const next = data?.next ?? null;
  const upcoming = data?.upcoming ?? [];
  const results = data?.results ?? [];

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>Provas</Text>
        <SquareButton label="+" accent onPress={() => router.push('/race-new')} />
      </View>

      {next ? (
        <NextRaceCard race={next} />
      ) : (
        <Card
          style={[styles.emptyNext, { marginTop: spacing.sectionGap }]}
          onPress={() => router.push('/race-new')}>
          <Text style={styles.emptyNextText}>+ adicionar próxima prova</Text>
        </Card>
      )}

      {upcoming.length > 0 ? (
        <View style={{ gap: spacing.cardGap, marginTop: spacing.cardGap }}>
          {upcoming.map((r) => (
            <Card key={r.id}>
              <View style={styles.rowBetween}>
                <Text style={styles.raceName15}>{r.name}</Text>
                <Mono size={12} bold={false} color={colors.text2}>{fmtDayMonthCaps(r.date)}</Mono>
              </View>
              <Text style={styles.raceMeta}>
                {r.segments.map((s) => fmtSegmentDistance(s.distance_m)).join(' · ')}
              </Text>
            </Card>
          ))}
        </View>
      ) : null}

      {results.length > 0 ? (
        <View style={{ marginTop: spacing.sectionGap }}>
          <Text style={styles.sectionTitle}>Resultados</Text>
          <View style={{ gap: spacing.cardGap, marginTop: 10 }}>
            {results.map((r) => (
              <Card key={r.id}>
                <View style={styles.rowBetween}>
                  <View style={{ flexShrink: 1 }}>
                    <Text style={styles.raceName13}>{r.name}</Text>
                    <Text style={styles.raceMeta}>{fmtDayMonthYear(r.date)}</Text>
                  </View>
                  <View style={styles.resultRight}>
                    <Mono size={16}>{fmtDuration(r.result_sec ?? 0)}</Mono>
                    {r.is_pr ? <PRBadge /> : null}
                  </View>
                </View>
                {r.splits.length > 0 ? (
                  <View style={styles.splits}>
                    {r.splits.map((s, i) => (
                      <View key={i} style={styles.splitChip}>
                        <Mono size={11} bold={false} color={colors.text2}>
                          {s.label} {fmtDuration(s.sec)}
                        </Mono>
                      </View>
                    ))}
                  </View>
                ) : null}
              </Card>
            ))}
          </View>
        </View>
      ) : null}
    </Screen>
  );
}

function NextRaceCard({ race }: { race: Race }) {
  const days = daysUntil(race.date);
  return (
    <Card borderColor={colors.accentBorderStrong} style={{ marginTop: spacing.sectionGap }}>
      <View style={styles.rowBetween}>
        <View style={styles.nextBadge}>
          <Text style={styles.nextBadgeText}>
            PRÓXIMA{days >= 0 ? ` · ${days} ${days === 1 ? 'DIA' : 'DIAS'}` : ''}
          </Text>
        </View>
        <Mono size={12} bold={false} color={colors.text2}>{fmtDayMonthCaps(race.date)}</Mono>
      </View>

      <Text style={styles.nextName}>{race.name}</Text>
      {race.location || race.start_time ? (
        <Text style={styles.raceMeta}>
          {[race.location, race.start_time ? `largada ${race.start_time}` : null].filter(Boolean).join(' · ')}
        </Text>
      ) : null}

      <View style={styles.segments}>
        {race.segments.map((s, i) => (
          <View key={i} style={styles.segmentCard}>
            <Mono size={14}>{fmtSegmentDistance(s.distance_m)}</Mono>
            <Text style={styles.segmentLabel}>{s.label}</Text>
          </View>
        ))}
        {race.goal_sec != null ? (
          <View style={styles.segmentCard}>
            <Mono size={14} color={colors.accent}>{fmtDuration(race.goal_sec)}</Mono>
            <Text style={styles.segmentLabel}>meta</Text>
          </View>
        ) : null}
      </View>
    </Card>
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
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  nextBadge: {
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  nextBadgeText: {
    fontFamily: font.monoBold,
    fontSize: 10,
    color: colors.onAccent,
  },
  nextName: {
    fontFamily: font.uiBold,
    fontSize: 17,
    letterSpacing: -0.2,
    color: colors.text,
    marginTop: 12,
  },
  raceMeta: {
    fontFamily: font.ui,
    fontSize: 12,
    color: colors.text2,
    marginTop: 3,
  },
  segments: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
  },
  segmentCard: {
    flex: 1,
    backgroundColor: colors.surface2,
    borderRadius: radius.input,
    paddingHorizontal: 11,
    paddingVertical: 10,
  },
  segmentLabel: {
    fontFamily: font.ui,
    fontSize: 11,
    color: colors.text2,
    marginTop: 3,
  },
  raceName15: {
    fontFamily: font.uiSemiBold,
    fontSize: 15,
    color: colors.text,
    flexShrink: 1,
  },
  raceName13: {
    fontFamily: font.uiSemiBold,
    fontSize: 13,
    color: colors.text,
  },
  sectionTitle: {
    fontFamily: font.uiSemiBold,
    fontSize: 15,
    color: colors.text,
  },
  resultRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  splits: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    marginTop: 12,
  },
  splitChip: {
    backgroundColor: colors.surface2,
    borderRadius: radius.badge,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  emptyNext: {
    borderStyle: 'dashed',
    borderColor: colors.border2,
    backgroundColor: 'transparent',
    alignItems: 'center',
    paddingVertical: 22,
  },
  emptyNextText: {
    fontFamily: font.uiMedium,
    fontSize: 13,
    color: colors.text2,
  },
});
