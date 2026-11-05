import {
  act,
  cleanup,
  fireEvent,
  render,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import PwaUpdateNotice from "@/components/PwaUpdateNotice";
import { usePwaUpdateBlocker } from "@/hooks/usePwaUpdate";
import {
  createPwaUpdateManager,
  type PwaUpdateManager,
} from "@/services/pwaUpdates";

class WorkerFixture extends EventTarget {
  state: ServiceWorkerState = "installed";
  postMessage = vi.fn();
  changeState(state: ServiceWorkerState) {
    this.state = state;
    this.dispatchEvent(new Event("statechange"));
  }
}

class RegistrationFixture extends EventTarget {
  waiting: WorkerFixture | null;
  installing: WorkerFixture | null = null;
  update = vi.fn(async () => this);
  constructor(waiting: WorkerFixture | null) {
    super();
    this.waiting = waiting;
  }
}

class ContainerFixture extends EventTarget {
  controller: WorkerFixture | null = new WorkerFixture();
  register: ReturnType<typeof vi.fn>;
  constructor(registration: RegistrationFixture) {
    super();
    this.register = vi.fn(async () => registration);
  }
  claim(worker: WorkerFixture) {
    this.controller = worker;
    this.dispatchEvent(new Event("controllerchange"));
  }
}

const releases: Array<() => void> = [];
afterEach(() => {
  cleanup();
  releases.splice(0).forEach((release) => release());
  if (vi.isFakeTimers()) {
    vi.clearAllTimers();
    vi.useRealTimers();
  }
  vi.restoreAllMocks();
});

function fixture(waiting = true) {
  const worker = new WorkerFixture();
  const registration = new RegistrationFixture(waiting ? worker : null);
  const container = new ContainerFixture(registration);
  const windowTarget = new EventTarget();
  const documentTarget = new EventTarget();
  const online = vi.fn(() => true);
  const visible = vi.fn(() => true);
  const reload = vi.fn();
  const options = {
    serviceWorker: container as unknown as ServiceWorkerContainer,
    windowTarget,
    documentTarget,
    isOnline: online,
    isVisible: visible,
    reload,
  };
  const manager = createPwaUpdateManager(options);
  const activate = () => {
    registration.waiting = null;
    worker.changeState("activated");
    container.claim(worker);
  };
  return {
    worker,
    registration,
    container,
    windowTarget,
    documentTarget,
    online,
    visible,
    reload,
    options,
    manager,
    activate,
  };
}

async function start(manager: PwaUpdateManager) {
  releases.push(manager.start());
  await Promise.resolve();
}

function WorkGuard({
  busy,
  manager,
}: {
  busy: boolean;
  manager: PwaUpdateManager;
}) {
  usePwaUpdateBlocker(busy, manager);
  return null;
}

describe("user-controlled PWA updates", () => {
  it("can accept a waiting update when this tab initially has no controller", async () => {
    const { manager, container, worker, reload, activate } = fixture();
    container.controller = null;
    await start(manager);
    expect(manager.getSnapshot().available).toBe(true);
    manager.applyUpdate();
    worker.changeState("activated");
    expect(reload).not.toHaveBeenCalled();
    activate();
    expect(reload).toHaveBeenCalledOnce();
  });

  it("registers one native worker with no HTTP-cache reuse and does not reload on discovery", async () => {
    const { manager, container, reload, worker } = fixture();
    await start(manager);
    expect(container.register).toHaveBeenCalledOnce();
    expect(container.register).toHaveBeenCalledWith("/sw.js", {
      scope: "/",
      updateViaCache: "none",
    });
    expect(manager.getSnapshot().available).toBe(true);
    expect(worker.postMessage).not.toHaveBeenCalled();
    expect(reload).not.toHaveBeenCalled();
  });

  it("detects an update that finishes installation after registration", async () => {
    const { manager, registration, worker, reload } = fixture(false);
    await start(manager);
    expect(manager.getSnapshot().available).toBe(false);
    worker.state = "installing";
    registration.installing = worker;
    registration.dispatchEvent(new Event("updatefound"));
    registration.installing = null;
    registration.waiting = worker;
    worker.changeState("installed");
    expect(manager.getSnapshot().available).toBe(true);
    expect(reload).not.toHaveBeenCalled();
  });

  it("does not treat the first offline installation as a content update", async () => {
    const { manager, registration, container, worker, reload } = fixture(false);
    container.controller = null;
    await start(manager);
    worker.state = "installing";
    registration.installing = worker;
    registration.dispatchEvent(new Event("updatefound"));
    worker.changeState("installed");
    worker.changeState("activated");
    container.claim(worker);
    expect(manager.getSnapshot().available).toBe(false);
    expect(reload).not.toHaveBeenCalled();
  });

  it("activates only on explicit acceptance and reloads only the accepting tab once", async () => {
    const first = fixture();
    const otherReload = vi.fn();
    const second = createPwaUpdateManager({
      ...first.options,
      reload: otherReload,
    });
    await start(first.manager);
    await start(second);
    expect(first.manager.applyUpdate()).toBe(true);
    expect(first.worker.postMessage).toHaveBeenCalledOnce();
    expect(first.worker.postMessage).toHaveBeenCalledWith({
      type: "SKIP_WAITING",
    });
    expect(first.reload).not.toHaveBeenCalled();
    first.activate();
    expect(first.reload).toHaveBeenCalledOnce();
    expect(otherReload).not.toHaveBeenCalled();
    expect(second.getSnapshot().available).toBe(true);
    second.applyUpdate();
    expect(otherReload).toHaveBeenCalledOnce();
    expect(first.worker.postMessage).toHaveBeenCalledOnce();
  });

  it("waits for the accepted worker to control this tab even if activation arrives first", async () => {
    const { manager, registration, container, worker, reload } = fixture();
    await start(manager);
    manager.applyUpdate();
    registration.waiting = null;
    worker.changeState("activated");
    expect(reload).not.toHaveBeenCalled();
    expect(manager.getSnapshot().updating).toBe(true);
    container.claim(new WorkerFixture());
    expect(reload).not.toHaveBeenCalled();
    container.claim(worker);
    expect(reload).toHaveBeenCalledOnce();
  });

  it("keeps an editing tab untouched when another tab activates the update", async () => {
    const { manager, activate, reload } = fixture();
    const lock = Symbol("unsaved card");
    await start(manager);
    manager.setBlocker(lock, true);
    expect(manager.applyUpdate()).toBe(false);
    activate();
    expect(manager.getSnapshot()).toMatchObject({
      available: true,
      blocked: true,
      updating: false,
    });
    expect(reload).not.toHaveBeenCalled();
    manager.setBlocker(lock, false);
    manager.applyUpdate();
    expect(reload).toHaveBeenCalledOnce();
  });

  it("rechecks work started after accepting an update and preserves it on activation", async () => {
    const { manager, activate, reload } = fixture();
    const lock = Symbol("new scan");
    await start(manager);
    manager.applyUpdate();
    manager.setBlocker(lock, true);
    activate();
    expect(reload).not.toHaveBeenCalled();
    expect(manager.getSnapshot().updating).toBe(false);
    manager.setBlocker(lock, false);
    manager.applyUpdate();
    expect(reload).toHaveBeenCalledOnce();
  });

  it("keeps transient form values when Later is selected, then offers an externally activated update", async () => {
    const { manager, worker, reload, activate } = fixture();
    const view = render(
      <>
        <input aria-label="Osparad anteckning" />
        <PwaUpdateNotice manager={manager} />
      </>,
    );
    const input = view.getByLabelText("Osparad anteckning") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "Leonards kort" } });
    await view.findByRole("button", { name: "Uppdatera appen" });
    fireEvent.click(view.getByRole("button", { name: "Senare" }));
    expect(view.queryByRole("button", { name: "Uppdatera appen" })).toBeNull();
    expect(input.value).toBe("Leonards kort");
    expect(worker.postMessage).not.toHaveBeenCalled();
    expect(reload).not.toHaveBeenCalled();
    act(activate);
    expect(view.getByRole("button", { name: "Uppdatera appen" })).toBeTruthy();
    expect(input.value).toBe("Leonards kort");
    expect(reload).not.toHaveBeenCalled();
  });

  it("disables the notice action during guarded work and releases the guard on unmount", async () => {
    const { manager, worker } = fixture();
    const view = render(
      <>
        <WorkGuard busy manager={manager} />
        <PwaUpdateNotice manager={manager} />
      </>,
    );
    const button = (await view.findByRole("button", {
      name: "Uppdatera appen",
    })) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(
      view.getByText(/Spara dina ändringar eller avsluta skanningen/),
    ).toBeTruthy();
    fireEvent.click(button);
    expect(worker.postMessage).not.toHaveBeenCalled();
    view.rerender(<PwaUpdateNotice manager={manager} />);
    await waitFor(() =>
      expect(
        (
          view.getByRole("button", {
            name: "Uppdatera appen",
          }) as HTMLButtonElement
        ).disabled,
      ).toBe(false),
    );
  });

  it("checks on bounded wake events, skips offline/hidden clients and removes its listeners", async () => {
    vi.useFakeTimers();
    const {
      manager,
      registration,
      windowTarget,
      documentTarget,
      online,
      visible,
    } = fixture(false);
    const stop = manager.start();
    releases.push(stop);
    await Promise.resolve();
    windowTarget.dispatchEvent(new Event("focus"));
    expect(registration.update).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(60_000);
    windowTarget.dispatchEvent(new Event("focus"));
    windowTarget.dispatchEvent(new Event("online"));
    documentTarget.dispatchEvent(new Event("visibilitychange"));
    expect(registration.update).toHaveBeenCalledOnce();
    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(60_000);
    online.mockReturnValue(false);
    windowTarget.dispatchEvent(new Event("focus"));
    online.mockReturnValue(true);
    visible.mockReturnValue(false);
    windowTarget.dispatchEvent(new Event("focus"));
    expect(registration.update).toHaveBeenCalledOnce();
    visible.mockReturnValue(true);
    documentTarget.dispatchEvent(new Event("visibilitychange"));
    expect(registration.update).toHaveBeenCalledTimes(2);
    stop();
    await vi.advanceTimersByTimeAsync(60 * 60 * 1000);
    windowTarget.dispatchEvent(new Event("focus"));
    expect(registration.update).toHaveBeenCalledTimes(2);
  });

  it("performs a periodic check without a focus event", async () => {
    vi.useFakeTimers();
    const { manager, registration } = fixture(false);
    await start(manager);
    await vi.advanceTimersByTimeAsync(60 * 60 * 1000);
    expect(registration.update).toHaveBeenCalledOnce();
  });

  it("recovers from activation that never completes without reloading or losing work", async () => {
    vi.useFakeTimers();
    const { manager, reload } = fixture();
    await start(manager);
    manager.applyUpdate();
    await vi.advanceTimersByTimeAsync(20_000);
    expect(manager.getSnapshot()).toMatchObject({
      available: true,
      updating: false,
    });
    expect(manager.getSnapshot().error).toContain(
      "Uppdateringen kunde inte slutföras",
    );
    expect(reload).not.toHaveBeenCalled();
  });

  it("keeps background registration and update errors out of the collector workflow", async () => {
    vi.useFakeTimers();
    const first = fixture(false);
    first.container.register.mockRejectedValueOnce(new Error("offline"));
    await start(first.manager);
    await Promise.resolve();
    expect(first.manager.getSnapshot()).toMatchObject({
      available: false,
      error: null,
    });
    const second = fixture(false);
    second.registration.update.mockRejectedValueOnce(new Error("offline"));
    await start(second.manager);
    await vi.advanceTimersByTimeAsync(60_000);
    await second.manager.checkForUpdates();
    expect(second.registration.update).toHaveBeenCalledOnce();
    expect(second.manager.getSnapshot().error).toBeNull();
  });
});
