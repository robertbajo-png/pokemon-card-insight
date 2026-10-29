# Collector design refresh

The application uses a shared graphite and warm gold theme, with an ivory light theme. Desktop navigation uses a sidebar from 1280px; smaller viewports use a top utility bar and a five-item bottom navigation. Both themes use semantic CSS tokens in `src/index.css`.

Main pages share `page-shell`, `page-title`, `surface-panel` and related layout classes. Each page exposes `main#main-content` for the keyboard skip link. Route changes reset scroll position, while changes to gallery search parameters keep the current page in place. Gallery filters are retained in the URL and in the set detail's return link.

The scanner explicitly separates image selection, analysis and review. Analysis never saves a card by itself. On phones the file and camera controls precede the image area. Collection editing, persistence locks and conflict handling keep the existing data model and service boundary.

Catalogue failures have a retry state and do not conceal saved collection cards. The external catalogue's availability and AI identification accuracy are separate from this visual update. Market listings remain labelled previews; contacts remain local. Homepage catalogue art is labelled as examples rather than owned cards.

## Bundled visual resources

- Manrope Latin variable font: Google Fonts, `ofl/manrope`, under the bundled [SIL Open Font License](../public/fonts/OFL-Manrope.txt). Served locally; no Google Fonts requests at runtime. The PWA precaches the WOFF2 resource.
- Base Set Blastoise and Pikachu catalogue images: `images.pokemontcg.io/base1/2.png` and `images.pokemontcg.io/base1/58.png`, identified using the Pokémon TCG data project. These unmodified card images are illustrative catalogue examples. Pokémon card artwork and marks belong to their respective owners.
- The existing Charizard photograph remains the central homepage and account illustration.

No backend credentials or API keys are bundled with these resources.
