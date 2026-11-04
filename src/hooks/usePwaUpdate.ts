import {
  useEffect,
  useLayoutEffect,
  useState,
  useSyncExternalStore,
} from "react";
import { pwaUpdates, type PwaUpdateManager } from "@/services/pwaUpdates";

export function usePwaUpdate(manager: PwaUpdateManager = pwaUpdates) {
  const state = useSyncExternalStore(
    manager.subscribe,
    manager.getSnapshot,
    manager.getSnapshot,
  );
  useEffect(() => manager.start(), [manager]);
  return { ...state, applyUpdate: manager.applyUpdate };
}

/** Prevent a reload while this component owns transient work or a pending save. */
export function usePwaUpdateBlocker(
  blocked: boolean,
  manager: PwaUpdateManager = pwaUpdates,
) {
  const [key] = useState(() => Symbol("pwa-work"));
  useLayoutEffect(() => {
    manager.setBlocker(key, blocked);
    return () => manager.setBlocker(key, false);
  }, [blocked, key, manager]);
}
