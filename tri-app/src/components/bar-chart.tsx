import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, font } from '@/theme/tokens';

export interface Bar {
  /** valor da barra; null = vazio (dashed) */
  value: number | null;
  /** barra destacada em accent */
  highlight?: boolean;
  /** contorno dashed (dia futuro / sem dado) */
  dashed?: boolean;
  /** rótulo do eixo (embaixo) */
  label?: string;
  /** rótulo destacado em accent */
  labelHighlight?: boolean;
}

/**
 * Gráfico de barras do design: divs com radius 2–3px, gap 3–5px,
 * destaque em accent, demais em bar-muted, vazio/futuro em dashed.
 */
export function BarChart({
  bars, height, gap = 5, barRadius = 3, minRatio = 0.14, labelSize = 10,
}: {
  bars: Bar[];
  height: number;
  gap?: number;
  barRadius?: number;
  /** altura mínima (fração) p/ barras com valor > 0 muito pequeno */
  minRatio?: number;
  labelSize?: number;
}) {
  const values = bars.map((b) => b.value ?? 0);
  const max = Math.max(...values, 1);
  const hasLabels = bars.some((b) => b.label != null);

  return (
    <View>
      <View style={[styles.row, { height, gap }]}>
        {bars.map((b, i) => {
          if (b.value == null || b.dashed) {
            return (
              <View
                key={i}
                style={[styles.bar, styles.dashed, { height: b.value != null ? barHeight(b.value, max, height, minRatio) : height, borderRadius: barRadius }]}
              />
            );
          }
          return (
            <View
              key={i}
              style={[
                styles.bar,
                {
                  height: barHeight(b.value, max, height, minRatio),
                  borderRadius: barRadius,
                  backgroundColor: b.highlight ? colors.accent : colors.barMuted,
                },
              ]}
            />
          );
        })}
      </View>
      {hasLabels ? (
        <View style={[styles.row, { gap, marginTop: 7 }]}>
          {bars.map((b, i) => (
            <Text
              key={i}
              numberOfLines={1}
              style={[
                styles.label,
                { fontSize: labelSize, color: b.labelHighlight ? colors.accent : colors.text3 },
              ]}>
              {b.label ?? ''}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function barHeight(value: number, max: number, height: number, minRatio: number): number {
  if (value <= 0) return Math.max(3, height * 0.06);
  return Math.max(height * minRatio, (value / max) * height);
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  bar: {
    flex: 1,
  },
  dashed: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border2,
    backgroundColor: 'transparent',
  },
  label: {
    flex: 1,
    fontFamily: font.mono,
    textAlign: 'center',
  },
});
