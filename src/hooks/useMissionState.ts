import { createContext, useContext, useSyncExternalStore } from "react";
import type { MissionState, MissionStore } from "../state/missionStore";

export const MissionStoreContext = createContext<MissionStore | null>(null);

export function useMissionStore(): MissionStore {
  const store = useContext(MissionStoreContext);
  if (!store) throw new Error("MissionStoreContext is missing");
  return store;
}

/** Subscribe to one slice of mission state. The selector must return an existing reference or a primitive. */
export function useMissionState<T>(selector: (s: MissionState) => T): T {
  const store = useMissionStore();
  return useSyncExternalStore(store.subscribe, () => selector(store.getState()), () => selector(store.getState()));
}
