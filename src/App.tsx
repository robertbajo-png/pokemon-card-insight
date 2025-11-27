import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { ThemeProvider } from "@/components/theme-provider";
import Index from "./pages/Index";
import Scanner from "./pages/Scanner";
import Gallery from "./pages/Gallery";
import SetDetail from "./pages/SetDetail";
import CardDetail from "./pages/CardDetail";
import NotFound from "./pages/NotFound";
import Collection from "./pages/Collection";

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider
    defaultTheme="dark"
    attribute="class"
    storageKey="pokemon-card-insight-theme"
    enableSystem
  >
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/scanner" element={<Scanner />} />
              <Route path="/gallery" element={<Gallery />} />
              <Route path="/collection" element={<Collection />} />
              <Route path="/set/:setId" element={<SetDetail />} />
              <Route path="/card/:id" element={<CardDetail />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </LanguageProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
