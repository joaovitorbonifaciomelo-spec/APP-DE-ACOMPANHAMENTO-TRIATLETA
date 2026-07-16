/** Pub/sub de invalidação de dados — compartilhado entre as variantes nativa e web do repo. */

type Listener = () => void;
const listeners = new Set<Listener>();

export function subscribeData(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function notifyDataChanged(): void {
  listeners.forEach((fn) => fn());
}
