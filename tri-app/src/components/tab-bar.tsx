import { useRouter } from 'expo-router';
import { Dumbbell, House, Plus, Timer, Trophy } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCtaOpen } from '@/components/bottom-bar-state';
import { colors, font, TAB_BAR_HEIGHT } from '@/theme/tokens';

const TABS: { name: string; label: string; Icon: typeof House }[] = [
  { name: 'index', label: 'Início', Icon: House },
  { name: 'forca', label: 'Força', Icon: Dumbbell },
  { name: 'cardio', label: 'Cardio', Icon: Timer },
  { name: 'provas', label: 'Provas', Icon: Trophy },
];

/** Subconjunto estrutural de BottomTabBarProps (o tipo não é exportado pelo expo-router 57) */
export interface TabBarProps {
  state: { index: number; routes: { key: string; name: string }[] };
  navigation: { navigate: (name: string) => void };
}

/**
 * Tab bar do design: fundo rgba(12,14,17,.92), borda superior #1f242b,
 * 4 itens + botão central circular "+" 44px em accent, elevado.
 */
export function TabBar({ state, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const activeRoute = state.routes[state.index]?.name;
  const ctaOpen = useCtaOpen();

  // telas de registro mostram o CTA fixo no lugar da tab bar (design 1d/2c)
  if (ctaOpen) return null;

  const renderTab = ({ name, label, Icon }: (typeof TABS)[number]) => {
    const active = activeRoute === name;
    const color = active ? colors.accent : colors.text3;
    return (
      <Pressable
        key={name}
        style={styles.tab}
        hitSlop={8}
        onPress={() => {
          if (!active) navigation.navigate(name);
        }}>
        <Icon size={21} color={color} strokeWidth={active ? 2.4 : 2} />
        <Text style={[styles.tabLabel, { color: active ? colors.accent : colors.text2 }]}>{label}</Text>
      </Pressable>
    );
  };

  // no iPhone, sobrepõe parte da área do home indicator (como apps nativos)
  const bottomPad = Math.max(insets.bottom - 14, 0);

  return (
    <View style={[styles.bar, { paddingBottom: bottomPad, height: TAB_BAR_HEIGHT + bottomPad }]}>
      {TABS.slice(0, 2).map(renderTab)}

      <View style={styles.plusSlot}>
        <Pressable
          onPress={() => router.push('/quick-add')}
          style={({ pressed }) => [styles.plusButton, pressed && { opacity: 0.85 }]}>
          <Plus size={22} color={colors.onAccent} strokeWidth={2.6} />
        </Pressable>
      </View>

      {TABS.slice(2).map(renderTab)}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: colors.barBg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingTop: 8,
  },
  tabLabel: {
    fontFamily: font.uiMedium,
    fontSize: 10,
  },
  plusSlot: {
    flex: 1,
    alignItems: 'center',
  },
  plusButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -24,
    shadowColor: colors.accent,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
});
