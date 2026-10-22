import { act, cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import CameraCapture from "@/components/CameraCapture";

vi.mock("@/contexts/LanguageContext", () => ({ useLanguage: () => ({ t: (text: string) => text }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
function media() { const stop = vi.fn(); return { stream: { getTracks: () => [{ stop }] } as unknown as MediaStream, stop }; }
function devices(getUserMedia: ReturnType<typeof vi.fn>) {
  Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: {
    getUserMedia, enumerateDevices: vi.fn().mockResolvedValue([{ kind: "videoinput" }, { kind: "videoinput" }]),
  } });
}
it("stops an active stream when unmounted", async () => {
  const first = media(); devices(vi.fn().mockResolvedValue(first.stream));
  const view = render(<CameraCapture onCapture={vi.fn()} onClose={vi.fn()} />);
  await waitFor(() => expect(document.querySelector("video")?.srcObject).toBe(first.stream));
  view.unmount();
  expect(first.stop).toHaveBeenCalledOnce();
});
it("stops a permission request that resolves after the view has closed", async () => {
  const first = media(); let resolve: (value: MediaStream) => void;
  devices(vi.fn().mockReturnValue(new Promise<MediaStream>(done => { resolve = done; })));
  const view = render(<CameraCapture onCapture={vi.fn()} onClose={vi.fn()} />);
  view.unmount();
  await act(async () => { resolve(first.stream); });
  expect(first.stop).toHaveBeenCalledOnce();
});
it("stops the old stream before switching cameras", async () => {
  const first = media(), second = media();
  const getUserMedia = vi.fn().mockResolvedValueOnce(first.stream).mockResolvedValueOnce(second.stream);
  devices(getUserMedia);
  const view = render(<CameraCapture onCapture={vi.fn()} onClose={vi.fn()} />);
  await waitFor(() => expect(view.getAllByRole("button")).toHaveLength(3));
  fireEvent.click(view.getAllByRole("button")[1]);
  await waitFor(() => expect(document.querySelector("video")?.srcObject).toBe(second.stream));
  expect(first.stop).toHaveBeenCalledOnce();
  view.unmount();
  expect(second.stop).toHaveBeenCalledOnce();
});
