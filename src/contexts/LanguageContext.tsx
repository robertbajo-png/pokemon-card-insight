import { createContext, useContext, useState, ReactNode, useEffect } from "react";

type Language = "sv" | "en" | "de" | "fr" | "ja";
export type Currency = "SEK" | "USD" | "EUR" | "JPY";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  currency: Currency;
  setCurrency: (curr: Currency) => void;
  t: (key: string) => string;
}

const languageToCurrency: Record<Language, Currency> = {
  sv: "SEK",
  en: "USD",
  de: "EUR",
  fr: "EUR",
  ja: "JPY",
};

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
  de: {
    // Navigation
    home: "Startseite",
    scan: "Scannen",
    gallery: "Galerie",
    
    // Scanner
    scanPokemonCard: "Pokemon-Karte scannen",
    scanDescription: "Machen Sie ein Foto oder laden Sie ein Bild Ihrer Pokemon-Karte hoch, um detaillierte Informationen und Wertschätzung zu erhalten",
    uploadImage: "Bild hochladen",
    takePhoto: "Foto machen",
    analyzeCard: "Karte analysieren",
    analyzing: "Analysieren...",
    cardInformation: "Karteninformation",
    type: "Typ",
    rarity: "Seltenheit",
    set: "Set",
    number: "Nummer",
    condition: "Zustand",
    estimatedValue: "Geschätzter Wert",
    
    // Camera
    takePhotoOfCard: "Foto von Karte machen",
    placeCardInFrame: "Karte im Rahmen platzieren",
    pressToTakePhoto: "Drücken Sie die Kamerataste, um ein Foto zu machen",
    
    // Gallery
    pokemonGallery: "Pokemon-Kartengalerie",
    searchCards: "Karten suchen...",
    filterByType: "Nach Typ filtern",
    allTypes: "Alle Typen",
    filterByRarity: "Nach Seltenheit filtern",
    allRarities: "Alle Seltenheiten",
    
    // Home
    welcomeTitle: "Willkommen bei Pokemon Card Lens",
    welcomeSubtitle: "Scannen und entdecken Sie den Wert Ihrer Pokemon-Karten",
    getStarted: "Loslegen",
    howItWorks: "Wie es funktioniert",
    step1Title: "1. Foto machen",
    step1Desc: "Verwenden Sie die Kamera Ihres Telefons, um ein klares Foto Ihrer Pokemon-Karte zu machen",
    step2Title: "2. KI-Analyse",
    step2Desc: "Unsere KI identifiziert die Karte und findet relevante Informationen",
    step3Title: "3. Details ansehen",
    step3Desc: "Erhalten Sie Informationen über Seltenheit, Wert und Geschichte der Karte",
  },
  fr: {
    // Navigation
    home: "Accueil",
    scan: "Scanner",
    gallery: "Galerie",
    
    // Scanner
    scanPokemonCard: "Scanner une carte Pokemon",
    scanDescription: "Prenez une photo ou téléchargez une image de votre carte Pokemon pour obtenir des informations détaillées et une estimation de valeur",
    uploadImage: "Télécharger une image",
    takePhoto: "Prendre une photo",
    analyzeCard: "Analyser la carte",
    analyzing: "Analyse en cours...",
    cardInformation: "Informations sur la carte",
    type: "Type",
    rarity: "Rareté",
    set: "Collection",
    number: "Numéro",
    condition: "État",
    estimatedValue: "Valeur estimée",
    
    // Camera
    takePhotoOfCard: "Prendre une photo de la carte",
    placeCardInFrame: "Placer la carte dans le cadre",
    pressToTakePhoto: "Appuyez sur le bouton de l'appareil photo pour prendre une photo",
    
    // Gallery
    pokemonGallery: "Galerie de cartes Pokemon",
    searchCards: "Rechercher des cartes...",
    filterByType: "Filtrer par type",
    allTypes: "Tous les types",
    filterByRarity: "Filtrer par rareté",
    allRarities: "Toutes les raretés",
    
    // Home
    welcomeTitle: "Bienvenue sur Pokemon Card Lens",
    welcomeSubtitle: "Scannez et découvrez la valeur de vos cartes Pokemon",
    getStarted: "Commencer",
    howItWorks: "Comment ça marche",
    step1Title: "1. Prendre une photo",
    step1Desc: "Utilisez l'appareil photo de votre téléphone pour prendre une photo claire de votre carte Pokemon",
    step2Title: "2. Analyse IA",
    step2Desc: "Notre IA identifie la carte et trouve des informations pertinentes",
    step3Title: "3. Voir les détails",
    step3Desc: "Obtenez des informations sur la rareté, la valeur et l'histoire de la carte",
  },
  ja: {
    // Navigation
    home: "ホーム",
    scan: "スキャン",
    gallery: "ギャラリー",
    
    // Scanner
    scanPokemonCard: "ポケモンカードをスキャン",
    scanDescription: "ポケモンカードの写真を撮るかアップロードして、詳細情報と価値の見積もりを取得します",
    uploadImage: "画像をアップロード",
    takePhoto: "写真を撮る",
    analyzeCard: "カードを分析",
    analyzing: "分析中...",
    cardInformation: "カード情報",
    type: "タイプ",
    rarity: "レアリティ",
    set: "セット",
    number: "番号",
    condition: "状態",
    estimatedValue: "推定価値",
    
    // Camera
    takePhotoOfCard: "カードの写真を撮る",
    placeCardInFrame: "フレーム内にカードを配置",
    pressToTakePhoto: "カメラボタンを押して写真を撮影",
    
    // Gallery
    pokemonGallery: "ポケモンカードギャラリー",
    searchCards: "カードを検索...",
    filterByType: "タイプで絞り込み",
    allTypes: "すべてのタイプ",
    filterByRarity: "レアリティで絞り込み",
    allRarities: "すべてのレアリティ",
    
    // Home
    welcomeTitle: "Pokemon Card Lensへようこそ",
    welcomeSubtitle: "ポケモンカードの価値をスキャンして発見",
    getStarted: "始める",
    howItWorks: "使い方",
    step1Title: "1. 写真を撮る",
    step1Desc: "スマートフォンのカメラを使って、ポケモンカードの鮮明な写真を撮影します",
    step2Title: "2. AI分析",
    step2Desc: "AIがカードを識別し、関連情報を検索します",
    step3Title: "3. 詳細を表示",
    step3Desc: "レアリティ、価値、カードの歴史に関する情報を取得",
  },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguage] = useState<Language>("sv");
  const [currency, setCurrency] = useState<Currency>(languageToCurrency["sv"]);

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, currency, setCurrency, t }}>
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
