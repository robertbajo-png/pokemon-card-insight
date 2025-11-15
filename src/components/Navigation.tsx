import { Link, useLocation } from "react-router-dom";
import { Scan, Image, Home } from "lucide-react";
import { cn } from "@/lib/utils";

const Navigation = () => {
  const location = useLocation();

  const links = [
    { to: "/", label: "Hem", icon: Home },
    { to: "/scanner", label: "Scanna", icon: Scan },
    { to: "/gallery", label: "Galleri", icon: Image },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-hero rounded-lg flex items-center justify-center shadow-glow">
              <Scan className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-hero bg-clip-text text-transparent">
              Pokemon Card Lens
            </span>
          </Link>

          <div className="flex items-center gap-2">
            {links.map((link) => {
              const Icon = link.icon;
              const isActive = location.pathname === link.to;
              
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-card"
                      : "hover:bg-muted"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{link.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
