import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  CircleAlert,
  Layers3,
  Library,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Smartphone,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  CollectionRepositoryError,
  collectionCardFieldsSchema,
  type CollectionCard,
  type CollectionCardFields,
  type CollectionRepository,
} from "@/platform/collection";
import "./collection.css";

const languages: Record<CollectionCardFields["language"], string> = {
  en: "Engelska",
  ja: "Japanska",
  sv: "Svenska",
  de: "Tyska",
  fr: "Franska",
  es: "Spanska",
  it: "Italienska",
  pt: "Portugisiska",
  ko: "Koreanska",
  zh: "Kinesiska",
  other: "Annat språk",
  unknown: "Okänt språk",
};
const conditions: Record<CollectionCardFields["condition"], string> = {
  unknown: "Ej bedömt",
  mint: "Mint",
  near_mint: "Nära nyskick",
  lightly_played: "Lätt spelat",
  moderately_played: "Spelat",
  heavily_played: "Mycket spelat",
  damaged: "Skadat",
};

interface Draft {
  name: string;
  setName: string;
  cardNumber: string;
  language: CollectionCardFields["language"];
  variant: string;
  condition: CollectionCardFields["condition"];
  quantity: string;
  location: string;
  notes: string;
}
interface Editor {
  id: string;
  revision?: number;
  setId: string | null;
  catalogueCardId: string | null;
  original: Draft;
  draft: Draft;
}
type ReadState = "loading" | "ready" | "error";
type FieldErrors = Partial<Record<keyof Draft, string>>;
const fieldMessages: Record<keyof Draft, string> = {
  name: "Ange ett kortnamn med 1–120 tecken.",
  setName: "Setnamnet får innehålla högst 120 tecken.",
  cardNumber: "Kortnumret får innehålla högst 40 tecken.",
  language: "Välj ett språk i listan.",
  variant: "Varianten får innehålla högst 80 tecken.",
  condition: "Välj ett skick i listan.",
  quantity: "Ange ett helt antal mellan 1 och 9 999.",
  location: "Förvaringsplatsen får innehålla högst 120 tecken.",
  notes:
    "Anteckningen får innehålla högst 2 000 tecken och inga otillåtna kontrolltecken.",
};

const emptyDraft = (): Draft => ({
  name: "",
  setName: "",
  cardNumber: "",
  language: "en",
  variant: "normal",
  condition: "unknown",
  quantity: "1",
  location: "",
  notes: "",
});
const cardDraft = (card: CollectionCard): Draft => ({
  name: card.name,
  setName: card.setName,
  cardNumber: card.cardNumber,
  language: card.language,
  variant: card.variant,
  condition: card.condition,
  quantity: String(card.quantity),
  location: card.location,
  notes: card.notes,
});
const editCard = (card: CollectionCard): Editor => {
  const draft = cardDraft(card);
  return {
    id: card.id,
    revision: card.revision,
    setId: card.setId,
    catalogueCardId: card.catalogueCardId,
    original: draft,
    draft,
  };
};
const sorted = (cards: CollectionCard[]) =>
  [...cards].sort(
    (a, b) => b.updatedAt - a.updatedAt || a.id.localeCompare(b.id),
  );
const searchText = (value: string) =>
  value
    .normalize("NFKC")
    .normalize("NFD")
    .replace(/(\p{Script=Latin})\p{M}+/gu, "$1")
    .normalize("NFC")
    .toLocaleLowerCase("sv");
const safeError = (error: unknown, fallback: string) =>
  error instanceof CollectionRepositoryError ? error.message : fallback;
const isConflict = (error: unknown) =>
  error instanceof CollectionRepositoryError &&
  (error.code === "CONFLICT" || error.code === "NOT_FOUND");

export default function CollectionScreen({
  repository,
}: {
  repository: CollectionRepository;
}) {
  const [cards, setCards] = useState<CollectionCard[]>([]);
  const [readState, setReadState] = useState<ReadState>("loading");
  const [readError, setReadError] = useState("");
  const [query, setQuery] = useState("");
  const [editor, setEditor] = useState<Editor | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState("");
  const [conflicted, setConflicted] = useState(false);
  const [confirmation, setConfirmation] = useState<"discard" | "reload" | null>(
    null,
  );
  const [deleting, setDeleting] = useState<CollectionCard | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [deleteConflict, setDeleteConflict] = useState(false);
  const [busy, setBusy] = useState<"save" | "delete" | "reload" | null>(null);
  const [feedback, setFeedback] = useState("");
  const operation = useRef(false);
  const mounted = useRef(false);
  const readGeneration = useRef(0);
  const formErrorElement = useRef<HTMLDivElement>(null);
  const invalidateReads = useCallback(() => {
    readGeneration.current++;
  }, []);
  const dirty = Boolean(
    editor && JSON.stringify(editor.draft) !== JSON.stringify(editor.original),
  );
  const linked = Boolean(
    editor && (editor.setId !== null || editor.catalogueCardId !== null),
  );
  const ready = readState === "ready";

  const loadCollection = useCallback(async () => {
    const generation = ++readGeneration.current;
    setReadState("loading");
    setReadError("");
    try {
      const result = await repository.list();
      if (!mounted.current || readGeneration.current !== generation) return;
      setCards(sorted(result));
      setReadState("ready");
      return result;
    } catch (error) {
      if (!mounted.current || readGeneration.current !== generation) return;
      setReadError(
        safeError(
          error,
          "Samlingen kunde inte läsas. Försök igen. Inga uppgifter har ersatts.",
        ),
      );
      setReadState("error");
    }
  }, [repository]);

  useEffect(() => {
    mounted.current = true;
    void loadCollection();
    return () => {
      mounted.current = false;
      invalidateReads();
    };
  }, [loadCollection, invalidateReads]);

  useEffect(() => {
    if (formError) formErrorElement.current?.focus();
  }, [formError]);
  useEffect(() => {
    if (!dirty) return;
    const preventLoss = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", preventLoss);
    return () => window.removeEventListener("beforeunload", preventLoss);
  }, [dirty]);

  const visible = useMemo(() => {
    const needle = searchText(query.trim());
    return cards.filter((card) =>
      searchText(
        [
          card.name,
          card.setName,
          card.cardNumber,
          card.location,
          card.notes,
          card.variant,
          languages[card.language],
          card.language,
          conditions[card.condition],
        ].join(" "),
      ).includes(needle),
    );
  }, [cards, query]);
  const copies = cards.reduce((sum, card) => sum + card.quantity, 0);

  const clearEditor = () => {
    setEditor(null);
    setFieldErrors({});
    setFormError("");
    setConflicted(false);
    setConfirmation(null);
  };
  const requestClose = () => {
    if (operation.current) return;
    if (dirty) setConfirmation("discard");
    else clearEditor();
  };
  const openNew = () => {
    if (!ready || operation.current) return;
    try {
      const draft = emptyDraft();
      setEditor({
        id: crypto.randomUUID(),
        setId: null,
        catalogueCardId: null,
        original: draft,
        draft,
      });
      setFieldErrors({});
      setFormError("");
      setConflicted(false);
      setFeedback("");
    } catch {
      setFeedback("Ett nytt kort kunde inte förberedas. Försök igen.");
    }
  };
  const openEdit = (card: CollectionCard) => {
    if (!ready || operation.current) return;
    setEditor(editCard(card));
    setFieldErrors({});
    setFormError("");
    setConflicted(false);
    setFeedback("");
  };
  const change = <K extends keyof Draft>(field: K, value: Draft[K]) => {
    setEditor((current) =>
      current
        ? { ...current, draft: { ...current.draft, [field]: value } }
        : current,
    );
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
  };
  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!editor || !ready || operation.current || conflicted) return;
    const draft = editor.draft;
    const parsed = collectionCardFieldsSchema.safeParse({
      name: draft.name,
      setId: editor.setId,
      setName: draft.setName,
      cardNumber: draft.cardNumber,
      catalogueCardId: editor.catalogueCardId,
      language: draft.language,
      variant: draft.variant,
      condition: draft.condition,
      quantity: /^\d+$/.test(draft.quantity.trim())
        ? Number(draft.quantity)
        : NaN,
      location: draft.location,
      notes: draft.notes,
    });
    if (!parsed.success) {
      const errors: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as keyof Draft;
        if (field in fieldMessages) errors[field] = fieldMessages[field];
      }
      setFieldErrors(errors);
      const first = Object.keys(errors)[0];
      if (first) document.getElementById(`collection-${first}`)?.focus();
      return;
    }
    operation.current = true;
    setBusy("save");
    setFormError("");
    // The runtime schema requires every field; this repo's non-strict TS mode widens Zod's inferred type.
    const validatedFields = parsed.data as CollectionCardFields;
    try {
      const saved =
        editor.revision === undefined
          ? await repository.create({ id: editor.id, fields: validatedFields })
          : await repository.update({
              id: editor.id,
              expectedRevision: editor.revision,
              fields: validatedFields,
            });
      if (!mounted.current) return;
      setCards((current) =>
        sorted([saved, ...current.filter((card) => card.id !== saved.id)]),
      );
      clearEditor();
      setFeedback("Kortet är sparat på den här telefonen.");
    } catch (error) {
      if (!mounted.current) return;
      setConflicted(isConflict(error));
      setFormError(
        `${safeError(error, "Kortet kunde inte sparas.")} Ditt utkast finns kvar.`,
      );
    } finally {
      operation.current = false;
      if (mounted.current) setBusy(null);
    }
  };
  const reload = async (replaceDraft = false) => {
    if (operation.current) return;
    operation.current = true;
    setBusy("reload");
    const editorId = editor?.id;
    try {
      const result = await loadCollection();
      if (!mounted.current) return;
      if (result && replaceDraft && editorId) {
        const saved = result.find((card) => card.id === editorId);
        if (saved) {
          setEditor(editCard(saved));
          setFieldErrors({});
          setFormError("");
          setConflicted(false);
        } else {
          setFormError(
            "Kortet finns inte längre i samlingen. Ditt utkast finns kvar.",
          );
          setConflicted(true);
        }
      } else if (!result && editorId)
        setFormError(
          "Samlingen kunde inte läsas. Ditt utkast finns kvar. Försök läsa igen.",
        );
      if (result && deleting) {
        setDeleting(null);
        setDeleteError("");
        setDeleteConflict(false);
      }
      setConfirmation(null);
    } finally {
      operation.current = false;
      if (mounted.current) setBusy(null);
    }
  };
  const remove = async () => {
    if (!deleting || !ready || operation.current || deleteConflict) return;
    operation.current = true;
    setBusy("delete");
    setDeleteError("");
    try {
      await repository.remove({
        id: deleting.id,
        expectedRevision: deleting.revision,
      });
      if (!mounted.current) return;
      setCards((current) => current.filter((card) => card.id !== deleting.id));
      setDeleting(null);
      setFeedback("Registreringen är borttagen från den här telefonen.");
    } catch (error) {
      if (!mounted.current) return;
      setDeleteError(
        safeError(error, "Kortet kunde inte tas bort. Försök igen."),
      );
      setDeleteConflict(isConflict(error));
    } finally {
      operation.current = false;
      if (mounted.current) setBusy(null);
    }
  };
  const invalid = (field: keyof Draft) => ({
    "aria-invalid": Boolean(fieldErrors[field]),
    "aria-describedby": fieldErrors[field]
      ? `collection-${field}-error`
      : undefined,
  });
  const errorFor = (field: keyof Draft) =>
    fieldErrors[field] && (
      <span
        id={`collection-${field}-error`}
        className="android-collection-field-error"
        role="alert"
      >
        {fieldErrors[field]}
      </span>
    );

  return (
    <section
      className="android-collection"
      aria-labelledby="android-collection-heading"
    >
      <header className="android-collection-header">
        <div>
          <p className="android-collection-eyebrow">Dina fynd, på din plats</p>
          <h1 id="android-collection-heading">Min samling</h1>
          <p className="android-collection-private">
            <Smartphone aria-hidden="true" />
            Sparas bara på den här telefonen
          </p>
        </div>
        <Button onClick={openNew} disabled={!ready || Boolean(busy)}>
          <Plus aria-hidden="true" />
          Lägg till kort
        </Button>
      </header>

      <dl className="android-collection-metrics">
        <div>
          <dt>
            <Layers3 aria-hidden="true" />
            Exemplar
          </dt>
          <dd aria-label="Antal exemplar">
            {ready ? copies.toLocaleString("sv-SE") : "—"}
          </dd>
        </div>
        <div>
          <dt>
            <Library aria-hidden="true" />
            Registreringar
          </dt>
          <dd aria-label="Antal registreringar">
            {ready ? cards.length.toLocaleString("sv-SE") : "—"}
          </dd>
        </div>
      </dl>
      {feedback && (
        <p className="android-collection-feedback" role="status">
          {feedback}
        </p>
      )}

      {readState === "loading" ? (
        <div className="android-collection-state" role="status">
          <Loader2 className="animate-spin" aria-hidden="true" />
          <h2>Läser din samling…</h2>
          <p>Vänta tills den lokala lagringen har svarat.</p>
        </div>
      ) : readState === "error" ? (
        <div className="android-collection-state android-collection-state--error">
          <CircleAlert aria-hidden="true" />
          <h2>Samlingen kunde inte öppnas</h2>
          <p role="alert">{readError}</p>
          <p>
            Ingen samling har lästs in. Försök igen innan du lägger till eller
            ändrar kort.
          </p>
          <Button
            variant="outline"
            onClick={() => void reload()}
            disabled={Boolean(busy)}
          >
            <RefreshCw aria-hidden="true" />
            Försök läsa igen
          </Button>
        </div>
      ) : cards.length === 0 ? (
        <div className="android-collection-state">
          <span className="android-collection-empty-icon">
            <Library aria-hidden="true" />
          </span>
          <h2>Ditt första kort börjar här.</h2>
          <p>
            Registrera ett kort och ge det en plats i din samling. Uppgifterna
            stannar på den här telefonen.
          </p>
          <Button onClick={openNew}>
            <Plus aria-hidden="true" />
            Registrera ditt första kort
          </Button>
        </div>
      ) : (
        <>
          <div className="android-collection-search">
            <Search aria-hidden="true" />
            <label className="sr-only" htmlFor="collection-search">
              Sök i din samling
            </label>
            <input
              id="collection-search"
              type="search"
              value={query}
              maxLength={200}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Namn, set, nummer eller plats"
            />
            {query && (
              <button
                type="button"
                aria-label="Rensa samlingssökning"
                onClick={() => setQuery("")}
              >
                <X aria-hidden="true" />
              </button>
            )}
          </div>
          <div className="android-collection-list-heading">
            <p role="status">
              {visible.length} av {cards.length} registreringar
            </p>
            <button
              type="button"
              onClick={() => void reload()}
              disabled={Boolean(busy)}
            >
              <RefreshCw aria-hidden="true" />
              Läs om samlingen
            </button>
          </div>
          {visible.length ? (
            <ul
              className="android-collection-list"
              aria-label="Kort i din samling"
            >
              {visible.map((card) => (
                <li key={card.id} className="android-collection-card">
                  <div className="android-collection-card-head">
                    <span
                      className="android-collection-number"
                      aria-hidden="true"
                    >
                      {card.cardNumber ? `#${card.cardNumber}` : <Layers3 />}
                    </span>
                    <div className="android-collection-card-title">
                      <p>
                        {card.setName || "Set ej angivet"}
                        {card.cardNumber && <span> · #{card.cardNumber}</span>}
                      </p>
                      <h2>{card.name}</h2>
                      <span>
                        {languages[card.language]} ·{" "}
                        {card.variant || "Variant ej angiven"} ·{" "}
                        {conditions[card.condition]}
                      </span>
                    </div>
                    <strong className="android-collection-quantity">
                      ×{card.quantity}
                    </strong>
                  </div>
                  {card.location && (
                    <p className="android-collection-location">
                      <MapPin aria-hidden="true" />
                      {card.location}
                    </p>
                  )}
                  {card.notes && (
                    <p className="android-collection-notes">{card.notes}</p>
                  )}
                  <div className="android-collection-card-actions">
                    <Button
                      variant="outline"
                      onClick={() => openEdit(card)}
                      aria-label={`Redigera ${card.name}`}
                      disabled={Boolean(busy)}
                    >
                      <Pencil aria-hidden="true" />
                      Redigera
                    </Button>
                    <Button
                      variant="ghost"
                      className="android-collection-remove"
                      onClick={() => {
                        setDeleting(card);
                        setDeleteError("");
                        setDeleteConflict(false);
                      }}
                      aria-label={`Ta bort ${card.name}`}
                      disabled={Boolean(busy)}
                    >
                      <Trash2 aria-hidden="true" />
                      Ta bort
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="android-collection-state">
              <Search aria-hidden="true" />
              <h2>Inga kort matchar sökningen</h2>
              <p>Prova ett annat namn, set eller en förvaringsplats.</p>
              <Button variant="outline" onClick={() => setQuery("")}>
                Visa alla registreringar
              </Button>
            </div>
          )}
        </>
      )}

      <Dialog
        open={Boolean(editor)}
        onOpenChange={(open) => {
          if (!open) requestClose();
        }}
      >
        {editor && (
          <DialogContent
            className="android-collection-dialog"
            closeLabel="Stäng kortformuläret"
          >
            <DialogHeader>
              <p className="android-collection-eyebrow">Manuell registrering</p>
              <DialogTitle>
                {editor.revision === undefined
                  ? "Lägg till ett kort"
                  : "Redigera kort"}
              </DialogTitle>
              <DialogDescription>
                Sparas bara på den här telefonen. Kontrollera uppgifterna innan
                du sparar.
              </DialogDescription>
            </DialogHeader>
            <form
              onSubmit={(event) => void save(event)}
              noValidate
              aria-label="Kortuppgifter"
            >
              <fieldset disabled={Boolean(busy) || !ready}>
                {formError && (
                  <div
                    ref={formErrorElement}
                    tabIndex={-1}
                    className="android-collection-form-error"
                    role="alert"
                  >
                    <CircleAlert aria-hidden="true" />
                    <p>{formError}</p>
                  </div>
                )}
                {readState === "error" && (
                  <p className="android-collection-form-error" role="alert">
                    Lagringen måste kunna läsas innan du sparar. Ditt utkast
                    behålls.
                  </p>
                )}
                {linked && (
                  <p className="android-collection-field-help">
                    Kortets utgåva är kopplad till katalogen. Du kan ändra
                    antal, skick, förvaring och anteckningar.
                  </p>
                )}
                <label
                  className="android-collection-field"
                  htmlFor="collection-name"
                >
                  <span>
                    Kortnamn <span aria-hidden="true">*</span>
                  </span>
                  <input
                    id="collection-name"
                    value={editor.draft.name}
                    onChange={(event) => change("name", event.target.value)}
                    disabled={linked}
                    maxLength={120}
                    required
                    autoComplete="off"
                    {...invalid("name")}
                  />
                  {errorFor("name")}
                </label>
                <div className="android-collection-field-row">
                  <label
                    className="android-collection-field"
                    htmlFor="collection-setName"
                  >
                    <span>Set</span>
                    <input
                      id="collection-setName"
                      value={editor.draft.setName}
                      onChange={(event) =>
                        change("setName", event.target.value)
                      }
                      disabled={linked}
                      maxLength={120}
                      autoComplete="off"
                      {...invalid("setName")}
                    />
                    {errorFor("setName")}
                  </label>
                  <label
                    className="android-collection-field"
                    htmlFor="collection-cardNumber"
                  >
                    <span>Kortnummer</span>
                    <input
                      id="collection-cardNumber"
                      value={editor.draft.cardNumber}
                      onChange={(event) =>
                        change("cardNumber", event.target.value)
                      }
                      disabled={linked}
                      maxLength={40}
                      placeholder="Till exempel 001/165"
                      autoComplete="off"
                      {...invalid("cardNumber")}
                    />
                    {errorFor("cardNumber")}
                  </label>
                </div>
                {!linked && (
                  <p className="android-collection-field-help">
                    Set och tryckt kortnummer anges manuellt. Katalogkopplingen
                    kontrolleras inte i den här versionen.
                  </p>
                )}
                <div className="android-collection-field-row">
                  <label
                    className="android-collection-field"
                    htmlFor="collection-quantity"
                  >
                    <span>Antal exemplar</span>
                    <input
                      id="collection-quantity"
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={9999}
                      step={1}
                      value={editor.draft.quantity}
                      onChange={(event) =>
                        change("quantity", event.target.value)
                      }
                      required
                      {...invalid("quantity")}
                    />
                    {errorFor("quantity")}
                  </label>
                  <label
                    className="android-collection-field"
                    htmlFor="collection-language"
                  >
                    <span>Språk</span>
                    <select
                      id="collection-language"
                      value={editor.draft.language}
                      onChange={(event) =>
                        change(
                          "language",
                          event.target.value as Draft["language"],
                        )
                      }
                      disabled={linked}
                      {...invalid("language")}
                    >
                      {Object.entries(languages).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                    {errorFor("language")}
                  </label>
                </div>
                <div className="android-collection-field-row">
                  <label
                    className="android-collection-field"
                    htmlFor="collection-variant"
                  >
                    <span>Variant</span>
                    <input
                      id="collection-variant"
                      value={editor.draft.variant}
                      onChange={(event) =>
                        change("variant", event.target.value)
                      }
                      disabled={linked}
                      maxLength={80}
                      placeholder="Till exempel normal eller holo"
                      {...invalid("variant")}
                    />
                    {errorFor("variant")}
                  </label>
                  <label
                    className="android-collection-field"
                    htmlFor="collection-condition"
                  >
                    <span>Skick</span>
                    <select
                      id="collection-condition"
                      value={editor.draft.condition}
                      onChange={(event) =>
                        change(
                          "condition",
                          event.target.value as Draft["condition"],
                        )
                      }
                      {...invalid("condition")}
                    >
                      {Object.entries(conditions).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                    {errorFor("condition")}
                  </label>
                </div>
                <label
                  className="android-collection-field"
                  htmlFor="collection-location"
                >
                  <span>Förvaringsplats</span>
                  <input
                    id="collection-location"
                    value={editor.draft.location}
                    onChange={(event) => change("location", event.target.value)}
                    maxLength={120}
                    placeholder="Till exempel Blå pärmen · sida 3"
                    {...invalid("location")}
                  />
                  {errorFor("location")}
                </label>
                <label
                  className="android-collection-field"
                  htmlFor="collection-notes"
                >
                  <span>Anteckningar</span>
                  <textarea
                    id="collection-notes"
                    value={editor.draft.notes}
                    onChange={(event) => change("notes", event.target.value)}
                    maxLength={2000}
                    rows={4}
                    {...invalid("notes")}
                  />
                  {errorFor("notes")}
                  <span className="android-collection-character-count">
                    {editor.draft.notes.length}/2 000
                  </span>
                </label>
              </fieldset>
              {conflicted && (
                <div className="android-collection-recovery">
                  <p>
                    Inget skrivs över automatiskt. Läs in den sparade versionen
                    för att fortsätta, eller behåll ditt utkast.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setConfirmation("reload")}
                    disabled={Boolean(busy)}
                  >
                    Läs in sparad version
                  </Button>
                </div>
              )}
              {readState === "error" && (
                <div className="android-collection-recovery">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void reload()}
                    disabled={Boolean(busy)}
                  >
                    Försök läsa igen
                  </Button>
                </div>
              )}
              <div className="android-collection-form-actions">
                <Button
                  type="button"
                  variant="outline"
                  onClick={requestClose}
                  disabled={Boolean(busy)}
                >
                  Avbryt
                </Button>
                <Button
                  type="submit"
                  disabled={Boolean(busy) || !ready || conflicted}
                >
                  {busy === "save" ? (
                    <>
                      <Loader2 className="animate-spin" aria-hidden="true" />
                      Sparar…
                    </>
                  ) : (
                    "Spara kortet"
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        )}
      </Dialog>

      <AlertDialog
        open={Boolean(confirmation)}
        onOpenChange={(open) => {
          if (!open && !operation.current) setConfirmation(null);
        }}
      >
        <AlertDialogContent className="android-collection-confirm">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmation === "reload"
                ? "Läsa in den sparade versionen?"
                : "Kasta dina ändringar?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmation === "reload"
                ? "Ditt osparade utkast ersätts först om den sparade versionen kan läsas. Inga uppgifter skrivs till samlingen."
                : "Uppgifterna i formuläret är inte sparade. Välj om du vill fortsätta redigera eller kasta utkastet."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={Boolean(busy)}>
              Behåll mitt utkast
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={Boolean(busy)}
              onClick={(event) => {
                if (confirmation === "reload") {
                  event.preventDefault();
                  void reload(true);
                } else clearEditor();
              }}
            >
              {confirmation === "reload"
                ? busy
                  ? "Läser…"
                  : "Läs in sparad version"
                : "Kasta ändringar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => {
          if (!open && !operation.current) {
            setDeleting(null);
            setDeleteError("");
            setDeleteConflict(false);
          }
        }}
      >
        <AlertDialogContent className="android-collection-confirm">
          <AlertDialogHeader>
            <AlertDialogTitle>Ta bort registreringen?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting?.name} · {deleting?.quantity} exemplar tas bort från den
              här telefonens samling. Åtgärden kan inte ångras här.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError && (
            <p role="alert" className="android-collection-form-error">
              {deleteError}
            </p>
          )}
          {deleteConflict && (
            <Button
              type="button"
              variant="outline"
              onClick={() => void reload()}
              disabled={Boolean(busy)}
            >
              Läs om samlingen
            </Button>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={Boolean(busy)}>
              Behåll kortet
            </AlertDialogCancel>
            <AlertDialogAction
              className="android-collection-destructive"
              disabled={Boolean(busy) || !ready || deleteConflict}
              onClick={(event) => {
                event.preventDefault();
                void remove();
              }}
            >
              {busy === "delete" ? "Tar bort…" : "Ta bort registreringen"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
