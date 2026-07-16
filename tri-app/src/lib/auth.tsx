/**
 * Sessão Supabase + tela de login mínima.
 * Primeiro uso: e-mail + senha à escolha do usuário — a conta é criada na hora
 * (autoconfirm habilitado no projeto). Sessão persiste em AsyncStorage.
 */

import type { Session } from '@supabase/supabase-js';
import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View,
} from 'react-native';

import { CTAButton, SectionLabel } from '@/components/ui';
import { colors, font, radius, spacing } from '@/theme/tokens';
import { DEFAULT_EMAIL, getSupabase, isSupabaseConfigured } from './supabase';

interface AuthState {
  session: Session | null;
  loading: boolean;
}

const AuthContext = createContext<AuthState>({ session: null, loading: false });

export function useAuth(): AuthState {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const supabase = getSupabase();
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return <AuthContext.Provider value={{ session, loading }}>{children}</AuthContext.Provider>;
}

/**
 * Bloqueia o app até haver sessão (somente quando o Supabase está configurado).
 */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();

  if (!isSupabaseConfigured) return <>{children}</>;
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }
  if (!session) return <LoginScreen />;
  return <>{children}</>;
}

function LoginScreen() {
  const [email, setEmail] = useState(DEFAULT_EMAIL);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    const mail = email.trim().toLowerCase();
    if (!mail || password.length < 6) {
      setError('Informe o e-mail e uma senha com pelo menos 6 caracteres.');
      return;
    }
    setBusy(true);
    setError(null);
    const supabase = getSupabase();

    // tenta entrar; se a conta ainda não existe, cria na hora
    const signIn = await supabase.auth.signInWithPassword({ email: mail, password });
    if (!signIn.error) { setBusy(false); return; }

    if (/invalid login credentials/i.test(signIn.error.message)) {
      const signUp = await supabase.auth.signUp({ email: mail, password });
      if (!signUp.error && signUp.data.session) { setBusy(false); return; }
      setError(
        signUp.error && /already registered/i.test(signUp.error.message)
          ? 'Senha incorreta para esta conta.'
          : signUp.error?.message ?? 'Não foi possível criar a conta.',
      );
    } else {
      setError(signIn.error.message);
    }
    setBusy(false);
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.content}>
        <SectionLabel>Tri Atleta</SectionLabel>
        <Text style={styles.title}>Entrar</Text>
        <Text style={styles.hint}>
          Primeira vez? Digite seu e-mail e escolha uma senha — a conta é criada automaticamente.
        </Text>

        <SectionLabel style={styles.label}>E-mail</SectionLabel>
        <TextInput
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          placeholder="voce@email.com"
          placeholderTextColor={colors.text3}
          style={styles.input}
        />

        <SectionLabel style={styles.label}>Senha</SectionLabel>
        <TextInput
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="password"
          placeholder="mínimo 6 caracteres"
          placeholderTextColor={colors.text3}
          style={styles.input}
          onSubmitEditing={submit}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={{ marginTop: 22 }}>
          {busy ? (
            <ActivityIndicator color={colors.accent} />
          ) : (
            <CTAButton label="Entrar" onPress={submit} />
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

/** botão simples de sair (não usado nas telas do design; disponível p/ debug) */
export function SignOutButton() {
  if (!isSupabaseConfigured) return null;
  return (
    <Pressable onPress={() => getSupabase().auth.signOut()} hitSlop={8}>
      <Text style={{ fontFamily: font.ui, fontSize: 12, color: colors.text3 }}>sair</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
    justifyContent: 'center',
  },
  center: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: spacing.screenX + 6,
  },
  title: {
    fontFamily: font.uiBold,
    fontSize: 26,
    letterSpacing: -0.52,
    color: colors.text,
    marginTop: 4,
  },
  hint: {
    fontFamily: font.ui,
    fontSize: 12,
    color: colors.text2,
    lineHeight: 18,
    marginTop: 8,
  },
  label: {
    marginTop: 18,
    marginBottom: 8,
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
  error: {
    fontFamily: font.ui,
    fontSize: 12,
    color: '#ff7a7a',
    marginTop: 12,
  },
});
