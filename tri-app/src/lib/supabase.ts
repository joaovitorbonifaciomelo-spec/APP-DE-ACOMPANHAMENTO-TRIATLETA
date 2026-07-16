/**
 * Client Supabase para React Native — sessão persistida em AsyncStorage.
 * Config via .env (EXPO_PUBLIC_*). anon key é pública por design; a proteção
 * dos dados vem do RLS (cada linha pertence a auth.uid()).
 */

import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

/** e-mail sugerido na tela de login (não é segredo) */
export const DEFAULT_EMAIL = process.env.EXPO_PUBLIC_SUPABASE_EMAIL ?? '';

export const isSupabaseConfigured = Boolean(url && anonKey);

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!isSupabaseConfigured) {
    throw new Error(
      'Supabase não configurado: defina EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_ANON_KEY no .env.',
    );
  }
  if (!client) {
    client = createClient(url!, anonKey!, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
  }
  return client;
}
