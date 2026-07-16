import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { SectionLabel } from '@/components/ui';
import { useDb } from '@/data/db-context';
import { useLiveQuery } from '@/data/hooks';
import { addExercise, listExercises } from '@/data/repo';
import { colors, font, radius, spacing } from '@/theme/tokens';

/**
 * Sheet para escolher um exercício existente ou criar um novo pelo nome.
 * Usado no treino ativo (+ adicionar exercício) e na criação de treinos.
 */
export function ExercisePicker({
  visible, onClose, excludeIds, onPick,
}: {
  visible: boolean;
  onClose: () => void;
  excludeIds: number[];
  onPick: (exerciseId: number) => void;
}) {
  const db = useDb();
  const { data: exercises } = useLiveQuery((dbase) => listExercises(dbase));
  const [newName, setNewName] = useState('');
  const available = (exercises ?? []).filter((e) => !excludeIds.includes(e.id));

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <SectionLabel>Adicionar exercício</SectionLabel>
          <View style={{ gap: 8, marginTop: 12 }}>
            {available.map((e) => (
              <Pressable
                key={e.id}
                onPress={() => onPick(e.id)}
                style={({ pressed }) => [styles.item, pressed && { opacity: 0.8 }]}>
                <Text style={styles.itemName}>{e.name}</Text>
                {e.muscle_group ? <Text style={styles.itemMeta}>{e.muscle_group}</Text> : null}
              </Pressable>
            ))}
          </View>
          <View style={styles.newRow}>
            <TextInput
              value={newName}
              onChangeText={setNewName}
              placeholder="Novo exercício…"
              placeholderTextColor={colors.text3}
              style={styles.newInput}
            />
            <Pressable
              onPress={async () => {
                const name = newName.trim();
                if (!name) return;
                setNewName('');
                const id = await addExercise(db, name, '');
                onPick(id);
              }}
              style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.85 }]}>
              <Text style={{ fontFamily: font.uiBold, fontSize: 13, color: colors.onAccent }}>+</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.card,
    borderTopRightRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.screenX,
    paddingBottom: 34,
  },
  item: {
    backgroundColor: colors.surface2,
    borderRadius: radius.input,
    paddingHorizontal: 13,
    paddingVertical: 11,
  },
  itemName: {
    fontFamily: font.uiSemiBold,
    fontSize: 15,
    color: colors.text,
  },
  itemMeta: {
    fontFamily: font.ui,
    fontSize: 11,
    color: colors.text2,
    marginTop: 2,
  },
  newRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  newInput: {
    flex: 1,
    backgroundColor: colors.surface2,
    borderRadius: radius.input,
    paddingHorizontal: 13,
    paddingVertical: 11,
    fontFamily: font.ui,
    fontSize: 13,
    color: colors.text,
  },
  addBtn: {
    width: 44,
    borderRadius: radius.input,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
