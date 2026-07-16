import React from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';

import { colors, font, radius, spacing } from '@/theme/tokens';

// ---------------------------------------------------------------------------
// Card
// ---------------------------------------------------------------------------

export function Card({
  children, style, onPress, borderColor,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  borderColor?: string;
}) {
  const base = [styles.card, borderColor ? { borderColor } : null, style];
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [...base, pressed && { opacity: 0.82 }]}>
        {children}
      </Pressable>
    );
  }
  return <View style={base}>{children}</View>;
}

// ---------------------------------------------------------------------------
// Textos
// ---------------------------------------------------------------------------

/** Label de seção em caps: 12px, text-2, tracking 0.08em */
export function SectionLabel({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.sectionLabel, style]}>{children}</Text>;
}

/** Título de seção (13–15/600) com link opcional à direita */
export function SectionTitle({
  children, link, onLinkPress,
}: { children: React.ReactNode; link?: string; onLinkPress?: () => void }) {
  return (
    <View style={styles.sectionTitleRow}>
      <Text style={styles.sectionTitle}>{children}</Text>
      {link ? (
        <Pressable onPress={onLinkPress} hitSlop={8}>
          <Text style={styles.sectionLink}>{link}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/** Números/dados — JetBrains Mono */
export function Mono({
  children, size = 14, color = colors.text, bold = true, style,
}: {
  children: React.ReactNode; size?: number; color?: string; bold?: boolean; style?: StyleProp<TextStyle>;
}) {
  return (
    <Text style={[{ fontFamily: bold ? font.monoBold : font.mono, fontSize: size, color }, style]}>
      {children}
    </Text>
  );
}

// ---------------------------------------------------------------------------
// Chips e badges
// ---------------------------------------------------------------------------

/** Chip pill (filtros, cronômetro, descanso) */
export function Chip({
  label, active = false, mono = false, onPress, style,
}: {
  label: string; active?: boolean; mono?: boolean; onPress?: () => void; style?: StyleProp<ViewStyle>;
}) {
  const content = (
    <View style={[styles.chip, active && styles.chipActive, style]}>
      <Text
        style={{
          fontFamily: mono ? font.monoBold : font.uiSemiBold,
          fontSize: mono ? 12 : 13,
          color: active ? colors.onAccent : mono ? colors.accent : colors.text2,
        }}>
        {label}
      </Text>
    </View>
  );
  return onPress ? (
    <Pressable onPress={onPress} style={({ pressed }) => pressed && { opacity: 0.8 }}>{content}</Pressable>
  ) : content;
}

/** Badge PR: fundo accent, mono 10px bold */
export function PRBadge() {
  return (
    <View style={styles.prBadge}>
      <Text style={styles.prBadgeText}>PR</Text>
    </View>
  );
}

/** Delta de evolução: ▲ +5 (accent) · = 0 (text-2) · ▼ p/ pace melhorando */
export function DeltaTag({ delta, unit = '', invert = false }: { delta: number; unit?: string; invert?: boolean }) {
  const improved = invert ? delta < 0 : delta > 0;
  const stable = delta === 0;
  const arrow = stable ? '=' : delta > 0 ? '▲' : '▼';
  const value = stable
    ? '0'
    : `${delta > 0 ? '+' : '-'}${Math.abs(Number.isInteger(delta) ? delta : Number(delta.toFixed(1)))}`.replace('.', ',');
  const color = stable ? colors.text2 : improved ? colors.accent : colors.text2;
  return (
    <Text style={{ fontFamily: font.monoBold, fontSize: 12, color }}>
      {arrow} {value}{unit}
    </Text>
  );
}

// ---------------------------------------------------------------------------
// Botões
// ---------------------------------------------------------------------------

/** Botão CTA em accent (full-width) */
export function CTAButton({ label, onPress, style }: { label: string; onPress: () => void; style?: StyleProp<ViewStyle> }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.cta, pressed && { opacity: 0.85 }, style]}>
      <Text style={styles.ctaText}>{label}</Text>
    </Pressable>
  );
}

/** Botão quadrado 34px (voltar, "+" do header) */
export function SquareButton({
  label, onPress, accent = false, size = 34,
}: { label: string; onPress?: () => void; accent?: boolean; size?: number }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [
        styles.squareBtn,
        { width: size, height: size },
        pressed && { opacity: 0.8 },
      ]}>
      <Text style={{ fontFamily: font.uiSemiBold, fontSize: 17, color: accent ? colors.accent : colors.text2, lineHeight: 20 }}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.card,
    padding: spacing.cardPad,
  },
  sectionLabel: {
    fontFamily: font.ui,
    fontSize: 12,
    color: colors.text2,
    letterSpacing: 0.96, // 0.08em @ 12px
    textTransform: 'uppercase',
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontFamily: font.uiSemiBold,
    fontSize: 15,
    color: colors.text,
  },
  sectionLink: {
    fontFamily: font.ui,
    fontSize: 12,
    color: colors.text2,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.surface2,
  },
  chipActive: {
    backgroundColor: colors.accent,
  },
  prBadge: {
    backgroundColor: colors.accent,
    borderRadius: radius.badge + 2,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  prBadgeText: {
    fontFamily: font.monoBold,
    fontSize: 10,
    color: colors.onAccent,
  },
  cta: {
    backgroundColor: colors.accent,
    borderRadius: radius.cta,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
  },
  ctaText: {
    fontFamily: font.uiBold,
    fontSize: 15,
    color: colors.onAccent,
  },
  squareBtn: {
    borderRadius: 10,
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
