import {
  Archivo_400Regular,
  Archivo_500Medium,
  Archivo_600SemiBold,
  Archivo_700Bold,
} from '@expo-google-fonts/archivo';
import {
  JetBrainsMono_400Regular,
  JetBrainsMono_500Medium,
  JetBrainsMono_700Bold,
} from '@expo-google-fonts/jetbrains-mono';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, AppState, View } from 'react-native';

import { DataProvider } from '@/data/data-provider';
import { useDb } from '@/data/db-context';
import { subscribeData } from '@/data/repo';
import { bootstrapData, kickSync } from '@/data/sync';
import { AuthGate, AuthProvider, useAuth } from '@/lib/auth';
import { isSupabaseConfigured } from '@/lib/supabase';
import { colors } from '@/theme/tokens';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Archivo_400Regular,
    Archivo_500Medium,
    Archivo_600SemiBold,
    Archivo_700Bold,
    JetBrainsMono_400Regular,
    JetBrainsMono_500Medium,
    JetBrainsMono_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <DataProvider>
      <AuthProvider>
        <StatusBar style="light" />
        <AuthGate>
          <SyncManager>
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.bg },
                animation: 'fade_from_bottom',
                animationDuration: 200,
              }}>
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="exercise/[id]" options={{ animation: 'slide_from_right', animationDuration: 220 }} />
              <Stack.Screen
                name="quick-add"
                options={{ presentation: 'transparentModal', animation: 'fade', contentStyle: { backgroundColor: 'transparent' } }}
              />
              <Stack.Screen name="cardio-new" options={{ presentation: 'modal' }} />
              <Stack.Screen name="race-new" options={{ presentation: 'modal' }} />
              <Stack.Screen name="template-new" options={{ presentation: 'modal' }} />
            </Stack>
          </SyncManager>
        </AuthGate>
      </AuthProvider>
    </DataProvider>
  );
}

/**
 * Primeira carga (restore da nuvem ou seed local) e agendamento do push:
 * a cada escrita local (debounce) e ao voltar ao primeiro plano.
 */
function SyncManager({ children }: { children: React.ReactNode }) {
  const db = useDb();
  const { session } = useAuth();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    bootstrapData(db, session != null).then(() => {
      if (!alive) return;
      setReady(true);
      if (session) kickSync(db, 1000);
    });
    return () => { alive = false; };
  }, [db, session?.user.id]);

  useEffect(() => {
    if (!isSupabaseConfigured || !session) return;
    const unsubscribe = subscribeData(() => kickSync(db));
    const appState = AppState.addEventListener('change', (s) => {
      if (s === 'active') kickSync(db, 500);
    });
    return () => {
      unsubscribe();
      appState.remove();
    };
  }, [db, session?.user.id]);

  if (!ready) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }
  return <>{children}</>;
}
