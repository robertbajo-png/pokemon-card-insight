# Utvecklingsplan för Card Lens

**13 november 2026–13 maj 2027 · Planversion 1.0 · PCI-ROADMAP-2026-11**

Detta är den av Robert godkända sexmånadersplanen för projektet
robertbajo-png/pokemon-card-insight. Läs planen före utveckling och uppdatera
arbetsläget efter ändrade beslut eller verifierade leveranser.

## Aktuellt arbetsläge

Senast uppdaterat: **2026-11-13**. Etapp 0: grunddokumentation, PR-baslinje och
byggmiljöinventering är klara. Nästa utvecklingsuppgift är ANDROID-01.
Inga Androidfunktioner är ännu levererade. Telefonmodeller och signeringsmaterial
återstår före första installerade Androidrelease.

| Uppgift | Status | Resultat eller nästa åtgärd |
| --- | --- | --- |
| PLAN-01 | Implementerad | Godkänd plan sparad i detta dokument. Git-publicering verifieras i dokumentations-PR. |
| PLAN-02 | Implementerad | Projektinstruktioner och README pekar hit. |
| PLAN-03 | Testad | PR #28 sammanfogad; driftguider rättade och Androidmiljö inventerad. Kvarvarande telefon-/signeringskontroller listas nedan. |
| ANDROID-01 | Planerad | Skapa paketerat Androidprojekt och fast appidentitet. |
| Övriga uppgifter | Planerade | Följ etapperna och beroendena nedan. |

### Verifierad baslinje

- PR [#28](https://github.com/robertbajo-png/pokemon-card-insight/pull/28) är
  sammanfogad 2026-11-13 som 336a58b4d4d640ed6f6b759b63a7542cf6ecb7bf.
- Feature-headen var 2f36b40052931dac2f6f3c7c28b0db9dbb6082d7.
  [CI 42575178470](https://github.com/robertbajo-png/pokemon-card-insight/actions/runs/42575178470)
  verifierade 311 tester i 25 filer, typkontroll, lint, katalogintegritet,
  produktions/PWA-bygge och Deno-kontroller.
- Den lokala webbappen installerades tidigare från samma feature-head:
  176 internationella set, fem japanska specialset och 1 033 japanska kort.
  Se arbetsmappens rapporter outputs/pokemon-pr28-*.json.
- Sammanfogningen innebär ingen ny driftsättning. Körande tjänster har inte
  verifierats på nytt som del av planens dokumentation.
- Capacitor-konfigurationen i baslinjen pekar fortfarande på gamla Lovable.
  Ingen Androidprojektmapp finns. Ett riktigt Androidbygge återstår.

Statusorden betyder **planerad → pågår → implementerad → testad → installerad
→ levererad**. En sammanfogad PR är ett separat Git-faktum. Markera inte fysisk
telefonkontroll eller driftsättning som klar enbart för att kod eller CI är klar.

### Androidmiljö inventerad 2026-11-13

- Android Studio 2025.3 med fungerande JDK 21.0.10 finns installerat.
- Android SDK finns på Windows standardplats med plattform android-36 och
  build-tools 36.0.0.
- adb 37.0.0 fungerar. Inga Androidenheter är anslutna.
- Runtime-Node 24.22.1 finns. npm/npx finns inte på PATH; projektets
  package-lock.json och npm 10.9.9 ska behållas.
- JAVA_HOME och ANDROID_HOME är inte satta. Ange dem processlokalt i byggsteget.
- Använd vald Capacitor-malls Gradle-wrapper, inte en godtycklig cacheversion.
- Signeringsnyckel, telefonmodeller och verkliga kameraflöden är ännu inte
  verifierade eller framställda genom denna inventering.

## 1. Mål och beständigt projektminne

Målet är en snygg, självständig Androidapp för Robert och Leonard. Varje telefon
har sin egen privata samling. Samling, redigering, katalog, checklistor och
säkerhetskopiering fungerar utan dator eller internet. AI-skanning använder
internet när användaren uttryckligen startar en analys.

### Beslut som styr utvecklingen

- Android först. Google Play kommer senare.
- Ingen egen domän, Windowsserver eller Tailscale behövs för telefonappen.
- Ingen gemensam samling eller automatisk delning mellan Robert och Leonard.
- Värdering och byteslistor ingår. Köp, betalningar, auktioner och offentliga
  annonser ingår inte.
- Nya fasta tjänstekostnader ska undvikas. AI-anrop kan fortsatt medföra kostnader.
- Den befintliga datorappen och dess sparade data bevaras.
- Första Androidversionen distribueras som signerad APK för familjens prov.
  Google Play förbereds senare; bred publik lansering är ett separat steg.

### Så hålls planen beständig

1. Detta dokument är den versionshanterade huvudreferensen.
2. Repo- och projektinstruktionerna i AGENTS.md hänvisar hit. README länkar hit.
3. Varje uppgift har fast ID, status, beroenden, acceptanskriterier och evidens
   i form av PR, test eller verifieringsrapport.
4. Läs aktuellt arbetsläge vid början av ett arbetspass. Välj nästa
   beroendemässigt möjliga uppgift inom användarens aktuella uppdrag.
5. Uppdatera arbetsläget när ett beslut eller en leverans ändras. Bevara historik
   och ange datum.
6. En backloggpost är inte en beställning att på egen hand starta senare arbete,
   publicera, köpa tjänster eller göra bakgrundsjobb.

Detta ger beständigt projektminne för kommande arbetspass som öppnar projektet.
En fristående chatt utanför projektet behöver hänvisningen till planen; ingen
automatisk minnesöverföring mellan alla chattar förutsätts.

## 2. Teknisk grund

### Android och lokal lagring

Återanvänd React-gränssnittet och bygg Androidappen med Capacitor 8 och
kompatibla officiella plugins. Lås testade versionsnummer. Appens filer paketeras
i installationen. Ta bort den gamla Lovable-adressen och utvecklingsinställningen
för oskyddad trafik.

- Beständigt app-ID: **com.robertbajo.cardlens**.
- Samling, utkast, mål och listor lagras i lokal SQLite genom Android Room.
- Fotografier lagras som permanenta filer i appens privata lagring.
- Använd Androids kamera och bildväljare. Hantera återställning när Android
  avslutar appen medan kameran är öppen.
- Nativeappen använder ingen Supabase-inloggning, Windowsanslutning eller
  bakgrundssynkning.
- Behåll webbversionens befintliga funktioner genom separata plattformsadaptrar.
- Native använder signerade appuppdateringar, inte webbens service worker eller
  PWA-installationsprompt.

Inför gemensamma gränssnitt för **samling**, **katalog**, **analys**,
**fotolagring** och **export**. Webb och Android kan dela produktlogik utan att
använda samma lagring eller uppdateringssystem.

Databasskrivning och fotofiler är inte en enda transaktion. Skriv permanenta
fotofiler före referensen sparas, behåll tidigare data vid fel och städa
övergivna filer kontrollerat. Använd explicita databasversioner och
icke-destruktiva migreringar.

### AI utan beroende av datorn

Använd en liten Cloudflare Worker på leverantörens workers.dev-adress med
D1 för enhetsbehörigheter och kvoter. Ingen köpt domän behövs. Gratisnivån är
utgångspunkten; CPU-gränsen måste verifieras med maximal tillåten bild och ett
simulerat leverantörssvar innan riktiga AI-anrop används.

- Utfärda en separat, återkallningsbar aktivering till varje telefon genom
  engångsaktivering/QR från ägarens administrering.
- Skydda telefonens token med Android Keystore-baserad lagring. Ingen gemensam
  hemlighet byggs in i APK-filen. D1 lagrar tokenhash och spärrstatus.
- AI-leverantörens nyckel finns endast som serverhemlighet. Läs, skriv eller
  logga inte nycklar i repo, frontend, rapporter eller testutdata.
- Endast vald bild skickas för analys. Samling och privata anteckningar stannar
  på telefonen. Ingen beständig bildlagring eller innehållsloggning i gatewayen.
- Komprimera bilden på telefonen. Gatewayen gör ingen bildbehandling.
- Startgräns: **20 analyser per telefon och UTC-dygn, högst 400 per
  UTC-kalendermånad**. För två aktiverade telefoner är det gemensamma taket 40
  per dygn och 800 per månad.
- Reservera kvot och kontrollera enhetsbehörighet atomiskt före leverantörsanrop.
  Saknad kvotdatabas ska neka analys.
- Varje analys får unikt försöks-ID kopplat till innehållet. Ett avbrutet eller
  oklart försök startas inte om automatiskt. Exakt en extern debitering kan inte
  garanteras atomiskt över egen databas och extern leverantör vid krasch;
  välj konservativ hantering och uttryckligt nytt försök.
- Behåll tidsgräns, avbrytning och schema-validering. Modell och numeriska
  gränser bestäms på servern.

AI lämnar förslag om kortets identitet. Appen kontrollerar förslaget mot katalogen
och kräver granskning före sparande. AI-genererade prisuppgifter presenteras inte
som aktuella marknadspriser. Påstå inte att källor har kontrollerats om ingen
verklig källkontroll utförts.

[Workers-priser och gränser](https://developers.cloudflare.com/workers/platform/pricing/)
och [workers.dev](https://developers.cloudflare.com/workers/configuration/routing/workers-dev/).

### Katalog och nya datatyper

Första Androidversionen paketerar **176 engelskspråkiga set med 20 635 kort** och
**fem japanska specialset med 1 033 kort**. Engelska kortdata måste flyttas från
Windowsbyggstegets snapshot till Androids byggartefakt; enbart setmetadata räcker
inte. Katalogtext och checklistor fungerar offline. Alla bilder utlovas inte offline.

Paketet har version, källdatum, licenser och checksumma/antal per set. Läs kort
per set vid behov och använd ett kompakt sökindex. Felaktiga eller saknade
katalogdata får inte se ut som ett tomt eller komplett set.

Behåll befintliga kort- och set-ID:n, inklusive separata japanska identiteter.
Inför separata modeller för:

- **Setmål:** följt set och önskad komplettering.
- **Önskelista:** katalogkort, önskat antal och prioritet.
- **Byteslista:** uttryckligen valda egna exemplar.
- **Prisuppgift:** belopp, valuta, källa, datum och exakt utgåva/variant som
  uppgiften gäller.

Önskade kort lagras inte som ägda kort med antal noll. Normal komplettering
räknar katalogidentiteter; ett master set kräver egen verifierad variantkatalog
och ingår inte i denna första kompletteringsmodell.

## 3. Leveranser under sex månader

Tidsperioderna är riktmärken. En etapp är klar när acceptanskriterierna är
uppfyllda, inte enbart när perioden passerat.

### Etapp 0: Baslinje och projektminne

**13–19 november 2026 · PLAN-01–03**

- **PLAN-01:** Spara godkänd roadmap med beslut, beroenden, acceptanskriterier
  och verifierad baslinje i Git.
- **PLAN-02:** Lägg projekt- och repoinstruktioner samt README-hänvisning så att
  framtida arbetspass hittar samma plan.
- **PLAN-03:** Avsluta PR #28, rätta nuvarande Windowsdrift kontra alternativ
  Sites-drift och inventera Androidtelefoner/byggmiljö. Förbered beständigt
  app-ID och säker förvaring av signeringsnyckeln före första installerade release.

**Klart när:** nästa arbetspass hittar planen, identifierar rätt kodversion och
kan fortsätta från en namngiven uppgift.

### Etapp 1: Självständig Androidapp

**20 november–17 december 2026 · Version 0.1 · ANDROID-01–06**

Beroende: PLAN-01–03, med fysisk enhetsspecifikation innan telefonacceptans.

- **ANDROID-01:** Skapa paketerat Androidprojekt, fast appidentitet och
  reproducerbart bygge.
- **ANDROID-02:** Inför plattformsgränssnitt och lokal Room-lagring utan
  Supabase-inloggning eller Windowsanrop.
- **ANDROID-03:** Paketera komplett offlinekatalog och koppla sökning,
  checklistor och manuell registrering.
- **ANDROID-04:** Koppla native kamera, bildväljare, permanenta foton och
  återupptagbara redigeringsutkast.
- **ANDROID-05:** Exportera och återställ versionsmärkt full säkerhetskopia.
  Importera befintliga JSON-exporter med granskning och bevarade kortidentiteter.
- **ANDROID-06:** Anpassa bakåtknapp, tangentbord, dialoger, navigation och
  appens bakgrund/återupptagning.

Full backup blir ett lösenordskrypterat, versionsmärkt arkiv med metadata och
foton. Export/import använder Androids filväljare. AI-aktivering och andra
hemligheter ingår inte. Kopia utanför telefonen ska vara möjlig utan nytt abonnemang.

**Klart när:** nyinstallerad app i flygplansläge öppnar katalogen, registrerar
och redigerar kort samt återställer säkerhetskopia på en tom installation.

### Etapp 2: AI-skanning som vardagsfunktion

**18 december 2026–14 januari 2027 · Version 0.2 · SCAN-01–06**

Beroende: lokal lagring, kamera och återupptagbara utkast från etapp 1.

- **SCAN-01:** Verifiera gatewayens resursgränser utan betalda AI-anrop.
- **SCAN-02:** Driftsätt begränsad gateway med separat enhetsaktivering,
  kvoter och återkallning.
- **SCAN-03:** Koppla foto till analys, lokal katalogmatchning och obligatorisk
  granskning före sparande.
- **SCAN-04:** Visa osäkert set, flera katalogkandidater eller saknad
  katalogpost utan påhittad säkerhetsprocent.
- **SCAN-05:** Bygg återupptagbar kö med högst tio foton och ett analysanrop åt
  gången. Visa hur många analyser användaren startar.
- **SCAN-06:** Bevara foto och granskning vid nätfel, appstängning och
  misslyckat sparande. Ingen bakgrundsanalys eller automatisk omkörning.

**Klart när:** båda verkliga Androidtelefonerna klarar foto → analys → kontroll
→ sparande utan dator. Avbrutna försök skapar varken dubbla samlingsposter
eller dolda nya AI-anrop.

### Etapp 3: Samling, design och samlingsmål

**15 januari–11 februari 2027 · Version 0.3 · COLLECTION-01–06**

Beroende: etapp 1. Kan utvecklas parallellt med gatewayarbete utan AI-anrop.

- **COLLECTION-01:** Förbättra startsidan med egna kort, senaste tillägg och setmål.
- **COLLECTION-02:** Spara filter för språk, set, variant, skick, plats och dubbletter.
- **COLLECTION-03:** Inför namngivna pärmar och platser. Bevara befintliga fritextplatser.
- **COLLECTION-04:** Följ ett set före första ägda kortet och visa målets komplettering.
- **COLLECTION-05:** Spara prioriterad önskelista över flera set.
- **COLLECTION-06:** Förbättra mängdändringar med förhandsvisning och möjlighet
  att ångra senaste åtgärden.

Designarbetet omfattar tydliga kortbilder, läsbar typografi, konsekventa
komponenter, bra tomlägen och tydlig skillnad mellan **ägda**, **saknade**
och **önskade** kort.

**Klart när:** användaren hittar kort, ser förvaringsplats och väljer nästa
samlingsmål. Filter, mål och listor finns kvar efter omstart.

### Etapp 4: Fler utgåvor och säkrare katalog

**12 februari–11 mars 2027 · Version 0.4 · CATALOGUE-01–05**

Beroende: lokal katalogadapter och stabila identiteter från etapp 1.

- **CATALOGUE-01:** Visa datum, täckning och bildtillgång per set.
- **CATALOGUE-02:** Bygg kontrollerad uppdatering med checksumma, antal och ID-granskning.
- **CATALOGUE-03:** Prioritera fler kompletta japanska set.
- **CATALOGUE-04:** Utöka därefter med tyska och franska utgåvor där källan har
  verifierbara kompletta listor. Håll språk/utgåvor åtskilda.
- **CATALOGUE-05:** Leverera uppdateringar genom appversioner. Testa gamla
  samlingar mot nytt katalogpaket.

Den äldre Pokémon TCG API:n är aviserad att stänga **1 mars 2027**. Androidappen
ska redan från första versionen fungera utan den. Historisk datakopia behålls
för kompatibilitet.
[Källprojektets besked](https://github.com/PokemonTCG/pokemon-tcg-data/blob/master/README.md).

**Klart när:** kataloguppdatering inte förändrar ägandet eller förstör sparade
länkar. Saknade bilder och ofullständiga källor visas ärligt.

### Etapp 5: Värdering och byteslistor

**12 mars–8 april 2027 · Version 0.5 · VALUE-01–05**

Beroende: separat önskelista, stabil katalogidentitet och native export.

- **VALUE-01:** Inför inköpspris och eget daterat värde i SEK.
- **VALUE-02:** Lägg till TCGdex-referenspriser där exakt utgåva/variant matchar.
- **VALUE-03:** Visa källa, valuta, datum och andel kort med värdeuppgifter.
  Osäker matchning ger **Pris saknas**.
- **VALUE-04:** Skapa privat byteslista med valda exemplar, antal, språk, variant och skick.
- **VALUE-05:** Exportera bytes-/önskelistor via Androids delningspanel utan
  privata anteckningar. Ägt antal ändras inte av export.

TCGdex beskriver prisuppgifter från Cardmarket och TCGplayer. Uppgifter kan
saknas för enskilda kort; heltäckande värdering utlovas inte.
[Prisdatans dokumentation](https://tcgdex.dev/markets-prices).

Externa priser visas i ursprunglig valuta. Olika valutor summeras separat;
dagens fasta valutaomräkning används inte för påstådd aktuell samlingsvärdering.
Skilj eget värde, externt referenspris och äldre AI-estimat.

**Klart när:** användaren skiljer eget värde från referenspris och exporterar
byteslista utan att ägt antal ändras.

### Etapp 6: Stabil version och Google Play-förberedelser

**9 april–13 maj 2027 · Version 1.0 · RELEASE-01–06**

Beroende: föregående kärnfunktioner och dokumenterad privat telefonprovning.

- **RELEASE-01:** Förbättra uppstart, sökning, bildminne och större samlingar.
- **RELEASE-02:** Verifiera återställning och icke-destruktiva databasuppgraderingar.
- **RELEASE-03:** Installera signerad uppdatering med bevarade data, utkast och inställningar.
- **RELEASE-04:** Färdigställ ikon, hjälp, integritetsinfo, versionsinfo och licenser.
- **RELEASE-05:** Bygg APK och App Bundle från samma verifierade kodversion.
  Förbered Google Play och internt testspår.
- **RELEASE-06:** Dokumentera installation, telefonbyte, återställning och
  spärrning/nyaktivering av AI.

Signeringsidentiteten bevaras från första installationen. Nyckeln finns utanför
Git/byggkontext, med skyddad extern säkerhetskopia.
[Androids appsignering](https://developer.android.com/studio/publish/app-signing).

Google Play kräver för närvarande utvecklarkonto, verifiering och engångsavgift
på **25 USD**. Kostnaden uppstår först vid Play-steget; aktuella krav kontrolleras
då. Bred publik lansering ingår inte i detta steg.
[Play Console](https://support.google.com/googleplay/android-developer/answer/6112435).

**Klart när:** appen används i vardagen, kan uppdateras och samlingen
återställas utan beroende av datorappen.

## 4. Gemensamma kvalitetskrav

Varje leverans får riktade tester och dokumenterad verifiering. Befintliga
webbtester behålls. Android får tester för lagring, livscykel och
plattformsfunktioner. Resultat gäller faktiskt provad kodversion.

Före version 1.0 ska följande vara verifierat:

- **Dataskydd:** misslyckad filskrivning, fullt lagringsutrymme och avbruten
  databasuppgradering förlorar inte tidigare kort.
- **Återställning:** tom installation återfår antal, foton, japanska tecken,
  mål och listor från full backup.
- **Identitet:** japanska/internationella utgåvor, återkommande tryckta nummer
  och olika varianter blandas inte ihop.
- **Kamera:** avböjd behörighet, bildval, rotation och processavslut hanteras.
- **AI:** spärrad enhet, förbrukad kvot, timeout, felaktigt svar och oklart
  anropsutfall får begripliga felvägar.
- **Offline:** samlingen öppnas och redigeras utan internet. Ingen bild skickas
  automatiskt när nätet återkommer.
- **Uppdatering:** signerad ny version behåller data, utkast och inställningar.
- **Prestanda:** sökning/listor provas med 10 000 poster.
  Resultat/begränsningar dokumenteras på verkliga telefoner.

Releaseunderlaget anger kodversion, kontroller, återgångsväg och begränsningar.
Fysiska telefonprov som inte utförts är **ej verifierade**. Desktop-mobilvy och
emulerad kamera räknas inte som fysisk telefonacceptans.

Vid tidsbrist prioriteras **dataskydd → fungerande Androidapp → skanning →
samling och design → katalogutökning → prisdata → Google Play**. Alla områden
finns kvar i planen. Grundfunktioner ska fungera innan fler byggs ovanpå dem.

## Ändringshistorik

| Datum | Version | Ändring |
| --- | --- | --- |
| 2026-11-13 | 1.0 | Godkänd sexmånadersplan sparad. Separata fristående Androidsamlingar, AI online, låg fast kostnad och Google Play senare. PR #28 sammanfogad. |
