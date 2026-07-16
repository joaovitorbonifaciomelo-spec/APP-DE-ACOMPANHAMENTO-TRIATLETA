import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { ExercisePicker } from '@/components/exercise-picker';
import { FixedBottomBar, Screen } from '@/components/screen';
import { Card, CTAButton, Mono, SectionLabel } from '@/components/ui';
import { useDb } from '@/data/db-context';
import { useLiveQuery } from '@/data/hooks';
import { addTemplate, listExercises } from '@/data/repo';
import { colors, font, radius, spacing } from '@/theme/tokens';

interface Item {
  exerciseId: number;
  targetSets: number;
}

/** Criar treino (template): nome + exercícios com nº de séries. */
export default function NewTemplateScreen() {
  const db = useDb();
  const router = useRouter();
  const { data: exercises } = useLiveQuery((dbase) => listExercises(dbase));

  const [name, setName] = useState('');
  const [items, setItems] = useState<Item[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);

  const nameOf = (id: number) => (exercises ?? []).find((e) => e.id === id)?.name ?? '…';
  const canSave = name.trim().length > 0 && items.length > 0;

  const save = async () => {
    if (!canSave) return;
    await addTemplate(db, name.trim(), items);
    router.back();
  };

  const setSets = (index: number, delta: number) => {
    setItems((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, targetSets: Math.min(10, Math.max(1, item.targetSets + delta)) } : item,
      ),
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Screen hasCTA>
        <View style={styles.header}>
          <Text style={styles.title}>Criar treino</Text>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Text style={styles.cancel}>cancelar</Text>
          </Pressable>
        </View>

        <SectionLabel style={styles.label}>Nome do treino</SectionLabel>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Peito e ombro"
          placeholderTextColor={colors.text3}
          style={styles.input}
        />

        <SectionLabel style={styles.label}>Exercícios</SectionLabel>
        <View style={{ gap: spacing.cardGap }}>
          {items.map((item, i) => (
            <Card key={item.exerciseId} style={styles.itemCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName}>{nameOf(item.exerciseId)}</Text>
                <Text style={styles.itemMeta}>{item.targetSets} séries</Text>
              </View>
              <View style={styles.stepper}>
                <Pressable onPress={() => setSets(i, -1)} hitSlop={6} style={styles.stepBtn}>
                  <Text style={styles.stepText}>−</Text>
                </Pressable>
                <Mono size={14}>{item.targetSets}</Mono>
                <Pressable onPress={() => setSets(i, +1)} hitSlop={6} style={styles.stepBtn}>
                  <Text style={styles.stepText}>+</Text>
                </Pressable>
              </View>
              <Pressable
                onPress={() => setItems((prev) => prev.filter((_, idx) => idx !== i))}
                hitSlop={8}
                style={styles.removeBtn}>
                <Text style={styles.removeText}>×</Text>
              </Pressable>
            </Card>
          ))}

          <Pressable
            onPress={() => setPickerOpen(true)}
            style={({ pressed }) => [styles.addExercise, pressed && { opacity: 0.8 }]}>
            <Text style={styles.addExerciseText}>+ adicionar exercício</Text>
          </Pressable>
        </View>

        <Text style={styles.hint}>
          As cargas e repetições você preenche durante o treino — e nas próximas vezes elas já vêm
          pré-preenchidas com a sessão anterior.
        </Text>
      </Screen>

      <FixedBottomBar>
        <CTAButton label="Salvar treino" onPress={save} style={!canSave ? { opacity: 0.4 } : undefined} />
      </FixedBottomBar>

      <ExercisePicker
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        excludeIds={items.map((i) => i.exerciseId)}
        onPick={(exerciseId) => {
          setPickerOpen(false);
          setItems((prev) => [...prev, { exerciseId, targetSets: 3 }]);
        }}
      />
    </View>
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
  cancel: {
    fontFamily: font.ui,
    fontSize: 13,
    color: colors.text2,
  },
  label: {
    marginTop: spacing.sectionGap,
    marginBottom: 9,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.input,
    paddingHorizontal: 13,
    paddingVertical: 12,
    fontFamily: font.uiMedium,
    fontSize: 14,
    color: colors.text,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  itemName: {
    fontFamily: font.uiSemiBold,
    fontSize: 14,
    color: colors.text,
  },
  itemMeta: {
    fontFamily: font.ui,
    fontSize: 11,
    color: colors.text2,
    marginTop: 2,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stepBtn: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: {
    fontFamily: font.uiSemiBold,
    fontSize: 15,
    color: colors.text2,
    lineHeight: 18,
  },
  removeBtn: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeText: {
    fontFamily: font.ui,
    fontSize: 16,
    color: colors.text3,
  },
  addExercise: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border2,
    borderRadius: radius.card,
    paddingVertical: 16,
    alignItems: 'center',
  },
  addExerciseText: {
    fontFamily: font.uiMedium,
    fontSize: 13,
    color: colors.text2,
  },
  hint: {
    fontFamily: font.ui,
    fontSize: 11,
    color: colors.text3,
    lineHeight: 17,
    marginTop: 14,
  },
});
