/**
 * Design tokens do handoff — ver README do pacote de design.
 * Fundo #0c0e11, accent lima #c8ff3d, Archivo (UI) + JetBrains Mono (números).
 */

export const colors = {
  bg: '#0c0e11',
  surface: '#14171c',
  surface2: '#1b1f25',
  border: '#1f242b',
  border2: '#2c333c',
  accent: '#c8ff3d',
  text: '#f2f4f6',
  text2: '#7d8590',
  text3: '#565d68',
  barMuted: '#252b33',
  onAccent: '#0c0e11',
  /** borda accent translúcida — card de exercício ativo */
  accentBorderSoft: '#c8ff3d33',
  /** borda accent translúcida — card de próxima prova */
  accentBorderStrong: '#c8ff3d55',
  /** fundo da tab bar / barra de CTA fixa */
  barBg: 'rgba(12,14,17,0.92)',
} as const;

/**
 * Famílias por peso (fontes custom no RN precisam da família exata;
 * fontWeight não se aplica de forma confiável no Android).
 */
export const font = {
  ui: 'Archivo_400Regular',
  uiMedium: 'Archivo_500Medium',
  uiSemiBold: 'Archivo_600SemiBold',
  uiBold: 'Archivo_700Bold',
  mono: 'JetBrainsMono_400Regular',
  monoMedium: 'JetBrainsMono_500Medium',
  monoBold: 'JetBrainsMono_700Bold',
} as const;

export const radius = {
  card: 16,
  cardSm: 14,
  input: 12,
  pill: 20,
  badge: 8,
  cta: 14,
  bar: 3,
} as const;

export const spacing = {
  /** padding lateral da tela */
  screenX: 18,
  /** padding interno de card */
  cardPad: 15,
  /** gap entre cards */
  cardGap: 10,
  /** gap entre seções */
  sectionGap: 17,
} as const;

/** Altura reservada para a tab bar (conteúdo deve ter paddingBottom >= isso) */
export const TAB_BAR_HEIGHT = 54;
/** Deslocamento extra p/ botão central elevado */
export const CTA_BAR_HEIGHT = 84;
