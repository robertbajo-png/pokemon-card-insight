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
    const translate = async () => {
      if (language === "sv") {
        setTranslatedText(text);
        return;
      }

      setIsLoading(true);
      try {
        const result = await translateAsync(text);
        setTranslatedText(result);
      } catch (error) {
        console.error("Translation failed:", error);
        setTranslatedText(text);
      } finally {
        setIsLoading(false);
      }
    };

    translate();
  }, [text, language, translateAsync]);

  return <Component className={className}>{translatedText}</Component>;
};
