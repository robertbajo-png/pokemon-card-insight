import { useEffect, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";

interface TranslatedTextProps {
  text: string;
  className?: string;
  as?: "span" | "p" | "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "div";
}

export const TranslatedText = ({ text, className, as: Component = "span" }: TranslatedTextProps) => {
  const { language, translateAsync } = useLanguage();
  const [translatedText, setTranslatedText] = useState(text);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let active = true;
    const translate = async () => {
      if (language === "sv") {
        if (active) setTranslatedText(text);
        return;
      }

      setIsLoading(true);
      try {
        const result = await translateAsync(text);
        if (active) setTranslatedText(result);
      } catch (error) {
        console.error("Translation failed:", error);
        if (active) setTranslatedText(text);
      } finally {
        if (active) setIsLoading(false);
      }
    };

    void translate();
    return () => { active = false; };
  }, [text, language, translateAsync]);

  return <Component className={className}>{translatedText}</Component>;
};
