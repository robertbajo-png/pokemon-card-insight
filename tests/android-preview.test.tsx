import {
  act,
  cleanup,
  fireEvent,
  render,
  within,
} from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import AndroidPreview from "@/android/AndroidPreview";
import { mountAndroidPreview } from "@/android/bootstrap";

// Loading the real native entry must never initialize the web account/backend.
vi.mock("@/integrations/supabase/client", () => {
  throw new Error("The Android preview must not initialize the web backend.");
});
vi.mock("@/contexts/AuthContext", () => {
  throw new Error(
    "The Android preview must not initialize web authentication.",
  );
});
vi.mock("@/services/pwaUpdates", () => {
  throw new Error("The Android preview must not register web app updates.");
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it("mounts the real packaged preview without network, web storage or fake collection features", async () => {
  const fetch = vi.fn();
  vi.stubGlobal("fetch", fetch);
  const xhr = vi.spyOn(XMLHttpRequest.prototype, "open");
  const storage = vi.spyOn(Storage.prototype, "getItem");
  const container = document.createElement("div");
  document.body.append(container);
  let root: ReturnType<typeof mountAndroidPreview> | undefined;
  try {
    await act(async () => {
      root = mountAndroidPreview(container);
    });
    const page = within(container);
    expect(page.getByRole("heading", { name: "Setbiblioteket" })).toBeTruthy();
    expect(page.getByText("Setöversikten fungerar offline")).toBeTruthy();
    expect(page.getByRole("status").textContent).toBe("Visar 24 av 176 set.");
    expect(
      page.getByText(
        /Din samling, kortens checklistor och skanning kommer senare/,
      ),
    ).toBeTruthy();
    expect(
      page.queryByRole("button", { name: /logga in|skanna|spara kort/i }),
    ).toBeNull();
    expect(page.queryByRole("progressbar")).toBeNull();
    expect(container.querySelectorAll("img")).toHaveLength(0);
    fireEvent.change(page.getByRole("searchbox"), {
      target: { value: "sv3pt5" },
    });
    expect(
      page.getByRole("heading", { name: "151", exact: true }),
    ).toBeTruthy();
    fireEvent.click(page.getByRole("button", { name: "Om förhandsversionen" }));
    const info = within(document.body).getByRole("dialog");
    expect(info.textContent).toContain("kräver ingen inloggning");
    expect(info.textContent).toContain("17.09.2026");
    expect(info.textContent).toContain("08.11.2026");
    expect(fetch).not.toHaveBeenCalled();
    expect(xhr).not.toHaveBeenCalled();
    expect(storage).not.toHaveBeenCalled();
  } finally {
    await act(async () => root?.unmount());
    container.remove();
  }
});

it("includes Japanese sets only after opting in, keeps the search and labels the edition", () => {
  const page = render(<AndroidPreview />);
  const search = page.getByRole("searchbox", { name: "Sök i setbiblioteket" });
  const japan = page.getByRole("switch", { name: "Visa japanska specialset" });
  expect(japan.getAttribute("aria-checked")).toBe("false");
  fireEvent.change(search, { target: { value: "SV2a" } });
  expect(page.getByRole("status").textContent).toBe(
    "Inga set matchar sökningen.",
  );
  fireEvent.click(japan);
  expect(japan.getAttribute("aria-checked")).toBe("true");
  expect((search as HTMLInputElement).value).toBe("SV2a");
  expect(page.getByText("181 set")).toBeTruthy();
  const list = page.getByRole("list", { name: "Set i biblioteket" });
  expect(within(list).getAllByRole("listitem")).toHaveLength(1);
  expect(
    within(list).getByRole("heading", { name: "Pokémon Card 151" }),
  ).toBeTruthy();
  expect(within(list).getByText("Japan")).toBeTruthy();
  expect(within(list).getByText("ポケモンカード151").getAttribute("lang")).toBe(
    "ja",
  );
  expect(within(list).getByText("210 katalogkort")).toBeTruthy();
  fireEvent.click(japan);
  expect(page.queryByRole("list", { name: "Set i biblioteket" })).toBeNull();
  expect(page.getByRole("heading", { name: "Inga set hittades" })).toBeTruthy();
});

it("searches Japanese romanized names, original names and normalized set codes offline", () => {
  const page = render(<AndroidPreview />);
  fireEvent.click(
    page.getByRole("switch", { name: "Visa japanska specialset" }),
  );
  const search = page.getByRole("searchbox");
  for (const query of [
    "Terastal Festival ex",
    "テラスタルフェスex",
    "SV8a",
    "jp-sv8a",
    "ＳＶ８ａ",
  ]) {
    fireEvent.change(search, { target: { value: query } });
    const list = page.getByRole("list", { name: "Set i biblioteket" });
    expect(within(list).getAllByRole("listitem")).toHaveLength(1);
    expect(
      within(list).getByRole("heading", { name: "Terastal Festival ex" }),
    ).toBeTruthy();
  }
});

it("loads more metadata and resets the visible page when searching or clearing", () => {
  const page = render(<AndroidPreview />);
  const list = () => page.getByRole("list", { name: "Set i biblioteket" });
  expect(within(list()).getAllByRole("listitem")).toHaveLength(24);
  fireEvent.click(page.getByRole("button", { name: "Visa fler set" }));
  expect(within(list()).getAllByRole("listitem")).toHaveLength(48);
  fireEvent.change(page.getByRole("searchbox"), {
    target: { value: "sv3pt5" },
  });
  expect(within(list()).getAllByRole("listitem")).toHaveLength(1);
  expect(page.queryByRole("button", { name: "Visa fler set" })).toBeNull();
  fireEvent.click(page.getByRole("button", { name: "Rensa sökning" }));
  expect(within(list()).getAllByRole("listitem")).toHaveLength(24);
  expect(page.getByRole("status").textContent).toBe("Visar 24 av 176 set.");
});

it("shows the newest international sets first and puts all five Japanese sets on the first page when enabled", () => {
  const page = render(<AndroidPreview />);
  const names = () =>
    within(page.getByRole("list", { name: "Set i biblioteket" }))
      .getAllByRole("heading", { level: 3 })
      .map((heading) => heading.textContent);
  expect(names().slice(0, 4)).toEqual([
    "30th Celebration",
    "30th Celebration: Classic Collection",
    "Pitch Black",
    "Chaos Rising",
  ]);
  fireEvent.click(
    page.getByRole("switch", { name: "Visa japanska specialset" }),
  );
  expect(names()).toHaveLength(24);
  expect(names().slice(0, 7)).toEqual([
    "Terastal Festival ex",
    "Pokémon Card 151",
    "VMAX Climax",
    "TAG TEAM GX Tag All Stars",
    "Dream League",
    "30th Celebration",
    "30th Celebration: Classic Collection",
  ]);
});

it("ignores Latin accents while preserving meaningful Japanese sound marks", () => {
  const page = render(<AndroidPreview />);
  const search = page.getByRole("searchbox");
  for (const query of ["pokemon go", "POKE\u0301MON GO"]) {
    fireEvent.change(search, { target: { value: query } });
    const list = page.getByRole("list", { name: "Set i biblioteket" });
    expect(within(list).getAllByRole("listitem")).toHaveLength(1);
    expect(
      within(list).getByRole("heading", { name: "Pokémon GO" }),
    ).toBeTruthy();
  }
  fireEvent.click(
    page.getByRole("switch", { name: "Visa japanska specialset" }),
  );
  for (const query of [
    "ポケモンカード151",
    "ポケモンカード151".normalize("NFD"),
  ]) {
    fireEvent.change(search, { target: { value: query } });
    expect(
      page.getByRole("heading", { name: "Pokémon Card 151" }),
    ).toBeTruthy();
  }
  fireEvent.change(search, { target: { value: "ホケモンカード151" } });
  expect(page.queryByRole("list", { name: "Set i biblioteket" })).toBeNull();
  expect(page.getByRole("heading", { name: "Inga set hittades" })).toBeTruthy();
});
