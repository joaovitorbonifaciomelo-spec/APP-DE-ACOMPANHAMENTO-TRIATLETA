import React from 'react';
import { ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, CTA_BAR_HEIGHT, spacing, TAB_BAR_HEIGHT } from '@/theme/tokens';

/**
 * Container de tela: fundo bg, safe area no topo, padding lateral 18
 * e padding inferior para a tab bar (ou barra de CTA fixa).
 */
export function Screen({
  children, hasCTA = false, scrollable = true, style,
}: {
  children: React.ReactNode;
  /** true nas telas com CTA fixo no rodapé */
  hasCTA?: boolean;
  scrollable?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const insets = useSafeAreaInsets();
  const paddingBottom = (hasCTA ? CTA_BAR_HEIGHT : TAB_BAR_HEIGHT + 26) + insets.bottom;

  if (!scrollable) {
    return (
      <View style={[styles.root, { paddingTop: insets.top + 10 }]}>
        <View style={[styles.content, { paddingBottom }, style]}>{children}</View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 10, paddingBottom },
          style,
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
    </View>
  );
}

/** Barra fixa inferior para CTA (mesmo fundo da tab bar) */
export function FixedBottomBar({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.ctaBar, { paddingBottom: insets.bottom + 12 }]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    paddingHorizontal: spacing.screenX,
    flexGrow: 1,
  },
  ctaBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.screenX,
    paddingTop: 12,
    backgroundColor: colors.barBg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
