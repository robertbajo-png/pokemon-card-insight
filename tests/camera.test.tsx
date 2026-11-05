import {
  act,
  cleanup,
  fireEvent,
  render,
  waitFor,
} from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { useState } from "react";
import CameraCapture from "@/components/CameraCapture";

vi.mock("@/contexts/LanguageContext", () => ({
  useLanguage: () => ({
    t: (text: string) =>
      ({
        takePhotoOfCard: "Ta foto av kort",
        placeCardInFrame: "Placera kortet i ramen",
        pressToTakePhoto: "Tryck på kameraknappen för att ta ett foto",
      })[text] ?? text,
  }),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
function media() {
  const stop = vi.fn();
  return {
    stream: { getTracks: () => [{ stop }] } as unknown as MediaStream,
    stop,
  };
}
function devices(getUserMedia: ReturnType<typeof vi.fn>) {
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: {
      getUserMedia,
      enumerateDevices: vi
        .fn()
        .mockResolvedValue([{ kind: "videoinput" }, { kind: "videoinput" }]),
    },
  });
}
it("stops an active stream when unmounted", async () => {
  const first = media();
  devices(vi.fn().mockResolvedValue(first.stream));
  const view = render(<CameraCapture onCapture={vi.fn()} onClose={vi.fn()} />);
  await waitFor(() =>
    expect(document.querySelector("video")?.srcObject).toBe(first.stream),
  );
  view.unmount();
  expect(first.stop).toHaveBeenCalledOnce();
});
it("stops a permission request that resolves after the view has closed", async () => {
  const first = media();
  let resolve: (value: MediaStream) => void;
  devices(
    vi.fn().mockReturnValue(
      new Promise<MediaStream>((done) => {
        resolve = done;
      }),
    ),
  );
  const view = render(<CameraCapture onCapture={vi.fn()} onClose={vi.fn()} />);
  view.unmount();
  await act(async () => {
    resolve(first.stream);
  });
  expect(first.stop).toHaveBeenCalledOnce();
});
it("stops the old stream before switching cameras", async () => {
  const first = media(),
    second = media();
  const getUserMedia = vi
    .fn()
    .mockResolvedValueOnce(first.stream)
    .mockResolvedValueOnce(second.stream);
  devices(getUserMedia);
  const view = render(<CameraCapture onCapture={vi.fn()} onClose={vi.fn()} />);
  await waitFor(() => expect(view.getAllByRole("button")).toHaveLength(3));
  fireEvent.click(view.getAllByRole("button")[1]);
  await waitFor(() =>
    expect(document.querySelector("video")?.srcObject).toBe(second.stream),
  );
  expect(first.stop).toHaveBeenCalledOnce();
  view.unmount();
  expect(second.stop).toHaveBeenCalledOnce();
});
it("requests only the rear video camera and enables capture after a frame loads", async () => {
  const first = media();
  const getUserMedia = vi.fn().mockResolvedValue(first.stream);
  devices(getUserMedia);
  const view = render(<CameraCapture onCapture={vi.fn()} onClose={vi.fn()} />);
  const capture = view.getByRole("button", {
    name: "Ta foto",
    exact: true,
  }) as HTMLButtonElement;
  expect(capture.disabled).toBe(true);
  await waitFor(() =>
    expect(document.querySelector("video")?.srcObject).toBe(first.stream),
  );
  expect(getUserMedia).toHaveBeenCalledWith(
    expect.objectContaining({
      audio: false,
      video: expect.objectContaining({ facingMode: "environment" }),
    }),
  );
  const video = view.baseElement.querySelector("video")!;
  expect(video.muted).toBe(true);
  expect(video.playsInline).toBe(true);
  fireEvent.loadedData(video);
  expect(capture.disabled).toBe(false);
});
it("does not discard a working camera when optional camera enumeration is unavailable", async () => {
  const first = media();
  devices(vi.fn().mockResolvedValue(first.stream));
  vi.spyOn(navigator.mediaDevices, "enumerateDevices").mockRejectedValue(
    new Error("unavailable"),
  );
  const view = render(<CameraCapture onCapture={vi.fn()} onClose={vi.fn()} />);
  await waitFor(() =>
    expect(document.querySelector("video")?.srcObject).toBe(first.stream),
  );
  expect(view.queryByText(/Kunde inte komma åt/)).toBeNull();
  expect(first.stop).not.toHaveBeenCalled();
});

function CameraLauncher({ onClose }: { onClose: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}>Öppna kameran</button>
      <a href="/collection">Bakgrundslänk</a>
      {open && (
        <CameraCapture
          onCapture={vi.fn()}
          onClose={() => {
            onClose();
            setOpen(false);
          }}
        />
      )}
    </>
  );
}

it("opens a named modal, stops its stream on Escape and restores focus to its launcher", async () => {
  const first = media();
  const onClose = vi.fn();
  devices(vi.fn().mockResolvedValue(first.stream));
  const view = render(<CameraLauncher onClose={onClose} />);
  const launcher = view.getByRole("button", { name: "Öppna kameran" });
  launcher.focus();
  fireEvent.click(launcher);
  const dialog = await view.findByRole("dialog", { name: "Ta foto av kort" });
  expect(dialog.getAttribute("aria-modal")).toBe("true");
  await waitFor(() => {
    expect(document.querySelector("video")?.srcObject).toBe(first.stream);
    expect(document.activeElement).toBe(
      view.getByRole("button", { name: "Stäng kameran" }),
    );
  });
  expect(view.getAllByRole("button", { name: "Stäng kameran" })).toHaveLength(
    1,
  );
  fireEvent.keyDown(dialog, { key: "Escape", code: "Escape" });
  await waitFor(() => {
    expect(view.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(launcher);
  });
  expect(first.stop).toHaveBeenCalledOnce();
  expect(onClose).toHaveBeenCalledOnce();
});

it("hides the background from screen readers and keeps keyboard focus inside the camera", async () => {
  const first = media();
  devices(vi.fn().mockResolvedValue(first.stream));
  const view = render(<CameraLauncher onClose={vi.fn()} />);
  const launcher = view.getByRole("button", { name: "Öppna kameran" });
  const background = view.getByRole("link", { name: "Bakgrundslänk" });
  launcher.focus();
  fireEvent.click(launcher);
  const dialog = await view.findByRole("dialog", { name: "Ta foto av kort" });
  const close = view.getByRole("button", { name: "Stäng kameran" });
  const capture = view.getByRole("button", { name: "Ta foto", exact: true });
  await waitFor(() =>
    expect(document.querySelector("video")?.srcObject).toBe(first.stream),
  );
  fireEvent.loadedData(document.querySelector("video")!);
  expect(view.queryByRole("link", { name: "Bakgrundslänk" })).toBeNull();
  expect(background.closest('[aria-hidden="true"]')).not.toBeNull();

  act(() => capture.focus());
  fireEvent.keyDown(capture, { key: "Tab", code: "Tab" });
  expect(document.activeElement).toBe(close);
  fireEvent.keyDown(close, { key: "Tab", code: "Tab", shiftKey: true });
  expect(document.activeElement).toBe(capture);
  act(() => background.focus());
  expect(dialog.contains(document.activeElement)).toBe(true);
});

it("closes with its single Swedish close control and stops the stream", async () => {
  const first = media();
  const onClose = vi.fn();
  devices(vi.fn().mockResolvedValue(first.stream));
  const view = render(<CameraLauncher onClose={onClose} />);
  const launcher = view.getByRole("button", { name: "Öppna kameran" });
  launcher.focus();
  fireEvent.click(launcher);
  await waitFor(() =>
    expect(document.querySelector("video")?.srcObject).toBe(first.stream),
  );
  fireEvent.click(view.getByRole("button", { name: "Stäng kameran" }));
  await waitFor(() => {
    expect(view.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(launcher);
  });
  expect(first.stop).toHaveBeenCalledOnce();
  expect(onClose).toHaveBeenCalledOnce();
});
