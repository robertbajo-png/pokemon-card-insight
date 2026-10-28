import { expect, it } from "vitest";
import { resolveBackendUrl } from "@/lib/backendUrl";

it("uses the mobile HTTPS origin instead of the phone's own localhost", () => {
  expect(
    resolveBackendUrl(
      "http://127.0.0.1:5220/backend",
      true,
      "https://family.example",
    ),
  ).toBe("https://family.example/backend");
});
it("retains the host computer's local port", () => {
  expect(
    resolveBackendUrl(
      "http://127.0.0.1:5220/backend",
      true,
      "http://127.0.0.1:5220",
    ),
  ).toBe("http://127.0.0.1:5220/backend");
});
it("preserves a deliberately configured hosted backend", () => {
  expect(
    resolveBackendUrl(
      "https://project.supabase.co",
      false,
      "https://family.example",
    ),
  ).toBe("https://project.supabase.co");
});
it("retains configured backend behavior outside a browser", () => {
  expect(resolveBackendUrl("http://127.0.0.1:5220/backend", true)).toBe(
    "http://127.0.0.1:5220/backend",
  );
});
it("does not treat a file preview as a working mobile installation", () => {
  expect(() =>
    resolveBackendUrl(
      "http://127.0.0.1:5220/backend",
      true,
      "file:///preview.html",
    ),
  ).toThrow();
});
