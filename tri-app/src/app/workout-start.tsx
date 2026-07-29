import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { DeletableCard } from '@/components/deletable-card';
import { Screen } from '@/components/screen';
import { useDb } from '@/data/db-context';
import { useLiveQuery } from '@/data/hooks';
import { deleteTemplate, listTemplates, startWorkout } from '@/data/repo';
import { colors, font, radius, spacing } from '@/theme/tokens';

/** Escolher (ou criar) um treino para iniciar — aberto pelo botão + central. */
export default function WorkoutStartScreen() {
  const db = useDb();
  const router = useRouter();
  const { data: templates } = useLiveQuery((dbase) => listTemplates(dbase));
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  const start = async (templateId: number) => {
    if (starting) return;
    setStarting(true);
    setStartError(null);
    try {
      await startWorkout(db, templateId);
      router.back();
      router.navigate('/forca');
    } catch (e) {
      setStartError('Não foi possível iniciar o treino. Verifique sua conexão e tente de novo.');
      console.warn('[treino] falha ao iniciar:', e);
    } finally {
      setStarting(false);
    }
  };

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>Iniciar treino</Text>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Text style={styles.cancel}>cancelar</Text>
        </Pressable>
      </View>

      {templates && templates.length > 0 ? (
        <Text style={styles.hint}>Escolha um treino para começar. Segure um treino para apagar.</Text>
      ) : null}
      {startError ? <Text style={styles.errorText}>{startError}</Text> : null}

      <View style={{ gap: spacing.cardGap, marginTop: 14 }}>
        {(templates ?? []).map((t) => (
          <DeletableCard
            key={t.id}
            onPress={() => start(t.id)}
            onDelete={() => deleteTemplate(db, t.id)}
            itemLabel={`o treino "${t.name}"`}>
            <View style={styles.row}>
              <View style={{ flex: 1, flexShrink: 1 }}>
                <Text style={styles.name}>{t.name}</Text>
                <Text style={styles.meta} numberOfLines={1}>
                  {t.exerciseNames.join(' · ')}
                </Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </View>
          </DeletableCard>
        ))}

        <Pressable
          onPress={() => router.push('/template-new')}
          style={({ pressed }) => [styles.addTemplate, pressed && { opacity: 0.8 }]}>
          <Text style={styles.addTemplateText}>+ criar treino</Text>
        </Pressable>
      </View>
    </Screen>
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
  hint: {
    fontFamily: font.ui,
    fontSize: 12,
    color: colors.text2,
    marginTop: 14,
    lineHeight: 18,
  },
  errorText: {
    fontFamily: font.ui,
    fontSize: 12,
    color: '#ff7a7a',
    lineHeight: 17,
    marginTop: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  name: {
    fontFamily: font.uiSemiBold,
    fontSize: 15,
    color: colors.text,
  },
  meta: {
    fontFamily: font.ui,
    fontSize: 11,
    color: colors.text2,
    marginTop: 2,
  },
  chevron: {
    fontFamily: font.ui,
    fontSize: 16,
    color: colors.text3,
  },
  addTemplate: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border2,
    borderRadius: radius.card,
    paddingVertical: 18,
    alignItems: 'center',
  },
  addTemplateText: {
    fontFamily: font.uiMedium,
    fontSize: 13,
    color: colors.text2,
  },
});
