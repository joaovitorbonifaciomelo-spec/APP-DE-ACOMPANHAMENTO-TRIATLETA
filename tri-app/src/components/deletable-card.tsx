import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/ui';
import { colors, font, radius } from '@/theme/tokens';

/**
 * Card de lista com apagar via pressionar-e-segurar: o toque normal continua
 * disparando onPress (ex. iniciar treino); segurar mostra um aviso por 3s —
 * um toque dentro desse tempo confirma o apagar, qualquer outra coisa cancela.
 * Evita botões de apagar pequenos e coladinhos na ação principal.
 */
export function DeletableCard({
  children, onPress, onDelete,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  onDelete: () => void;
}) {
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!confirming) return;
    const t = setTimeout(() => setConfirming(false), 3000);
    return () => clearTimeout(t);
  }, [confirming]);

  return (
    <Card
      onPress={() => {
        if (confirming) {
          setConfirming(false);
          onDelete();
        } else {
          onPress?.();
        }
      }}
      onLongPress={() => setConfirming(true)}
      borderColor={confirming ? '#ff7a7a66' : undefined}>
      {children}
      {confirming ? (
        <View style={styles.badge} pointerEvents="none">
          <Text style={styles.badgeText}>toque para apagar</Text>
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(255,122,122,0.15)',
    borderRadius: radius.badge,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeText: {
    fontFamily: font.uiMedium,
    fontSize: 10,
    color: '#ff7a7a',
  },
});
