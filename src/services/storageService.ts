/**
 * Versioned, validated localStorage access.
 *
 * - Every key is namespaced and versioned (`astra-med:v1:*`).
 * - Reads parse safely and validate; malformed data falls back to defaults.
 * - If storage is unavailable (private mode, quota, policy), the app keeps
 *   working in memory and reports that changes will not survive a reload.
 *
 * localStorage is not encrypted and is not suitable for regulated medical
 * records. Clearing browser data removes everything saved here.
 */

export const STORAGE_KEYS = {
  measurements: "astra-med:v1:measurements",
  countermeasures: "astra-med:v1:countermeasures",
  followUps: "astra-med:v1:readiness",
  settings: "astra-med:v1:mission-settings",
  donkiCache: "astra-med:v1:donki-cache",
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export type ReadStatus = "ok" | "missing" | "corrupt" | "unavailable";

export interface ReadResult<T> {
  value: T;
  status: ReadStatus;
}

export interface StorageService {
  readonly available: boolean;
  read<T>(key: StorageKey, sanitize: (raw: unknown) => T | null, fallback: T): ReadResult<T>;
  write(key: StorageKey, value: unknown): boolean;
  remove(key: StorageKey): boolean;
}

function probe(backend: StorageLike | undefined): boolean {
  if (!backend) return false;
  try {
    const k = "astra-med:probe";
    backend.setItem(k, "1");
    backend.removeItem(k);
    return true;
  } catch {
    return false;
  }
}

function defaultBackend(): StorageLike | undefined {
  try {
    return typeof window !== "undefined" ? window.localStorage : undefined;
  } catch {
    return undefined;
  }
}

export function createStorageService(backend: StorageLike | undefined = defaultBackend()): StorageService {
  const available = probe(backend);
  return {
    available,
    read<T>(key: StorageKey, sanitize: (raw: unknown) => T | null, fallback: T): ReadResult<T> {
      if (!available || !backend) return { value: fallback, status: "unavailable" };
      let text: string | null;
      try {
        text = backend.getItem(key);
      } catch {
        return { value: fallback, status: "unavailable" };
      }
      if (text === null) return { value: fallback, status: "missing" };
      try {
        const parsed: unknown = JSON.parse(text);
        const clean = sanitize(parsed);
        return clean === null ? { value: fallback, status: "corrupt" } : { value: clean, status: "ok" };
      } catch {
        return { value: fallback, status: "corrupt" };
      }
    },
    write(key: StorageKey, value: unknown): boolean {
      if (!available || !backend) return false;
      try {
        backend.setItem(key, JSON.stringify(value));
        return true;
      } catch {
        return false;
      }
    },
    remove(key: StorageKey): boolean {
      if (!available || !backend) return false;
      try {
        backend.removeItem(key);
        return true;
      } catch {
        return false;
      }
    },
  };
}

/** In-memory backend for tests. */
export function memoryBackend(initial: Record<string, string> = {}): StorageLike & { data: Record<string, string> } {
  const data = { ...initial };
  return {
    data,
    getItem: (k) => (k in data ? data[k]! : null),
    setItem: (k, v) => {
      data[k] = v;
    },
    removeItem: (k) => {
      delete data[k];
    },
  };
}
