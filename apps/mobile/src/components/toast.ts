type Listener = (message: string | null) => void;

let messageActuel: string | null = null;
const listeners = new Set<Listener>();

export function showError(message: string): void {
  messageActuel = message;
  listeners.forEach((listener) => listener(messageActuel));
}

export function clearToast(): void {
  messageActuel = null;
  listeners.forEach((listener) => listener(messageActuel));
}

export function subscribeToast(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
