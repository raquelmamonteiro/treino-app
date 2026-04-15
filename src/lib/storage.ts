/**
 * Substitui `window.storage` do ambiente Claude/Artifacts por localStorage no navegador.
 */
const prefix = "treino-app:";

export const storage = {
  async get(key: string): Promise<{ value: string } | null> {
    try {
      const value = localStorage.getItem(prefix + key);
      return value !== null ? { value } : null;
    } catch {
      return null;
    }
  },
  async set(key: string, value: string): Promise<void> {
    localStorage.setItem(prefix + key, value);
  },
};
