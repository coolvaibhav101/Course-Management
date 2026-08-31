// utils/storage.ts
export const setLocalStorage = (key: string, value: unknown): void => {
  try {
    const stringifiedValue =
      typeof value === "string" ? value : JSON.stringify(value);
    localStorage.setItem(key, stringifiedValue);
  } catch (error) {
    console.error("Error saving to localStorage:", error);
  }
};

export const getLocalStorage = <T = unknown>(key: string): T | null => {
  try {
    const value = localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : null;
  } catch {
    return null;
  }
};

export const removeLocalStorage = (key: string): void => {
  localStorage.removeItem(key);
};
