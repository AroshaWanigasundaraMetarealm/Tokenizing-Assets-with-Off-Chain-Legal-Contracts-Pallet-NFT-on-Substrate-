// Tiny pub/sub so storage panels refresh after any tx finalizes.
type Listener = () => void;
const listeners = new Set<Listener>();

export function onRefresh(fn: Listener): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

export function fireRefresh() {
  for (const l of Array.from(listeners)) {
    try { l(); } catch {}
  }
}
