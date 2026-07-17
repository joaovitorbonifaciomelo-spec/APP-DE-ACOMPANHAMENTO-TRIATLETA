import { useRouter } from 'expo-router';
import { Dumbbell, House, Plus, Timer, Trophy } from 'lucide-react-native';
import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { useCtaOpen } from '@/components/bottom-bar-state';
import { colors, font } from '@/theme/tokens';

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
 * Tab bar flutuante em "ilha" (estilo iOS moderno): pill arredondado
 * descolado das bordas, 4 itens + botão central "+" em accent.
 */
export function TabBar({ state, navigation }: TabBarProps) {
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
        hitSlop={6}
        onPress={() => {
          if (!active) navigation.navigate(name);
        }}>
        <Icon size={20} color={color} strokeWidth={active ? 2.4 : 2} />
        <Text style={[styles.tabLabel, { color: active ? colors.accent : colors.text2 }]}>{label}</Text>
      </Pressable>
    );
  };

  return (
    <View pointerEvents="box-none" style={styles.wrap}>
      <View style={styles.island}>
        {TABS.slice(0, 2).map(renderTab)}

        <Pressable
          onPress={() => router.push('/quick-add')}
          style={({ pressed }) => [styles.plusButton, pressed && { opacity: 0.85 }]}>
          <Plus size={22} color={colors.onAccent} strokeWidth={2.6} />
        </Pressable>

        {TABS.slice(2).map(renderTab)}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    // 'fixed' na web: ancora no viewport real, ignorando recuos de containers
    position: Platform.OS === 'web' ? ('fixed' as 'absolute') : 'absolute',
    left: 0,
    right: 0,
    bottom: 8,
    alignItems: 'center',
  },
  island: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(20,23,28,0.96)',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 32,
    height: 60,
    paddingHorizontal: 10,
    gap: 2,
    shadowColor: '#000',
    shadowOpacity: 0.45,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  tab: {
    minWidth: 58,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingHorizontal: 6,
  },
  tabLabel: {
    fontFamily: font.uiMedium,
    fontSize: 10,
  },
  plusButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 8,
    shadowColor: colors.accent,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
});
