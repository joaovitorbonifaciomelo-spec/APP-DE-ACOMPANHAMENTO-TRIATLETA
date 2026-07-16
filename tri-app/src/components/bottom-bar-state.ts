/**
 * Estado global mínimo: quando uma tela mostra o CTA fixo inferior
 * ("Finalizar treino", "Salvar treino"…), a tab bar some — como no design.
 */

import { useSyncExternalStore } from 'react';

let ctaCount = 0;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((fn) => fn());
}

export function pushCtaOpen(): () => void {
  ctaCount++;
  emit();
  let released = false;
  return () => {
    if (released) return;
    released = true;
    ctaCount--;
    emit();
  };
}

export function useCtaOpen(): boolean {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    () => ctaCount > 0,
    () => false,
  );
}
