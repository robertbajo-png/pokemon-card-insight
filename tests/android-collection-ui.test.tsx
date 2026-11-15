import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import CollectionScreen from "@/android/CollectionScreen";
import {
  CollectionRepositoryError,
  type CollectionCard,
  type CollectionCardFields,
  type CollectionRepository,
} from "@/platform/collection";

const firstId = "3c67788e-dc92-4e8a-9189-5c21e5ca7a01";
const fields: CollectionCardFields = {
  name: "Pikachu",
  setId: null,
  setName: "Mitt set",
  cardNumber: "025",
  catalogueCardId: null,
  language: "en",
  variant: "normal",
  condition: "unknown",
  quantity: 1,
  location: "",
  notes: "",
};
const card = (extra: Partial<CollectionCard> = {}): CollectionCard => ({
  ...fields,
  id: firstId,
  createdAt: 100,
  updatedAt: 100,
  revision: 1,
  ...extra,
});

// Injected test repository only: no native storage, browser persistence or service calls.
function testRepository(initial: CollectionCard[] = []) {
  const rows = new Map(
    initial.map((entry) => [entry.id, structuredClone(entry)]),
  );
  let clock = 200;
  const repository = {
    list: vi.fn<CollectionRepository["list"]>(async () =>
      [...rows.values()].map((entry) => structuredClone(entry)),
    ),
    create: vi.fn<CollectionRepository["create"]>(
      async ({ id, fields: input }) => {
        const existing = rows.get(id);
        if (existing) {
          const {
            id: _id,
            revision: _revision,
            createdAt: _created,
            updatedAt: _updated,
            ...savedFields
          } = existing;
          if (JSON.stringify(savedFields) !== JSON.stringify(input))
            throw new CollectionRepositoryError("CONFLICT");
          return structuredClone(existing);
        }
        const saved = {
          ...input,
          id,
          createdAt: clock,
          updatedAt: clock++,
          revision: 1,
        };
        rows.set(id, saved);
        return structuredClone(saved);
      },
    ),
    update: vi.fn<CollectionRepository["update"]>(
      async ({ id, expectedRevision, fields: input }) => {
        const existing = rows.get(id);
        if (!existing) throw new CollectionRepositoryError("NOT_FOUND");
        if (existing.revision !== expectedRevision)
          throw new CollectionRepositoryError("CONFLICT");
        const saved = {
          ...existing,
          ...input,
          revision: existing.revision + 1,
          updatedAt: clock++,
        };
        rows.set(id, saved);
        return structuredClone(saved);
      },
    ),
    remove: vi.fn<CollectionRepository["remove"]>(
      async ({ id, expectedRevision }) => {
        const existing = rows.get(id);
        if (!existing) throw new CollectionRepositoryError("NOT_FOUND");
        if (existing.revision !== expectedRevision)
          throw new CollectionRepositoryError("CONFLICT");
        rows.delete(id);
      },
    ),
  };
  return { repository, rows };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
const editor = () => within(screen.getByRole("dialog"));
const inputName = () => editor().getByRole("textbox", { name: /^Kortnamn/ });
const inputNotes = () =>
  editor().getByRole("textbox", { name: /^Anteckningar/ });
const submit = () =>
  fireEvent.submit(editor().getByRole("form", { name: "Kortuppgifter" }));
async function openNew() {
  await screen.findByRole("heading", { name: "Ditt första kort börjar här." });
  fireEvent.click(
    screen.getByRole("button", { name: "Lägg till kort", exact: true }),
  );
  expect(screen.getByRole("dialog")).toBeTruthy();
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it("creates, searches, edits with the read revision and reloads actual saved records", async () => {
  const { repository, rows } = testRepository();
  const page = render(<CollectionScreen repository={repository} />);
  await openNew();
  fireEvent.change(inputName(), { target: { value: "  Pokémon Pikachu  " } });
  fireEvent.change(
    editor().getByRole("textbox", { name: "Set", exact: true }),
    { target: { value: "Japanska pärmen" } },
  );
  fireEvent.change(editor().getByRole("textbox", { name: /^Kortnummer/ }), {
    target: { value: "001/165" },
  });
  fireEvent.change(
    editor().getByRole("spinbutton", { name: /^Antal exemplar/ }),
    { target: { value: "3" } },
  );
  fireEvent.change(editor().getByRole("combobox", { name: /^Språk/ }), {
    target: { value: "ja" },
  });
  fireEvent.change(editor().getByRole("combobox", { name: /^Skick/ }), {
    target: { value: "near_mint" },
  });
  fireEvent.change(editor().getByRole("textbox", { name: /^Variant/ }), {
    target: { value: "holo" },
  });
  fireEvent.change(
    editor().getByRole("textbox", { name: /^Förvaringsplats/ }),
    { target: { value: "Blå pärmen · sida 3" } },
  );
  fireEvent.change(inputNotes(), {
    target: { value: "Första raden\nAndra raden" },
  });
  submit();
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  expect(repository.create).toHaveBeenCalledTimes(1);
  const saved = [...rows.values()][0];
  expect(saved).toMatchObject({
    name: "Pokémon Pikachu",
    setId: null,
    catalogueCardId: null,
    setName: "Japanska pärmen",
    cardNumber: "001/165",
    quantity: 3,
    language: "ja",
    variant: "holo",
    condition: "near_mint",
    notes: "Första raden\nAndra raden",
  });
  expect(screen.getByLabelText("Antal exemplar").textContent).toBe("3");
  expect(screen.getByLabelText("Antal registreringar").textContent).toBe("1");
  fireEvent.change(
    screen.getByRole("searchbox", { name: "Sök i din samling" }),
    { target: { value: "pokemon" } },
  );
  expect(screen.getByRole("heading", { name: "Pokémon Pikachu" })).toBeTruthy();
  fireEvent.change(screen.getByRole("searchbox"), {
    target: { value: "finns inte" },
  });
  expect(
    screen.getByRole("heading", { name: "Inga kort matchar sökningen" }),
  ).toBeTruthy();
  fireEvent.click(
    screen.getByRole("button", { name: "Visa alla registreringar" }),
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Redigera Pokémon Pikachu" }),
  );
  fireEvent.change(
    editor().getByRole("spinbutton", { name: /^Antal exemplar/ }),
    { target: { value: "5" } },
  );
  fireEvent.change(inputNotes(), { target: { value: "Egen anteckning" } });
  submit();
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  expect(repository.update).toHaveBeenCalledWith(
    expect.objectContaining({
      id: saved.id,
      expectedRevision: 1,
      fields: expect.objectContaining({
        quantity: 5,
        notes: "Egen anteckning",
      }),
    }),
  );
  page.unmount();
  render(<CollectionScreen repository={repository} />);
  await screen.findByRole("heading", { name: "Pokémon Pikachu" });
  expect(screen.getByLabelText("Antal exemplar").textContent).toBe("5");
  expect(screen.getByText("Egen anteckning")).toBeTruthy();
  expect(rows.size).toBe(1);
});

it("retains the complete draft and the same create ID after an unconfirmed save, then retries without duplicates", async () => {
  const { repository, rows } = testRepository();
  const persist = repository.create.getMockImplementation()!;
  repository.create.mockImplementationOnce(async (input) => {
    await persist(input); // The database committed but the caller did not receive confirmation.
    throw new CollectionRepositoryError("STORAGE_UNAVAILABLE");
  });
  render(<CollectionScreen repository={repository} />);
  await openNew();
  fireEvent.change(inputName(), { target: { value: "Leonards kort" } });
  fireEvent.change(inputNotes(), { target: { value: "Behåll mitt utkast" } });
  submit();
  await editor().findByText(/Ditt utkast finns kvar/);
  expect((inputName() as HTMLInputElement).value).toBe("Leonards kort");
  expect((inputNotes() as HTMLTextAreaElement).value).toBe(
    "Behåll mitt utkast",
  );
  expect(screen.getByRole("dialog")).toBeTruthy();
  submit();
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  expect(repository.create).toHaveBeenCalledTimes(2);
  expect(repository.create.mock.calls[0][0].id).toBe(
    repository.create.mock.calls[1][0].id,
  );
  expect(rows.size).toBe(1);
  expect(screen.getByLabelText("Antal exemplar").textContent).toBe("1");
});

it("blocks rapid repeated submission and keeps the form open until persistence confirms success", async () => {
  const { repository } = testRepository();
  const pending = deferred<CollectionCard>();
  repository.create.mockImplementationOnce(() => pending.promise);
  render(<CollectionScreen repository={repository} />);
  await openNew();
  fireEvent.change(inputName(), { target: { value: "Ett kort" } });
  const form = editor().getByRole("form", { name: "Kortuppgifter" });
  fireEvent.submit(form);
  fireEvent.submit(form);
  expect(repository.create).toHaveBeenCalledTimes(1);
  expect(screen.getByRole("dialog")).toBeTruthy();
  expect(
    (editor().getByRole("button", { name: "Sparar…" }) as HTMLButtonElement)
      .disabled,
  ).toBe(true);
  const input = repository.create.mock.calls[0][0];
  await act(async () =>
    pending.resolve(card({ ...input.fields, id: input.id })),
  );
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  expect(screen.getByRole("heading", { name: "Ett kort" })).toBeTruthy();
});

it("rejects zero, fractional, excessive and empty quantities without writing or losing the name", async () => {
  const { repository } = testRepository();
  render(<CollectionScreen repository={repository} />);
  await openNew();
  fireEvent.change(inputName(), { target: { value: "Mitt kort" } });
  for (const value of ["0", "1.5", "10000", ""]) {
    fireEvent.change(
      editor().getByRole("spinbutton", { name: /^Antal exemplar/ }),
      { target: { value } },
    );
    submit();
    expect(
      editor().getByText("Ange ett helt antal mellan 1 och 9 999."),
    ).toBeTruthy();
    expect(repository.create).not.toHaveBeenCalled();
    expect((inputName() as HTMLInputElement).value).toBe("Mitt kort");
  }
  fireEvent.change(
    editor().getByRole("spinbutton", { name: /^Antal exemplar/ }),
    { target: { value: "2" } },
  );
  submit();
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  expect(repository.create).toHaveBeenCalledTimes(1);
});

it("requires an explicit discard choice and can keep an unsaved draft without any write", async () => {
  const { repository } = testRepository();
  render(<CollectionScreen repository={repository} />);
  await openNew();
  fireEvent.change(inputName(), { target: { value: "Osparat kort" } });
  fireEvent.click(
    editor().getByRole("button", { name: "Avbryt", exact: true }),
  );
  let confirm = within(screen.getByRole("alertdialog"));
  expect(
    confirm.getByRole("heading", { name: "Kasta dina ändringar?" }),
  ).toBeTruthy();
  fireEvent.click(confirm.getByRole("button", { name: "Behåll mitt utkast" }));
  expect((inputName() as HTMLInputElement).value).toBe("Osparat kort");
  fireEvent.click(
    editor().getByRole("button", { name: "Stäng kortformuläret" }),
  );
  confirm = within(screen.getByRole("alertdialog"));
  fireEvent.click(confirm.getByRole("button", { name: "Kasta ändringar" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  expect(repository.create).not.toHaveBeenCalled();
  expect(repository.update).not.toHaveBeenCalled();
});

it("preserves a conflicting edit and only replaces its draft after an explicit reload choice", async () => {
  const { repository, rows } = testRepository([card()]);
  render(<CollectionScreen repository={repository} />);
  await screen.findByRole("heading", { name: "Pikachu" });
  fireEvent.click(screen.getByRole("button", { name: "Redigera Pikachu" }));
  fireEvent.change(inputNotes(), { target: { value: "Mitt utkast" } });
  rows.set(
    firstId,
    card({ revision: 2, updatedAt: 150, notes: "Sparad ny version" }),
  );
  submit();
  await editor().findByText(/Ditt utkast finns kvar/);
  expect((inputNotes() as HTMLTextAreaElement).value).toBe("Mitt utkast");
  expect(repository.update).toHaveBeenCalledTimes(1);
  fireEvent.click(
    editor().getByRole("button", { name: "Läs in sparad version" }),
  );
  fireEvent.click(
    within(screen.getByRole("alertdialog")).getByRole("button", {
      name: "Behåll mitt utkast",
    }),
  );
  expect((inputNotes() as HTMLTextAreaElement).value).toBe("Mitt utkast");
  fireEvent.click(
    editor().getByRole("button", { name: "Läs in sparad version" }),
  );
  fireEvent.click(
    within(screen.getByRole("alertdialog")).getByRole("button", {
      name: "Läs in sparad version",
    }),
  );
  await waitFor(() =>
    expect((inputNotes() as HTMLTextAreaElement).value).toBe(
      "Sparad ny version",
    ),
  );
  expect(repository.update).toHaveBeenCalledTimes(1);
  fireEvent.change(inputNotes(), { target: { value: "Mitt nya val" } });
  submit();
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  expect(repository.update.mock.calls[1][0].expectedRevision).toBe(2);
  expect(rows.get(firstId)?.notes).toBe("Mitt nya val");
});

it("deletes only after explicit confirmation and retains the confirmation on a failed delete", async () => {
  const { repository, rows } = testRepository([card({ quantity: 4 })]);
  repository.remove.mockRejectedValueOnce(
    new CollectionRepositoryError("STORAGE_UNAVAILABLE"),
  );
  render(<CollectionScreen repository={repository} />);
  await screen.findByRole("heading", { name: "Pikachu" });
  fireEvent.click(screen.getByRole("button", { name: "Ta bort Pikachu" }));
  expect(repository.remove).not.toHaveBeenCalled();
  fireEvent.click(
    within(screen.getByRole("alertdialog")).getByRole("button", {
      name: "Behåll kortet",
    }),
  );
  expect(rows.size).toBe(1);
  fireEvent.click(screen.getByRole("button", { name: "Ta bort Pikachu" }));
  fireEvent.click(
    within(screen.getByRole("alertdialog")).getByRole("button", {
      name: "Ta bort registreringen",
      exact: true,
    }),
  );
  await within(screen.getByRole("alertdialog")).findByRole("alert");
  expect(rows.size).toBe(1);
  fireEvent.click(
    within(screen.getByRole("alertdialog")).getByRole("button", {
      name: "Ta bort registreringen",
      exact: true,
    }),
  );
  await screen.findByRole("heading", { name: "Ditt första kort börjar här." });
  expect(repository.remove.mock.calls[1][0]).toEqual({
    id: firstId,
    expectedRevision: 1,
  });
  expect(rows.size).toBe(0);
  expect(screen.getByLabelText("Antal exemplar").textContent).toBe("0");
});

it("shows unavailable storage honestly and blocks mutations until a successful retry", async () => {
  const { repository } = testRepository();
  repository.list.mockRejectedValueOnce(
    new CollectionRepositoryError("STORAGE_UNAVAILABLE"),
  );
  render(<CollectionScreen repository={repository} />);
  await screen.findByRole("heading", { name: "Samlingen kunde inte öppnas" });
  expect(screen.getByRole("alert").textContent).toContain("Öppna Androidappen");
  expect(
    screen.queryByRole("heading", { name: "Ditt första kort börjar här." }),
  ).toBeNull();
  expect(screen.getByLabelText("Antal exemplar").textContent).toBe("—");
  const add = screen.getByRole("button", {
    name: "Lägg till kort",
    exact: true,
  });
  expect((add as HTMLButtonElement).disabled).toBe(true);
  fireEvent.click(add);
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(repository.create).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Försök läsa igen" }));
  await screen.findByRole("heading", { name: "Ditt första kort börjar här." });
  expect(
    (
      screen.getByRole("button", {
        name: "Lägg till kort",
        exact: true,
      }) as HTMLButtonElement
    ).disabled,
  ).toBe(false);
  expect(repository.list).toHaveBeenCalledTimes(2);
});

it("preserves opaque catalogue identities when editing inventory fields and locks edition fields", async () => {
  const original = card({
    setId: "provider:edition/Japanese",
    catalogueCardId: "provider/card-001?variant=original",
    language: "ja",
    setName: "ポケモンカード151",
    variant: "masterball",
  });
  const { repository, rows } = testRepository([original]);
  render(<CollectionScreen repository={repository} />);
  await screen.findByRole("heading", { name: "Pikachu" });
  fireEvent.click(screen.getByRole("button", { name: "Redigera Pikachu" }));
  expect(
    editor().getByText(/Kortets utgåva är kopplad till katalogen/),
  ).toBeTruthy();
  for (const field of [
    inputName(),
    editor().getByRole("textbox", { name: "Set", exact: true }),
    editor().getByRole("textbox", { name: /^Kortnummer/ }),
    editor().getByRole("combobox", { name: /^Språk/ }),
    editor().getByRole("textbox", { name: /^Variant/ }),
  ]) {
    expect((field as HTMLInputElement).disabled).toBe(true);
  }
  fireEvent.change(
    editor().getByRole("spinbutton", { name: /^Antal exemplar/ }),
    { target: { value: "6" } },
  );
  fireEvent.change(
    editor().getByRole("textbox", { name: /^Förvaringsplats/ }),
    { target: { value: "Leonards pärm" } },
  );
  fireEvent.change(inputNotes(), { target: { value: "Behåll utgåvan" } });
  submit();
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  expect(rows.get(firstId)).toMatchObject({
    setId: original.setId,
    catalogueCardId: original.catalogueCardId,
    name: original.name,
    setName: original.setName,
    cardNumber: original.cardNumber,
    language: original.language,
    variant: original.variant,
    quantity: 6,
    location: "Leonards pärm",
    notes: "Behåll utgåvan",
    revision: 2,
  });
  expect(repository.update.mock.calls[0][0].expectedRevision).toBe(1);
});
