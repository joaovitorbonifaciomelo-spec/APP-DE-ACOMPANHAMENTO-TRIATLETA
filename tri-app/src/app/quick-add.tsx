import { useRouter } from 'expo-router';
import { Dumbbell, Timer } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SectionLabel } from '@/components/ui';
import { colors, font, radius, spacing } from '@/theme/tokens';

/** Sheet do botão central "+": escolher registro de Força ou Cardio. */
export default function QuickAddScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <Pressable style={styles.backdrop} onPress={() => router.back()}>
      <Pressable style={[styles.sheet, { paddingBottom: insets.bottom + 22 }]} onPress={() => {}}>
        <SectionLabel>Registrar</SectionLabel>
        <View style={{ gap: spacing.cardGap, marginTop: 12 }}>
          <Option
            Icon={Dumbbell}
            title="Treino de força"
            subtitle="iniciar a partir de um template"
            onPress={() => {
              router.back();
              router.navigate('/forca');
            }}
          />
          <Option
            Icon={Timer}
            title="Cardio"
            subtitle="corrida, pedal ou natação"
            onPress={() => {
              router.back();
              router.push('/cardio-new');
            }}
          />
        </View>
      </Pressable>
    </Pressable>
  );
}

function Option({
  Icon, title, subtitle, onPress,
}: { Icon: typeof Dumbbell; title: string; subtitle: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.option, pressed && { opacity: 0.8 }]}>
      <View style={styles.optionIcon}>
        <Icon size={19} color={colors.accent} strokeWidth={2.2} />
      </View>
      <View>
        <Text style={styles.optionTitle}>{title}</Text>
        <Text style={styles.optionSubtitle}>{subtitle}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.62)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.card,
    borderTopRightRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.screenX,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    backgroundColor: colors.surface2,
    borderRadius: radius.cardSm,
    padding: 14,
  },
  optionIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionTitle: {
    fontFamily: font.uiSemiBold,
    fontSize: 14,
    color: colors.text,
  },
  optionSubtitle: {
    fontFamily: font.ui,
    fontSize: 11,
    color: colors.text2,
    marginTop: 2,
  },
});
