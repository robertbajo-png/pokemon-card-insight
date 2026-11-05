import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import { authLink, getAuthReturn, validateAuthReturn } from "@/lib/authReturn";

const mocks = vi.hoisted(() => ({
  signIn: vi.fn(),
  signUp: vi.fn(),
  signOut: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
}));
vi.mock("@/components/Navigation", () => ({ default: () => <nav /> }));
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: null, isLoading: false }),
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      signInWithPassword: mocks.signIn,
      signUp: mocks.signUp,
      signOut: mocks.signOut,
    },
  },
}));
vi.mock("@/lib/hosting", () => ({ isLocalHosting: true }));
vi.mock("sonner", () => ({
  toast: { success: mocks.success, error: mocks.error },
}));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.signIn.mockResolvedValue({ error: null });
  mocks.signUp.mockResolvedValue({ data: { session: null }, error: null });
  vi.stubGlobal(
    "fetch",
    vi.fn(() => {
      throw new Error("Unexpected network request in auth test.");
    }),
  );
});
afterEach(() => {
  expect(fetch).not.toHaveBeenCalled();
  cleanup();
  vi.unstubAllGlobals();
});

function CurrentRoute() {
  const location = useLocation();
  return (
    <div data-testid="route">
      {location.pathname + location.search + location.hash}
    </div>
  );
}

function renderAuth(entry: string) {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <CurrentRoute />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="*" element={<h1>Tillbaka till appen</h1>} />
      </Routes>
    </MemoryRouter>,
  );
}

function submitCredentials(view: ReturnType<typeof render>) {
  fireEvent.change(view.getByLabelText("E‑post"), {
    target: { value: "collector@example.test" },
  });
  fireEvent.change(view.getByLabelText("Lösenord"), {
    target: { value: "example-password-for-test" },
  });
  fireEvent.submit(view.container.querySelector("form")!);
}

describe("safe authentication destinations", () => {
  it.each([
    "/scanner",
    "/collection?view=list#saved-cards",
    "/gallery?q=Ancient%20Origins&series=XY#sets",
    "/friends?invite=collector-2&email=friend%2Bcards%40example.test#invitation",
    "/set/swsh12pt5gg#checklist",
    "/card/ex10-%3F#details",
  ])("preserves a supported app destination %s", (destination) => {
    expect(validateAuthReturn(destination)).toBe(destination);
    const href = authLink("/login", {
      pathname: new URL(destination, "https://card-lens.invalid").pathname,
      search: new URL(destination, "https://card-lens.invalid").search,
      hash: new URL(destination, "https://card-lens.invalid").hash,
    });
    expect(
      getAuthReturn(new URL(href, "https://card-lens.invalid").search),
    ).toBe(destination);
  });

  it.each([
    undefined,
    null,
    42,
    "https://other.example/collection",
    "//other.example/collection",
    "///other.example/collection",
    "javascript:alert(1)",
    "/\\other.example/collection",
    "/gallery?q=\\bad",
    "/gallery?q=%5Cbad",
    "/gallery?q=%255Cbad",
    "/gallery?q=%0a",
    "/collection#\u0000",
    " /gallery",
    "gallery",
    "/unknown",
    "/login?returnTo=/collection",
    "/signup",
    "/signup/",
    "/collection/../login",
    "/set/%2e%2e",
    "/card/card-%2f%2fother.example",
    "/gallery?q=%",
  ])("rejects an unsafe or unsupported destination %j", (destination) => {
    expect(validateAuthReturn(destination)).toBeNull();
  });

  it("uses the standard fallback for missing, ambiguous and rejected parameters", () => {
    expect(getAuthReturn("")).toBe("/");
    expect(getAuthReturn("?returnTo=%2Fcollection&returnTo=%2Fgallery")).toBe(
      "/",
    );
    expect(getAuthReturn("?returnTo=https%3A%2F%2Fother.example")).toBe("/");
    expect(
      authLink("/signup", {
        pathname: "/login",
        search: "?returnTo=%2Fsignup",
      }),
    ).toBe("/signup");
    expect(authLink("/login", { pathname: "/" })).toBe("/login");
  });
});

it("returns to the original search and fragment after a mocked login", async () => {
  const destination = "/gallery?q=Ancient%20Origins&series=XY#sets";
  const view = renderAuth(
    `/login?${new URLSearchParams({ returnTo: destination })}`,
  );
  submitCredentials(view);
  await waitFor(() =>
    expect(view.getByTestId("route").textContent).toBe(destination),
  );
  expect(mocks.signIn).toHaveBeenCalledWith({
    email: "collector@example.test",
    password: "example-password-for-test",
  });
});

it("preserves an invitation through both auth crosslinks", async () => {
  const destination =
    "/friends?invite=collector-2&email=friend%40example.test#invitation";
  const view = renderAuth(
    `/login?${new URLSearchParams({ returnTo: destination })}`,
  );
  fireEvent.click(view.getByRole("link", { name: /Har inget konto/ }));
  expect(
    getAuthReturn(
      new URL(
        view
          .getByRole("link", { name: /Har redan konto/ })
          .getAttribute("href")!,
        "https://card-lens.invalid",
      ).search,
    ),
  ).toBe(destination);
  fireEvent.click(view.getByRole("link", { name: /Har redan konto/ }));
  submitCredentials(view);
  await waitFor(() =>
    expect(view.getByTestId("route").textContent).toBe(destination),
  );
});

it.each([
  "/login",
  "/login?returnTo=https%3A%2F%2Fother.example",
  "/login?returnTo=%2Fsignup",
])("falls back to the overview after successful login at %s", async (entry) => {
  const view = renderAuth(entry);
  submitCredentials(view);
  await waitFor(() => expect(view.getByTestId("route").textContent).toBe("/"));
});

it("keeps signup confirmation visible and carries the invitation into login", async () => {
  const destination = "/friends?invite=collector-2#invitation";
  const entry = `/signup?${new URLSearchParams({ returnTo: destination })}`;
  const view = renderAuth(entry);
  submitCredentials(view);
  await view.findByRole("heading", { name: "Kontrollera din e-post." });
  expect(view.getByRole("status").textContent).toContain(
    "collector@example.test",
  );
  expect(view.getByTestId("route").textContent).toBe(entry);
  expect(view.queryByLabelText("Lösenord")).toBeNull();
  expect(
    view
      .getByRole("link", { name: "den lokala postlådan" })
      .getAttribute("href"),
  ).toBe("http://127.0.0.1:5225/");
  fireEvent.click(view.getByRole("link", { name: "Fortsätt till inloggning" }));
  submitCredentials(view);
  await waitFor(() =>
    expect(view.getByTestId("route").textContent).toBe(destination),
  );
});

it("returns immediately only when signup actually supplies an authenticated session", async () => {
  mocks.signUp.mockResolvedValue({ data: { session: {} }, error: null });
  const view = renderAuth(
    `/signup?${new URLSearchParams({ returnTo: "/collection#saved-cards" })}`,
  );
  submitCredentials(view);
  await waitFor(() =>
    expect(view.getByTestId("route").textContent).toBe(
      "/collection#saved-cards",
    ),
  );
});

it("keeps the login form and return destination when authentication fails", async () => {
  mocks.signIn.mockResolvedValue({
    error: { message: "Fel e-post eller lösenord." },
  });
  const entry = `/login?${new URLSearchParams({ returnTo: "/collection" })}`;
  const view = renderAuth(entry);
  submitCredentials(view);
  expect((await view.findByRole("alert")).textContent).toBe(
    "Fel e-post eller lösenord.",
  );
  expect(view.getByTestId("route").textContent).toBe(entry);
  expect(view.getByLabelText("Lösenord")).toBeTruthy();
});
