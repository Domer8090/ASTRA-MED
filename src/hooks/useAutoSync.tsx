import { createContext, useContext, useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { createSyncStore, type SyncState, type SyncStore } from "../state/syncStore";
import { useMissionStore } from "./useMissionState";

const SyncStoreContext = createContext<SyncStore | null>(null);

/** Checks every 20 seconds whether a paired device is due. Devices keep their own interval. */
const TICK_MS = 20_000;

export function AutoSyncProvider({ children }: { children: ReactNode }) {
  const mission = useMissionStore();
  const [store] = useState(() => createSyncStore(mission));

  useEffect(() => {
    const id = window.setInterval(() => store.tick(), TICK_MS);
    return () => window.clearInterval(id);
  }, [store]);

  useEffect(() => () => store.dispose(), [store]);

  return <SyncStoreContext.Provider value={store}>{children}</SyncStoreContext.Provider>;
}

export function useSyncStore(): SyncStore {
  const store = useContext(SyncStoreContext);
  if (!store) throw new Error("AutoSyncProvider is missing");
  return store;
}

export function useSyncState(): SyncState {
  const store = useSyncStore();
  return useSyncExternalStore(store.subscribe, store.getState, store.getState);
}
