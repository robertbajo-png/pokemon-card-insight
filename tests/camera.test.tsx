import {
  act,
  cleanup,
  fireEvent,
  render,
  waitFor,
} from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import CameraCapture from "@/components/CameraCapture";

vi.mock("@/contexts/LanguageContext", () => ({
  useLanguage: () => ({ t: (text: string) => text }),
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
  const video = view.container.querySelector("video")!;
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
