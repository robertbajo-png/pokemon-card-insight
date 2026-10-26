import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Scan,
  Image,
  Home,
  Globe,
  Download,
  Sun,
  Moon,
  Gavel,
  Library,
  User,
  Users,
  Menu,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { TranslatedText } from "@/components/TranslatedText";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";
import { useTheme } from "next-themes";
import { useAuth } from "@/contexts/AuthContext";

const Navigation = () => {
  const location = useLocation();
  const { language, setLanguage, t } = useLanguage();
  const { canInstall, handleInstall } = useInstallPrompt();
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const links = [
    { to: "/login", label: user ? "Profil" : "Konto", icon: User },
    { to: "/", label: "Hem", icon: Home },
    { to: "/scanner", label: "Scanna", icon: Scan },
    { to: "/gallery", label: "Galleri", icon: Image },
    { to: "/market", label: "Marknad", icon: Gavel },
    { to: "/collection", label: "Samling", icon: Library },
    { to: "/friends", label: "Vänner", icon: Users },
  ];

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link
              to="/"
              aria-label="Pokemon Card Lens"
              className="flex shrink-0 items-center gap-2"
            >
              <div className="w-10 h-10 bg-gradient-hero rounded-lg flex items-center justify-center shadow-glow">
                <Scan className="w-6 h-6 text-white" />
              </div>
              <span className="text-base sm:text-xl font-bold bg-gradient-hero bg-clip-text text-transparent">
                <span className="sm:hidden">Card Lens</span>
                <span className="hidden sm:inline">Pokemon Card Lens</span>
              </span>
            </Link>

            <div className="flex items-center gap-2">
              {/* Desktop install button */}
              {canInstall && (
                <Button
                  onClick={handleInstall}
                  variant="default"
                  size="sm"
                  className="hidden xl:flex gap-1.5 bg-gradient-hero text-white shadow-glow"
                >
                  <Download className="w-4 h-4" />
                  <span className="text-sm">
                    <TranslatedText text="Installera" />
                  </span>
                </Button>
              )}

              <div className="hidden xl:flex items-center gap-2">
                {links.map((link) => {
                  const Icon = link.icon;
                  const isActive = location.pathname === link.to;

                  return (
                    <Link
                      key={link.to}
                      to={link.to}
                      aria-label={t(link.label)}
                      aria-current={isActive ? "page" : undefined}
                      className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300",
                        isActive
                          ? "bg-primary text-primary-foreground shadow-card"
                          : "hover:bg-muted",
                      )}
                    >
                      <Icon className="w-4 h-4" />
                      <TranslatedText
                        text={link.label}
                        className="hidden sm:inline"
                      />
                    </Link>
                  );
                })}
              </div>

              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full"
                    aria-label={t("Välj språk")}
                  >
                    <Globe className="w-5 h-5" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-44 p-2 bg-card border border-border shadow-lg z-[100]"
                  align="end"
                  sideOffset={8}
                >
                  <div className="space-y-1">
                    <button
                      onClick={() => setLanguage("sv")}
                      className={cn(
                        "w-full text-left px-3 py-2 rounded-md transition-colors text-sm font-medium",
                        language === "sv"
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-accent text-foreground",
                      )}
                    >
                      🇸🇪 Svenska
                    </button>
                    <button
                      onClick={() => setLanguage("en")}
                      className={cn(
                        "w-full text-left px-3 py-2 rounded-md transition-colors text-sm font-medium",
                        language === "en"
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-accent text-foreground",
                      )}
                    >
                      🇬🇧 English
                    </button>
                    <button
                      onClick={() => setLanguage("de")}
                      className={cn(
                        "w-full text-left px-3 py-2 rounded-md transition-colors text-sm font-medium",
                        language === "de"
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-accent text-foreground",
                      )}
                    >
                      🇩🇪 Deutsch
                    </button>
                    <button
                      onClick={() => setLanguage("fr")}
                      className={cn(
                        "w-full text-left px-3 py-2 rounded-md transition-colors text-sm font-medium",
                        language === "fr"
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-accent text-foreground",
                      )}
                    >
                      🇫🇷 Français
                    </button>
                    <button
                      onClick={() => setLanguage("ja")}
                      className={cn(
                        "w-full text-left px-3 py-2 rounded-md transition-colors text-sm font-medium",
                        language === "ja"
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-accent text-foreground",
                      )}
                    >
                      🇯🇵 日本語
                    </button>
                  </div>
                </PopoverContent>
              </Popover>

              <Button
                variant="ghost"
                size="icon"
                className="rounded-full"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                aria-label={
                  theme === "dark"
                    ? t("Byt till ljust läge")
                    : t("Byt till mörkt läge")
                }
              >
                {theme === "dark" ? (
                  <Sun className="w-5 h-5" />
                ) : (
                  <Moon className="w-5 h-5" />
                )}
              </Button>
              <Popover open={menuOpen} onOpenChange={setMenuOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="xl:hidden rounded-full"
                    aria-label={t("Öppna meny")}
                  >
                    <Menu className="w-5 h-5" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-56 p-2 xl:hidden">
                  <div className="space-y-1">
                    {links.map((link) => {
                      const Icon = link.icon;
                      const isActive = location.pathname === link.to;
                      return (
                        <Link
                          key={link.to}
                          to={link.to}
                          onClick={() => setMenuOpen(false)}
                          aria-current={isActive ? "page" : undefined}
                          className={cn(
                            "flex min-h-11 items-center gap-3 rounded-md px-3 py-2",
                            isActive
                              ? "bg-primary text-primary-foreground"
                              : "hover:bg-muted",
                          )}
                        >
                          <Icon className="h-4 w-4" />
                          <TranslatedText text={link.label} />
                        </Link>
                      );
                    })}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>
      </nav>

      {/* Floating install button for mobile */}
      {canInstall && (
        <Button
          onClick={handleInstall}
          size="lg"
          className="fixed bottom-20 right-4 z-[60] w-16 h-16 rounded-full shadow-2xl bg-gradient-hero text-white p-0 flex items-center justify-center animate-pulse hover:animate-none"
          aria-label="Installera app"
        >
          <Download className="w-7 h-7" />
        </Button>
      )}
    </>
  );
};

export default Navigation;
