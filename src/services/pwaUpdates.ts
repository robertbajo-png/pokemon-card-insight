export interface PwaUpdateState {
  available: boolean;
  blocked: boolean;
  updating: boolean;
  error: string | null;
  updateToken: number;
}

interface PwaEnvironment {
  serviceWorker?: ServiceWorkerContainer;
  windowTarget?: EventTarget;
  documentTarget?: EventTarget;
  isOnline?: () => boolean;
  isVisible?: () => boolean;
  reload?: () => void;
  now?: () => number;
}

const checkInterval = 60 * 60 * 1000;
const minimumCheckGap = 60 * 1000;
const activationTimeout = 20 * 1000;

/** Registration never reloads a tab unless that tab explicitly requested it. */
export function createPwaUpdateManager(environment: PwaEnvironment = {}) {
  const {
    serviceWorker,
    windowTarget = typeof window === "undefined" ? undefined : window,
    documentTarget = typeof document === "undefined" ? undefined : document,
    isOnline = () => typeof navigator === "undefined" || navigator.onLine,
    isVisible = () =>
      typeof document === "undefined" || document.visibilityState === "visible",
    reload = () => window.location.reload(),
    now = () => Date.now(),
  } = environment;
  let state: PwaUpdateState = {
    available: false,
    blocked: false,
    updating: false,
    error: null,
    updateToken: 0,
  };
  const listeners = new Set<() => void>();
  const blockers = new Set<symbol>();
  const workerListeners = new Map<ServiceWorker, () => void>();
  let registration: ServiceWorkerRegistration | undefined;
  let offeredWorker: ServiceWorker | undefined;
  let offeredPhase: "waiting" | "active" | undefined;
  let controller = serviceWorker?.controller;
  let reloadRequested = false;
  let requestedWorker: ServiceWorker | undefined;
  let references = 0;
  let generation = 0;
  let lastCheck = -Infinity;
  let checking = false;
  let interval: ReturnType<typeof setInterval> | undefined;
  let activationTimer: ReturnType<typeof setTimeout> | undefined;

  function publish(changes: Partial<PwaUpdateState>) {
    if (
      Object.entries(changes).every(([key, value]) =>
        Object.is(state[key as keyof PwaUpdateState], value),
      )
    )
      return;
    state = { ...state, ...changes };
    listeners.forEach((listener) => listener());
  }

  function offer(worker: ServiceWorker, phase: "waiting" | "active") {
    const changed = offeredWorker !== worker || offeredPhase !== phase;
    offeredWorker = worker;
    offeredPhase = phase;
    publish({
      available: true,
      updateToken: state.updateToken + (changed ? 1 : 0),
    });
  }

  function finishRequestedUpdate() {
    // Activation alone does not prove this tab has switched its controller.
    if (
      !reloadRequested ||
      !requestedWorker ||
      serviceWorker?.controller !== requestedWorker
    )
      return;
    reloadRequested = false;
    requestedWorker = undefined;
    clearTimeout(activationTimer);
    // Work can have started after clicking Update but before activation completed.
    if (blockers.size) {
      publish({ updating: false, available: true });
      return;
    }
    publish({ updating: false, available: false });
    reload();
  }

  function observeWorker(worker: ServiceWorker, isUpdate: boolean) {
    if (workerListeners.has(worker)) return;
    const changed = () => {
      if (
        worker.state === "installed" &&
        registration?.waiting === worker &&
        isUpdate
      )
        offer(worker, "waiting");
      if (worker.state === "activated" && isUpdate) {
        offer(worker, "active");
        finishRequestedUpdate();
      }
    };
    worker.addEventListener("statechange", changed);
    workerListeners.set(worker, changed);
    changed();
  }

  const updateFound = () => {
    if (registration?.installing)
      observeWorker(
        registration.installing,
        Boolean(serviceWorker?.controller || registration.active),
      );
  };

  const controllerChanged = () => {
    const next = serviceWorker?.controller;
    const previous = controller;
    controller = next;
    if (next && next !== previous) {
      if (previous || reloadRequested) offer(next, "active");
      finishRequestedUpdate();
    }
  };

  async function checkForUpdates() {
    if (
      !registration ||
      checking ||
      registration.installing ||
      !isOnline() ||
      !isVisible() ||
      now() - lastCheck < minimumCheckGap
    )
      return;
    lastCheck = now();
    checking = true;
    try {
      await registration.update();
    } catch {
      // A failed background check must not interrupt card work or disable the app.
    } finally {
      checking = false;
    }
  }

  const wake = () => {
    void checkForUpdates();
  };

  function stop() {
    references--;
    if (references > 0) return;
    generation++;
    clearInterval(interval);
    clearTimeout(activationTimer);
    reloadRequested = false;
    requestedWorker = undefined;
    publish({ updating: false });
    serviceWorker?.removeEventListener("controllerchange", controllerChanged);
    registration?.removeEventListener("updatefound", updateFound);
    windowTarget?.removeEventListener("focus", wake);
    windowTarget?.removeEventListener("online", wake);
    windowTarget?.removeEventListener("pageshow", wake);
    documentTarget?.removeEventListener("visibilitychange", wake);
    for (const [worker, listener] of workerListeners)
      worker.removeEventListener("statechange", listener);
    workerListeners.clear();
  }

  function start() {
    references++;
    let released = false;
    const release = () => {
      if (!released) {
        released = true;
        stop();
      }
    };
    if (references !== 1 || !serviceWorker) return release;
    const currentGeneration = ++generation;
    controller = serviceWorker.controller;
    serviceWorker.addEventListener("controllerchange", controllerChanged);
    windowTarget?.addEventListener("focus", wake);
    windowTarget?.addEventListener("online", wake);
    windowTarget?.addEventListener("pageshow", wake);
    documentTarget?.addEventListener("visibilitychange", wake);
    interval = setInterval(wake, checkInterval);
    lastCheck = now();
    void serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .then((value) => {
        if (generation !== currentGeneration) return;
        registration = value;
        registration.addEventListener("updatefound", updateFound);
        if (registration.waiting) {
          offer(registration.waiting, "waiting");
          observeWorker(registration.waiting, true);
        }
        updateFound();
      })
      .catch(() => {
        // Browsing, scanning and saved collections remain usable without a SW.
      });
    return release;
  }

  function applyUpdate() {
    if (!state.available || state.updating || blockers.size) return false;
    publish({ updating: true, error: null });
    reloadRequested = true;
    const waiting = registration?.waiting;
    requestedWorker = waiting ?? offeredWorker;
    activationTimer = setTimeout(() => {
      if (!reloadRequested) return;
      reloadRequested = false;
      requestedWorker = undefined;
      publish({
        updating: false,
        error:
          "Uppdateringen kunde inte slutföras. Försök igen när du har anslutning.",
      });
    }, activationTimeout);
    if (
      waiting &&
      waiting.state !== "redundant" &&
      waiting.state !== "activated"
    ) {
      observeWorker(waiting, true);
      try {
        waiting.postMessage({ type: "SKIP_WAITING" });
      } catch {
        clearTimeout(activationTimer);
        reloadRequested = false;
        requestedWorker = undefined;
        publish({
          updating: false,
          error: "Uppdateringen kunde inte startas. Försök igen.",
        });
      }
    } else if (offeredPhase === "active") finishRequestedUpdate();
    else {
      clearTimeout(activationTimer);
      reloadRequested = false;
      requestedWorker = undefined;
      publish({
        updating: false,
        error: "Uppdateringen är inte redo ännu. Försök igen om en stund.",
      });
    }
    return true;
  }

  return {
    start,
    checkForUpdates,
    applyUpdate,
    getSnapshot: () => state,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    setBlocker(key: symbol, blocked: boolean) {
      if (blocked) blockers.add(key);
      else blockers.delete(key);
      publish({ blocked: blockers.size > 0 });
    },
  };
}

export type PwaUpdateManager = ReturnType<typeof createPwaUpdateManager>;
export const pwaUpdates = createPwaUpdateManager({
  serviceWorker:
    import.meta.env.PROD &&
    typeof navigator !== "undefined" &&
    "serviceWorker" in navigator
      ? navigator.serviceWorker
      : undefined,
});
