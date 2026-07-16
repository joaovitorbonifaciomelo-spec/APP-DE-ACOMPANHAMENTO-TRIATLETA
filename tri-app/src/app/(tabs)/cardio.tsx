import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { BarChart } from '@/components/bar-chart';
import { Screen } from '@/components/screen';
import { Card, Chip, Mono, SectionLabel } from '@/components/ui';
import { useLiveQuery } from '@/data/hooks';
import { listCardio, type SportFilter } from '@/data/repo';
import { SPORT_LABEL, type CardioActivity, type Sport } from '@/db/types';
import { colors, font, spacing } from '@/theme/tokens';
import {
  fmtDistance, fmtDuration, fmtNumber, fmtPaceSec, fromISODate, isBetterPace,
  MONTHS_FULL, paceFor, WEEKDAYS_SHORT,
} from '@/utils/format';

const FILTERS: { key: SportFilter; label: string }[] = [
  { key: 'run', label: 'Corrida' },
  { key: 'bike', label: 'Pedal' },
  { key: 'swim', label: 'Natação' },
  { key: 'all', label: 'Tudo' },
];

export default function CardioScreen() {
  const [filter, setFilter] = useState<SportFilter>('run');
  const { data: activities } = useLiveQuery((db) => listCardio(db, filter), [filter]);

  const list = activities ?? [];

  // melhor pace por esporte (entre os listados) p/ destacar em accent
  const bestBySport = useMemo(() => {
    const best = new Map<Sport, number>();
    for (const a of list) {
      const p = paceFor(a.sport as Sport, a.distance_m, a.duration_sec);
      if (!p) continue;
      const cur = best.get(a.sport as Sport);
      if (cur === undefined || isBetterPace(a.sport as Sport, p.raw, cur)) best.set(a.sport as Sport, p.raw);
    }
    return best;
  }, [list]);

  const months = useMemo(() => groupByMonth(list), [list]);

  return (
    <Screen>
      <Text style={styles.title}>Cardio</Text>

      <View style={styles.filters}>
        {FILTERS.map((f) => (
          <Chip key={f.key} label={f.label} active={filter === f.key} onPress={() => setFilter(f.key)} />
        ))}
      </View>

      {filter !== 'all' ? <TrendCard sport={filter} activities={list} /> : null}

      {months.map((m) => (
        <View key={m.key} style={{ marginTop: spacing.sectionGap }}>
          <Text style={styles.monthTitle}>{m.label}</Text>
          <View style={{ gap: spacing.cardGap, marginTop: 10 }}>
            {m.items.map((a) => {
              const sport = a.sport as Sport;
              const pace = paceFor(sport, a.distance_m, a.duration_sec);
              const isBest = pace != null && bestBySport.get(sport) === pace.raw && m.items.length > 0;
              const d = fromISODate(a.date);
              return (
                <Card key={a.id}>
                  <View style={styles.itemRow}>
                    <View style={styles.dateBlock}>
                      <Mono size={16}>{String(d.getDate()).padStart(2, '0')}</Mono>
                      <Text style={styles.dateWeekday}>{WEEKDAYS_SHORT[d.getDay()].toUpperCase()}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemTitle}>{a.title || SPORT_LABEL[sport]}</Text>
                      <Text style={styles.itemMeta}>
                        {fmtDistance(sport, a.distance_m)} · {fmtDuration(a.duration_sec)}
                      </Text>
                    </View>
                    {pace ? (
                      <Text>
                        <Mono size={14} color={isBest ? colors.accent : colors.text}>{pace.value}</Mono>
                        <Mono size={11} bold={false} color={colors.text2}>
                          {pace.unit === 'km/h' ? ` ${pace.unit}` : pace.unit}
                        </Mono>
                      </Text>
                    ) : null}
                  </View>
                </Card>
              );
            })}
          </View>
        </View>
      ))}
    </Screen>
  );
}

// ---------------------------------------------------------------------------
// Card de tendência: pace médio dos últimos 8 treinos
// ---------------------------------------------------------------------------

function TrendCard({ sport, activities }: { sport: Sport; activities: CardioActivity[] }) {
  // cronológico: mais antigo -> mais recente
  const last8 = useMemo(
    () =>
      [...activities]
        .sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id)
        .slice(-8)
        .map((a) => paceFor(sport, a.distance_m, a.duration_sec))
        .filter((p): p is NonNullable<typeof p> => p != null),
    [activities, sport],
  );

  if (last8.length < 2) return null;

  const raws = last8.map((p) => p.raw);
  const half = Math.floor(raws.length / 2);
  const avg = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;
  const delta = avg(raws.slice(half)) - avg(raws.slice(0, half));
  const improving = sport === 'bike' ? delta > 0 : delta < 0;

  const deltaLabel =
    sport === 'bike'
      ? `${delta >= 0 ? '+' : '-'}${fmtNumber(Math.abs(delta), 1)} km/h`
      : `${delta <= 0 ? '▼ -' : '▲ +'}${fmtPaceSec(Math.abs(delta))}${sport === 'swim' ? '/100m' : '/km'}`;

  const best = sport === 'bike' ? Math.max(...raws) : Math.min(...raws);

  return (
    <Card style={{ marginTop: spacing.sectionGap }}>
      <View style={styles.trendHeader}>
        <SectionLabel style={{ flexShrink: 1 }}>
          {sport === 'bike' ? 'Velocidade média' : 'Pace médio'} · últimos {last8.length} treinos
        </SectionLabel>
        <Mono size={12} color={improving ? colors.accent : colors.text2}>{deltaLabel}</Mono>
      </View>

      <View style={{ marginTop: 14 }}>
        <BarChart
          height={52}
          gap={5}
          minRatio={0.55}
          bars={raws.map((r, i) => ({ value: r, highlight: i === raws.length - 1 }))}
        />
      </View>

      <View style={styles.trendFooter}>
        <Mono size={10} bold={false} color={colors.text3}>{fmtTrendValue(sport, raws[0])}</Mono>
        <Mono size={10} bold={false} color={colors.text3}>melhor: {fmtTrendValue(sport, best)}</Mono>
        <Mono size={10} bold={false} color={colors.text3}>{fmtTrendValue(sport, raws[raws.length - 1])}</Mono>
      </View>
    </Card>
  );
}

function fmtTrendValue(sport: Sport, raw: number): string {
  return sport === 'bike' ? fmtNumber(raw, 1) : fmtPaceSec(raw);
}

// ---------------------------------------------------------------------------

function groupByMonth(list: CardioActivity[]) {
  const now = new Date();
  const groups: { key: string; label: string; items: CardioActivity[] }[] = [];
  for (const a of list) {
    const d = fromISODate(a.date);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    let g = groups.find((x) => x.key === key);
    if (!g) {
      const label =
        d.getFullYear() === now.getFullYear()
          ? MONTHS_FULL[d.getMonth()]
          : `${MONTHS_FULL[d.getMonth()]} ${d.getFullYear()}`;
      g = { key, label, items: [] };
      groups.push(g);
    }
    g.items.push(a);
  }
  return groups;
}

const styles = StyleSheet.create({
  title: {
    fontFamily: font.uiBold,
    fontSize: 24,
    letterSpacing: -0.48,
    color: colors.text,
    marginTop: 6,
  },
  filters: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
  },
  trendHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  trendFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  monthTitle: {
    fontFamily: font.uiSemiBold,
    fontSize: 15,
    color: colors.text,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
  },
  dateBlock: {
    width: 40,
    alignItems: 'center',
  },
  dateWeekday: {
    fontFamily: font.ui,
    fontSize: 9,
    color: colors.text3,
    letterSpacing: 0.5,
    marginTop: 2,
  },
  itemTitle: {
    fontFamily: font.uiSemiBold,
    fontSize: 13,
    color: colors.text,
  },
  itemMeta: {
    fontFamily: font.ui,
    fontSize: 11,
    color: colors.text2,
    marginTop: 2,
  },
});
