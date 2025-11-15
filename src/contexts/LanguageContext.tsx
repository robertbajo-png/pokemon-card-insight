import { createContext, useContext, useState, ReactNode } from "react";

type Language = "sv" | "en";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  sv: {
    // Navigation
    home: "Hem",
    scan: "Scanna",
    gallery: "Galleri",
    
    // Scanner
    scanPokemonCard: "Scanna Pokemon-kort",
    scanDescription: "Ta ett foto eller ladda upp en bild av ditt Pokemon-kort för att få detaljerad information och uppskattning av värde",
    uploadImage: "Ladda upp bild",
    takePhoto: "Ta foto",
    analyzeCard: "Analysera kort",
    analyzing: "Analyserar...",
    cardInformation: "Kortinformation",
    type: "Typ",
    rarity: "Sällsynthet",
    set: "Set",
    number: "Nummer",
    condition: "Skick",
    estimatedValue: "Uppskattat värde",
    
    // Camera
    takePhotoOfCard: "Ta foto av kort",
    placeCardInFrame: "Placera kortet i ramen",
    pressToTakePhoto: "Tryck på kameraknappen för att ta ett foto",
    
    // Gallery
    pokemonGallery: "Pokemon-kortgalleri",
    searchCards: "Sök kort...",
    filterByType: "Filtrera efter typ",
    allTypes: "Alla typer",
    filterByRarity: "Filtrera efter sällsynthet",
    allRarities: "Alla sällsyntheter",
    
    // Home
    welcomeTitle: "Välkommen till Pokemon Card Lens",
    welcomeSubtitle: "Scanna och upptäck värdet på dina Pokemon-kort",
    getStarted: "Kom igång",
    howItWorks: "Hur det fungerar",
    step1Title: "1. Ta ett foto",
    step1Desc: "Använd din telefons kamera för att ta ett tydligt foto av ditt Pokemon-kort",
    step2Title: "2. AI-analys",
    step2Desc: "Vår AI identifierar kortet och hittar relevant information",
    step3Title: "3. Se detaljer",
    step3Desc: "Få information om sällsynthet, värde och kortets historia",
  },
  en: {
    // Navigation
    home: "Home",
    scan: "Scan",
    gallery: "Gallery",
    
    // Scanner
    scanPokemonCard: "Scan Pokemon Card",
    scanDescription: "Take a photo or upload an image of your Pokemon card to get detailed information and value estimation",
    uploadImage: "Upload Image",
    takePhoto: "Take Photo",
    analyzeCard: "Analyze Card",
    analyzing: "Analyzing...",
    cardInformation: "Card Information",
    type: "Type",
    rarity: "Rarity",
    set: "Set",
    number: "Number",
    condition: "Condition",
    estimatedValue: "Estimated Value",
    
    // Camera
    takePhotoOfCard: "Take photo of card",
    placeCardInFrame: "Place card in frame",
    pressToTakePhoto: "Press the camera button to take a photo",
    
    // Gallery
    pokemonGallery: "Pokemon Card Gallery",
    searchCards: "Search cards...",
    filterByType: "Filter by type",
    allTypes: "All types",
    filterByRarity: "Filter by rarity",
    allRarities: "All rarities",
    
    // Home
    welcomeTitle: "Welcome to Pokemon Card Lens",
    welcomeSubtitle: "Scan and discover the value of your Pokemon cards",
    getStarted: "Get Started",
    howItWorks: "How it works",
    step1Title: "1. Take a photo",
    step1Desc: "Use your phone's camera to take a clear photo of your Pokemon card",
    step2Title: "2. AI Analysis",
    step2Desc: "Our AI identifies the card and finds relevant information",
    step3Title: "3. View Details",
    step3Desc: "Get information about rarity, value and the card's history",
  },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguage] = useState<Language>("sv");

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }
  return context;
};
