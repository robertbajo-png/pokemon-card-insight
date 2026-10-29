import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  ScanLine,
  LayoutDashboard,
  Layers3,
  Library,
  Store,
  Users,
  Globe2,
  Sun,
  Moon,
  UserRound,
  ArrowUpRight,
  Search,
  MoreHorizontal,
  Download,
  ShieldCheck,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "next-themes";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";
import { isLocalHosting } from "@/lib/hosting";
import { cn } from "@/lib/utils";

// Navigation must work for guests and never requires an AI translation request.
const navigationTranslations: Record<
  "sv" | "en" | "de" | "fr" | "ja",
  Record<string, string>
> = {
  sv: {},
  en: {
    Översikt: "Overview",
    "Min samling": "My collection",
    Setbibliotek: "Set library",
    Marknad: "Marketplace",
    Vänner: "Friends",
    Set: "Sets",
    Skanna: "Scan",
    Samling: "Collection",
    Setdetalj: "Set details",
    Kortdetalj: "Card details",
    "Skanna kort": "Scan cards",
    "Din profil": "Your profile",
    "Ditt konto": "Your account",
    "Pokémon · Din samlarplats": "Pokémon · Your collection",
    "Hoppa till innehållet": "Skip to content",
    Sidomeny: "Sidebar",
    "Skanna ett kort": "Scan a card",
    Huvudnavigation: "Main navigation",
    "Din samlarplats": "Your collector space",
    Utforska: "Explore",
    "Din data. Din samling.": "Your data. Your collection.",
    "Varje kort har en historia.": "Every card has a story.",
    "Konton och samlingar sparas på datorn som kör appen.":
      "Accounts and collections are saved on the computer running the app.",
    "Samla dina favoriter och följ nästa upptäckt.":
      "Collect your favourites and find your next discovery.",
    "Installera appen": "Install the app",
    "Logga in": "Sign in",
    "Sök efter ett set": "Search for a set",
    "Välj språk": "Choose language",
    "Byt till ljust läge": "Switch to light mode",
    "Byt till mörkt läge": "Switch to dark mode",
    "Öppna profil": "Open profile",
    "Öppna konto": "Open account",
    Mobilnavigation: "Mobile navigation",
    "Öppna meny": "Open menu",
    Mer: "More",
    "Mer i Card Lens": "More in Card Lens",
  },
  de: {
    Översikt: "Übersicht",
    "Min samling": "Meine Sammlung",
    Setbibliotek: "Setbibliothek",
    Marknad: "Marktplatz",
    Vänner: "Freunde",
    Set: "Sets",
    Skanna: "Scannen",
    Samling: "Sammlung",
    Setdetalj: "Setdetails",
    Kortdetalj: "Kartendetails",
    "Skanna kort": "Karten scannen",
    "Din profil": "Dein Profil",
    "Ditt konto": "Dein Konto",
    "Pokémon · Din samlarplats": "Pokémon · Dein Sammelplatz",
    "Hoppa till innehållet": "Zum Inhalt springen",
    Sidomeny: "Seitenleiste",
    "Skanna ett kort": "Eine Karte scannen",
    Huvudnavigation: "Hauptnavigation",
    "Din samlarplats": "Dein Sammelplatz",
    Utforska: "Entdecken",
    "Din data. Din samling.": "Deine Daten. Deine Sammlung.",
    "Varje kort har en historia.": "Jede Karte hat eine Geschichte.",
    "Konton och samlingar sparas på datorn som kör appen.":
      "Konten und Sammlungen werden auf dem Computer gespeichert, auf dem die App läuft.",
    "Samla dina favoriter och följ nästa upptäckt.":
      "Sammle deine Favoriten und entdecke neue Karten.",
    "Installera appen": "App installieren",
    "Logga in": "Anmelden",
    "Sök efter ett set": "Ein Set suchen",
    "Välj språk": "Sprache wählen",
    "Byt till ljust läge": "Zum hellen Modus wechseln",
    "Byt till mörkt läge": "Zum dunklen Modus wechseln",
    "Öppna profil": "Profil öffnen",
    "Öppna konto": "Konto öffnen",
    Mobilnavigation: "Mobile Navigation",
    "Öppna meny": "Menü öffnen",
    Mer: "Mehr",
    "Mer i Card Lens": "Mehr in Card Lens",
    Preview: "Vorschau",
  },
  fr: {
    Översikt: "Accueil",
    "Min samling": "Ma collection",
    Setbibliotek: "Bibliothèque d’extensions",
    Marknad: "Marché",
    Vänner: "Amis",
    Set: "Extensions",
    Skanna: "Scanner",
    Samling: "Collection",
    Setdetalj: "Détail de l’extension",
    Kortdetalj: "Détail de la carte",
    "Skanna kort": "Scanner des cartes",
    "Din profil": "Votre profil",
    "Ditt konto": "Votre compte",
    "Pokémon · Din samlarplats": "Pokémon · Votre collection",
    "Hoppa till innehållet": "Aller au contenu",
    Sidomeny: "Menu latéral",
    "Skanna ett kort": "Scanner une carte",
    Huvudnavigation: "Navigation principale",
    "Din samlarplats": "Votre espace de collection",
    Utforska: "Découvrir",
    "Din data. Din samling.": "Vos données. Votre collection.",
    "Varje kort har en historia.": "Chaque carte a une histoire.",
    "Konton och samlingar sparas på datorn som kör appen.":
      "Les comptes et les collections sont enregistrés sur l’ordinateur qui exécute l’application.",
    "Samla dina favoriter och följ nästa upptäckt.":
      "Collectionnez vos cartes préférées et faites de nouvelles découvertes.",
    "Installera appen": "Installer l’application",
    "Logga in": "Se connecter",
    "Sök efter ett set": "Chercher une extension",
    "Välj språk": "Choisir la langue",
    "Byt till ljust läge": "Passer au mode clair",
    "Byt till mörkt läge": "Passer au mode sombre",
    "Öppna profil": "Ouvrir le profil",
    "Öppna konto": "Ouvrir le compte",
    Mobilnavigation: "Navigation mobile",
    "Öppna meny": "Ouvrir le menu",
    Mer: "Plus",
    "Mer i Card Lens": "Plus dans Card Lens",
    Preview: "Aperçu",
  },
  ja: {
    Översikt: "ホーム",
    "Min samling": "マイコレクション",
    Setbibliotek: "セット一覧",
    Marknad: "マーケット",
    Vänner: "フレンド",
    Set: "セット",
    Skanna: "スキャン",
    Samling: "コレクション",
    Setdetalj: "セットの詳細",
    Kortdetalj: "カードの詳細",
    "Skanna kort": "カードをスキャン",
    "Din profil": "プロフィール",
    "Ditt konto": "アカウント",
    "Pokémon · Din samlarplats": "Pokémon · コレクション",
    "Hoppa till innehållet": "本文へスキップ",
    Sidomeny: "サイドメニュー",
    "Skanna ett kort": "カードをスキャン",
    Huvudnavigation: "メインナビゲーション",
    "Din samlarplats": "コレクションスペース",
    Utforska: "見つける",
    "Din data. Din samling.": "あなたのデータ。あなたのコレクション。",
    "Varje kort har en historia.": "どのカードにも物語がある。",
    "Konton och samlingar sparas på datorn som kör appen.":
      "アカウントとコレクションは、このアプリを実行しているパソコンに保存されます。",
    "Samla dina favoriter och följ nästa upptäckt.":
      "お気に入りを集めて、新しいカードを見つけましょう。",
    "Installera appen": "アプリをインストール",
    "Logga in": "ログイン",
    "Sök efter ett set": "セットを検索",
    "Välj språk": "言語を選択",
    "Byt till ljust läge": "ライトモードに切り替え",
    "Byt till mörkt läge": "ダークモードに切り替え",
    "Öppna profil": "プロフィールを開く",
    "Öppna konto": "アカウントを開く",
    Mobilnavigation: "モバイルナビゲーション",
    "Öppna meny": "メニューを開く",
    Mer: "その他",
    "Mer i Card Lens": "Card Lens のメニュー",
    Preview: "プレビュー",
  },
};

const primaryLinks = [
  { to: "/", label: "Översikt", icon: LayoutDashboard },
  { to: "/collection", label: "Min samling", icon: Library },
  { to: "/gallery", label: "Setbibliotek", icon: Layers3 },
];
const exploreLinks = [
  { to: "/market", label: "Marknad", icon: Store },
  { to: "/friends", label: "Vänner", icon: Users },
];
const mobileLinks = [
  { to: "/", label: "Översikt", icon: LayoutDashboard },
  { to: "/gallery", label: "Set", icon: Layers3 },
  { to: "/scanner", label: "Skanna", icon: ScanLine },
  { to: "/collection", label: "Samling", icon: Library },
];

export default function Navigation() {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const { language, setLanguage } = useLanguage();
  const navText = (text: string) =>
    navigationTranslations[language][text] ?? text;
  const { resolvedTheme, setTheme } = useTheme();
  const { canInstall, handleInstall } = useInstallPrompt();
  const [menuOpen, setMenuOpen] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);
  const isActive = (path: string) =>
    pathname === path ||
    (path === "/gallery" && pathname.startsWith("/set/")) ||
    (path === "/collection" && pathname.startsWith("/card/card-"));
  const section = pathname.startsWith("/set/")
    ? "Setdetalj"
    : pathname.startsWith("/card/")
      ? "Kortdetalj"
      : pathname === "/scanner"
        ? "Skanna kort"
        : pathname === "/login" || pathname === "/signup"
          ? user
            ? "Din profil"
            : "Ditt konto"
          : ([...primaryLinks, ...exploreLinks].find(
              (link) => link.to === pathname,
            )?.label ?? "Card Lens");
  const Brand = ({ mobile = false }: { mobile?: boolean }) => (
    <Link
      to="/"
      className={cn("app-brand", mobile && "app-mobile-brand")}
      aria-label="Pokemon Card Lens"
    >
      <span className="app-brand-mark">
        <ScanLine className="h-5 w-5" strokeWidth={1.6} />
      </span>
      <span>
        Card Lens
        <span className="app-brand-caption">
          {navText("Pokémon · Din samlarplats")}
        </span>
      </span>
    </Link>
  );
  const navLink = (link: (typeof primaryLinks)[number]) => {
    const Icon = link.icon;
    return (
      <Link
        key={link.to}
        to={link.to}
        aria-current={isActive(link.to) ? "page" : undefined}
        className={cn(
          "app-nav-item",
          isActive(link.to) && "app-nav-item--active",
        )}
      >
        <Icon className="h-[17px] w-[17px]" strokeWidth={1.7} />
        <span>{navText(link.label)}</span>
        {link.to === "/market" && (
          <span className="ml-auto rounded border border-border px-1.5 py-0.5 text-[8px]">
            {navText("Preview")}
          </span>
        )}
      </Link>
    );
  };
  return (
    <>
      <a href="#main-content" className="app-skip-link">
        {navText("Hoppa till innehållet")}
      </a>
      <aside className="app-sidebar" aria-label={navText("Sidomeny")}>
        <Brand />
        <Link
          to="/scanner"
          className="app-scan-link"
          aria-current={pathname === "/scanner" ? "page" : undefined}
        >
          <ScanLine className="h-4 w-4" />
          {navText("Skanna ett kort")}
          <span className="ml-1 text-base">+</span>
        </Link>
        <nav aria-label={navText("Huvudnavigation")}>
          <p className="app-nav-caption">{navText("Din samlarplats")}</p>
          <div className="space-y-1.5">{primaryLinks.map(navLink)}</div>
          <div className="mx-3 my-7 border-t border-border" />
          <p className="app-nav-caption">{navText("Utforska")}</p>
          <div className="space-y-1.5">{exploreLinks.map(navLink)}</div>
        </nav>
        <div className="mt-auto pt-8">
          <div className="app-sidebar-note">
            <ShieldCheck className="mb-2 h-5 w-5 text-primary/70" />
            <p className="mb-1 font-bold text-foreground">
              {navText(
                isLocalHosting
                  ? "Din data. Din samling."
                  : "Varje kort har en historia.",
              )}
            </p>
            {navText(
              isLocalHosting
                ? "Konton och samlingar sparas på datorn som kör appen."
                : "Samla dina favoriter och följ nästa upptäckt.",
            )}
          </div>
          {canInstall && (
            <Button
              variant="outline"
              size="sm"
              className="mt-4 w-full"
              onClick={handleInstall}
            >
              <Download className="h-4 w-4" />
              {navText("Installera appen")}
            </Button>
          )}
          <Link to="/login" className="app-nav-item mt-4">
            <span className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-muted">
              <UserRound className="h-4 w-4" />
            </span>
            <span>{navText(user ? "Din profil" : "Logga in")}</span>
            <ArrowUpRight className="ml-auto h-3.5 w-3.5" />
          </Link>
        </div>
      </aside>

      <header className="app-topbar">
        <Brand mobile />
        <div className="app-topbar-context">
          <span>{navText("Din samlarplats")}</span>
          <ChevronRight className="h-3 w-3" />
          <strong>{navText(section)}</strong>
        </div>
        <div className="ml-auto flex items-center gap-1.5 sm:gap-3">
          <Link to="/gallery" className="app-utility-link">
            <Search className="h-3.5 w-3.5" />
            <span>{navText("Sök efter ett set")}</span>
          </Link>
          <Popover open={languageOpen} onOpenChange={setLanguageOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full text-muted-foreground"
                aria-label={navText("Välj språk")}
              >
                <Globe2 className="h-[17px] w-[17px]" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="z-[70] w-44 rounded-2xl p-2">
              {(
                [
                  ["sv", "Svenska"],
                  ["en", "English"],
                  ["de", "Deutsch"],
                  ["fr", "Français"],
                  ["ja", "日本語"],
                ] as const
              ).map(([code, label]) => (
                <button
                  key={code}
                  type="button"
                  aria-pressed={language === code}
                  onClick={() => {
                    setLanguage(code);
                    setLanguageOpen(false);
                  }}
                  className={cn(
                    "flex min-h-10 w-full items-center rounded-lg px-3 text-left text-xs",
                    language === code
                      ? "bg-primary/10 font-bold text-primary"
                      : "hover:bg-muted",
                  )}
                >
                  {label}
                  {language === code && (
                    <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />
                  )}
                </button>
              ))}
            </PopoverContent>
          </Popover>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-full text-muted-foreground"
            onClick={() =>
              setTheme(resolvedTheme === "dark" ? "light" : "dark")
            }
            aria-label={
              resolvedTheme === "dark"
                ? navText("Byt till ljust läge")
                : navText("Byt till mörkt läge")
            }
          >
            {resolvedTheme === "dark" ? (
              <Sun className="h-[17px] w-[17px]" />
            ) : (
              <Moon className="h-[17px] w-[17px]" />
            )}
          </Button>
          <span className="hidden h-5 border-l border-border sm:block" />
          <Link
            to="/login"
            aria-label={navText(user ? "Öppna profil" : "Öppna konto")}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
          >
            <UserRound className="h-4 w-4" />
          </Link>
        </div>
      </header>

      <nav className="app-bottom-nav" aria-label={navText("Mobilnavigation")}>
        {mobileLinks.map((link) => {
          const Icon = link.icon;
          return (
            <Link
              key={link.to}
              to={link.to}
              aria-current={isActive(link.to) ? "page" : undefined}
              className={
                link.to === "/scanner"
                  ? "app-bottom-scan"
                  : cn(
                      "app-bottom-item",
                      isActive(link.to) && "app-bottom-item--active",
                    )
              }
            >
              <Icon className="h-[18px] w-[18px]" strokeWidth={1.7} />
              <span>{navText(link.label)}</span>
            </Link>
          );
        })}
        <Popover open={menuOpen} onOpenChange={setMenuOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="app-bottom-item"
              aria-label={navText("Öppna meny")}
            >
              <MoreHorizontal className="h-[18px] w-[18px]" />
              <span>{navText("Mer")}</span>
            </button>
          </PopoverTrigger>
          <PopoverContent
            side="top"
            align="end"
            sideOffset={16}
            className="z-[70] w-60 rounded-2xl p-2"
          >
            <p className="px-3 pb-2 pt-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              {navText("Mer i Card Lens")}
            </p>
            {[
              ...exploreLinks,
              {
                to: "/login",
                label: user ? "Din profil" : "Logga in",
                icon: UserRound,
              },
            ].map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMenuOpen(false)}
                  className="app-nav-item"
                >
                  <Icon className="h-4 w-4" />
                  {navText(link.label)}
                </Link>
              );
            })}
            {canInstall && (
              <button
                type="button"
                onClick={() => {
                  void handleInstall();
                  setMenuOpen(false);
                }}
                className="app-nav-item w-full"
              >
                <Download className="h-4 w-4" />
                {navText("Installera appen")}
              </button>
            )}
          </PopoverContent>
        </Popover>
      </nav>
    </>
  );
}
