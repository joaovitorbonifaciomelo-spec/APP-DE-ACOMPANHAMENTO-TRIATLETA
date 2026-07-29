import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { Card } from '@/components/ui';
import { colors, font, radius, spacing } from '@/theme/tokens';

/**
 * Card de lista com apagar via pressionar-e-segurar: o toque normal continua
 * disparando onPress (ex. iniciar treino); segurar abre uma tela pedindo
 * confirmação antes de apagar. Seleção de texto desligada — sem isso, segurar
 * dispara a seleção nativa do navegador em vez do gesto de apagar.
 */
export function DeletableCard({
  children, onPress, onDelete, itemLabel = 'este item',
}: {
  children: React.ReactNode;
  onPress?: () => void;
  onDelete: () => void;
  /** nome do que será apagado, usado na pergunta de confirmação */
  itemLabel?: string;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <>
      <Card
        onPress={onPress}
        onLongPress={() => setConfirmOpen(true)}
        // userSelect é válido em CSS (react-native-web) mas não faz parte
        // do tipo ViewStyle do RN — sem isso, segurar dispara a seleção
        // nativa de texto do navegador em vez do gesto de apagar.
        style={styles.noSelect as StyleProp<ViewStyle>}>
        {children}
      </Card>

      <Modal visible={confirmOpen} transparent animationType="fade" onRequestClose={() => setConfirmOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setConfirmOpen(false)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <Text style={styles.title}>Apagar?</Text>
            <Text style={styles.message}>
              Tem certeza que deseja apagar {itemLabel}? Essa ação não pode ser desfeita.
            </Text>
            <View style={styles.actions}>
              <Pressable
                onPress={() => setConfirmOpen(false)}
                style={({ pressed }) => [styles.btn, styles.btnCancel, pressed && { opacity: 0.8 }]}>
                <Text style={styles.btnCancelText}>Cancelar</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setConfirmOpen(false);
                  onDelete();
                }}
                style={({ pressed }) => [styles.btn, styles.btnDelete, pressed && { opacity: 0.85 }]}>
                <Text style={styles.btnDeleteText}>Apagar</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  noSelect: {
    userSelect: 'none',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.screenX,
  },
  sheet: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
    padding: spacing.cardPad + 5,
  },
  title: {
    fontFamily: font.uiBold,
    fontSize: 17,
    color: colors.text,
  },
  message: {
    fontFamily: font.ui,
    fontSize: 13,
    color: colors.text2,
    lineHeight: 19,
    marginTop: 8,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  btn: {
    flex: 1,
    borderRadius: radius.input,
    paddingVertical: 12,
    alignItems: 'center',
  },
  btnCancel: {
    backgroundColor: colors.surface2,
  },
  btnCancelText: {
    fontFamily: font.uiSemiBold,
    fontSize: 14,
    color: colors.text,
  },
  btnDelete: {
    backgroundColor: '#ff7a7a',
  },
  btnDeleteText: {
    fontFamily: font.uiSemiBold,
    fontSize: 14,
    color: '#2b0d0d',
  },
});
