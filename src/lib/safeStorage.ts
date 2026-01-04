/**
 * Safe localStorage wrapper that handles exceptions gracefully.
 * Prevents crashes in private browsing mode or when storage is disabled.
 */

export const safeStorage = {
  getItem(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      console.warn(`[safeStorage] Unable to read key: ${key}`);
      return null;
    }
  },

  setItem(key: string, value: string): boolean {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch {
      console.warn(`[safeStorage] Unable to write key: ${key}`);
      return false;
    }
  },

  removeItem(key: string): boolean {
    try {
      localStorage.removeItem(key);
      return true;
    } catch {
      console.warn(`[safeStorage] Unable to remove key: ${key}`);
      return false;
    }
  },

  isAvailable(): boolean {
    try {
      const testKey = '__storage_test__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  },
};
