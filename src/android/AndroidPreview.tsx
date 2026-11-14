import { useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUpRight,
  Check,
  ChevronDown,
  Info,
  Layers3,
  Search,
  Smartphone,
  Sparkles,
  WifiOff,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  previewCatalogueDates,
  previewInternationalSets,
  previewJapaneseSets,
  searchPreviewSets,
  type PreviewSet,
} from "./previewCatalogue";

const PAGE_SIZE = 24;
const number = (value: number) => value.toLocaleString("sv-SE");
const date = (value: string) => value.split("-").reverse().join(".");

function SetSummary({ set }: { set: PreviewSet }) {
  return (
    <li className="android-set">
      <div className="android-set-art" aria-hidden="true">
        <Layers3 strokeWidth={1.2} />
        <span>{set.code}</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="android-set-meta">
          <span>{set.series}</span>
          <span>{set.releaseDate.slice(0, 4)}</span>
        </div>
        <h3>{set.name}</h3>
        {set.nativeName && (
          <p className="android-native-name" lang="ja">
            {set.nativeName}
          </p>
        )}
        <div className="android-set-facts">
          <span>{number(set.total)} katalogkort</span>
          <span className="android-edition">
            {set.language === "ja" ? "Japan" : "Engelska"}
          </span>
        </div>
      </div>
    </li>
  );
}

export default function AndroidPreview() {
  const [query, setQuery] = useState("");
  const [includeJapan, setIncludeJapan] = useState(false);
  const [limit, setLimit] = useState(PAGE_SIZE);
  const searchInput = useRef<HTMLInputElement>(null);
  const clearSearch = () => {
    setQuery("");
    setLimit(PAGE_SIZE);
    searchInput.current?.focus();
  };
  const scope = useMemo(
    () =>
      includeJapan
        ? [...previewJapaneseSets, ...previewInternationalSets]
        : previewInternationalSets,
    [includeJapan],
  );
  const matches = useMemo(
    () => searchPreviewSets(scope, query),
    [scope, query],
  );
  const shown = matches.slice(0, limit);

  return (
    <div className="android-preview">
      <a className="android-skip-link" href="#main-content">
        Hoppa till innehållet
      </a>
      <header className="android-header">
        <div className="android-wordmark">
          <span className="android-brand-mark" aria-hidden="true">
            <Layers3 strokeWidth={1.7} />
          </span>
          <span>Card Lens</span>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="min-h-11 min-w-11"
              aria-label="Om förhandsversionen"
            >
              <Info />
            </Button>
          </DialogTrigger>
          <DialogContent
            closeLabel="Stäng informationen"
            className="android-info-dialog"
          >
            <DialogHeader>
              <DialogTitle>Första steget mot din Androidapp</DialogTitle>
              <DialogDescription>
                Version 0.1 · Förhandsversion
              </DialogDescription>
            </DialogHeader>
            <p>
              Här kan du söka bland setens namn och information utan internet.
              Kortlistor, din privata samling, kamera och AI-skanning tillkommer
              i senare steg.
            </p>
            <p>
              Förhandsversionen innehåller inga egna kort och kräver ingen
              inloggning.
            </p>
            <div className="android-source-dates">
              <p>
                Engelska set · källdatum{" "}
                {date(previewCatalogueDates.international)}
              </p>
              <p>
                Japanska set · källdatum {date(previewCatalogueDates.japanese)}
              </p>
            </div>
          </DialogContent>
        </Dialog>
      </header>

      <main id="main-content" tabIndex={-1} className="android-main">
        <section className="android-hero" aria-labelledby="preview-heading">
          <div className="android-build-label">
            <Smartphone aria-hidden="true" />
            Android · Förhandsversion
          </div>
          <div className="android-hero-copy">
            <p className="android-eyebrow">För nästa stora lilla fynd</p>
            <h1 id="preview-heading">
              En värld av kort.
              <br />
              <span>Nu i din ficka.</span>
            </h1>
            <p className="android-hero-description">
              Börja med att utforska setbiblioteket. Setens namn och information
              finns i appen, även utan internet.
            </p>
            <Button asChild className="android-explore-button">
              <a href="#set-library">
                Utforska seten <ArrowDown aria-hidden="true" />
              </a>
            </Button>
          </div>
          <div className="android-hero-art" aria-hidden="true">
            <div className="android-decor-card android-decor-card--back" />
            <div className="android-decor-card android-decor-card--front">
              <Sparkles strokeWidth={1} />
              <span>CARD LENS</span>
              <span>Din nästa upptäckt</span>
            </div>
          </div>
          <div className="android-offline-note">
            <WifiOff aria-hidden="true" />
            Setöversikten fungerar offline
          </div>
        </section>

        <section
          className="android-coming-next"
          aria-label="Detta ingår i förhandsversionen"
        >
          <span className="android-next-icon" aria-hidden="true">
            <ArrowUpRight />
          </span>
          <div>
            <p>En första titt, med mer på väg.</p>
            <span>
              Din samling, kortens checklistor och skanning kommer senare. Här
              visas bara setinformation.
            </span>
          </div>
        </section>

        <section
          id="set-library"
          className="android-library"
          aria-labelledby="library-heading"
        >
          <div className="android-library-heading">
            <div>
              <p className="android-eyebrow">Hitta din nästa favorit</p>
              <h2 id="library-heading">Setbiblioteket</h2>
            </div>
            <span className="android-total-badge">{scope.length} set</span>
          </div>

          <div className="android-search">
            <Search aria-hidden="true" />
            <label className="sr-only" htmlFor="android-set-search">
              Sök i setbiblioteket
            </label>
            <input
              id="android-set-search"
              ref={searchInput}
              type="search"
              autoComplete="off"
              placeholder="Setnamn, kod eller japanskt namn"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setLimit(PAGE_SIZE);
              }}
            />
            {query && (
              <button
                type="button"
                aria-label="Rensa sökning"
                onClick={clearSearch}
              >
                <X aria-hidden="true" />
              </button>
            )}
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={includeJapan}
            aria-describedby="japanese-scope-description"
            className="android-japan-toggle"
            onClick={() => {
              setIncludeJapan((value) => !value);
              setLimit(PAGE_SIZE);
            }}
          >
            <span>Visa japanska specialset</span>
            <span className="android-toggle-track" aria-hidden="true">
              <span>{includeJapan && <Check />}</span>
            </span>
          </button>
          <p
            id="japanese-scope-description"
            className="android-scope-description"
          >
            {previewInternationalSets.length} engelska set
            {includeJapan
              ? ` + ${previewJapaneseSets.length} verifierade japanska specialset.`
              : `. Lägg till ${previewJapaneseSets.length} verifierade japanska specialset.`}
          </p>

          <p className="android-result-count" role="status" aria-live="polite">
            {matches.length === 0
              ? "Inga set matchar sökningen."
              : `Visar ${shown.length} av ${matches.length} set${query.trim() ? " som matchar sökningen" : ""}.`}
          </p>

          {shown.length ? (
            <ul className="android-set-list" aria-label="Set i biblioteket">
              {shown.map((set) => (
                <SetSummary key={set.id} set={set} />
              ))}
            </ul>
          ) : (
            <div className="android-empty-state">
              <Search aria-hidden="true" />
              <h3>Inga set hittades</h3>
              <p>
                Prova ett annat namn eller en setkod.
                {!includeJapan &&
                  " Slå på japanska specialset för att söka bland dem."}
              </p>
              <Button variant="outline" onClick={clearSearch}>
                Visa alla set
              </Button>
            </div>
          )}
          {shown.length < matches.length && (
            <Button
              variant="outline"
              className="android-show-more"
              onClick={() => setLimit((value) => value + PAGE_SIZE)}
            >
              Visa fler set <ChevronDown aria-hidden="true" />
            </Button>
          )}
        </section>
        <footer className="android-footer">
          <Layers3 aria-hidden="true" />
          <span>Card Lens · Förhandsversion 0.1</span>
        </footer>
      </main>
    </div>
  );
}
