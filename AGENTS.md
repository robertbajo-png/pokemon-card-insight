# Projektinstruktioner för Pokémon Card Insight

## Läs före arbete

1. Läs README.md och docs/roadmap.md innan utveckling, större felsökning eller
   förslag om nästa steg.
2. Roadmapens ID är PCI-ROADMAP-2026-11. Läs aktuellt arbetsläge och välj nästa
   uppgift utifrån användarens uppdrag och dokumenterade beroenden.
3. Följ användarens aktuella instruktioner om de ändrar planen. Uppdatera då
   beslut, datum och status i roadmapen; gammal plan har inte företräde.

## Godkänd riktning

- Fristående Androidapp för Robert och Leonard med helt separata lokala samlingar.
- Ingen Windowsserver, egen domän eller Tailscale krävs för telefonappen.
- AI får använda internet genom begränsad servergateway. Leverantörsnycklar
  finns aldrig i APK, frontend, Git eller rapporter.
- Katalog, samling, redigering och backup fungerar offline.
- Befintlig datorapp och dess kunddata bevaras.
- Google Play kommer senare. Ingen handel, betalning eller gemensam samling ingår.

## Dokumentera verkligt resultat

- Uppdatera roadmapens arbetsläge när beslut, implementation eller leverans
  ändras. Ange uppgifts-ID och relevant PR/test/verifiering.
- Skilj planerad, pågår, implementerad, testad, installerad och levererad.
  Sammanfogning av PR innebär inte driftsättning.
- Markera fysisk kamerakontroll som ej verifierad tills faktisk telefon provats.
- Spara inte hemligheter, samlingsbilder eller privata exporter i dokumentationen.
- Behåll befintliga kort-/set-ID:n och försiktig editionsmatchning. Nollställ inte
  riktiga databaser, IndexedDB eller samlingar för test.
- En backloggpost startar inte automatiskt arbete, publicering, tjänsteköp eller
  bakgrundsjobb. Arbeta inom aktuellt uppdrag.
