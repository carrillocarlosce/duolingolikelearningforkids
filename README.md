# Pipo's Market

A bright, offline-friendly web app for a first grader learning the food words from school **Unit 7 — Let's go to the market!** in English and Spanish (Latin American / Peruvian).

Pipo is an original mango character. This is not Duolingo and it does not use Duolingo's owl or brand assets.

Open a lesson to read each food word and sentence in English and in Spanish. When you tap **¡Listo, ya leí!**, that lesson is saved on the tablet and the next one unlocks. The first lesson starts open.

## Run it locally

You need Node.js 22.

```bash
npm install
npm run dev
```

Open [http://localhost:3000/duolingolikelearningforkids/](http://localhost:3000/duolingolikelearningforkids/).

The app is built to live at `/duolingolikelearningforkids`, the same path as the GitHub Pages project site, so local and published links match.

## Build and preview the static site

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run preview
```

`npm run build` writes a static site to `out/` (`output: 'export'`). `next start` is not used. The preview server mounts that folder at the project-site path:

[http://127.0.0.1:4173/duolingolikelearningforkids/](http://127.0.0.1:4173/duolingolikelearningforkids/)

## Publish on GitHub Pages

The published site is:

[https://carrillocarlosce.github.io/duolingolikelearningforkids/](https://carrillocarlosce.github.io/duolingolikelearningforkids/)

**One-time step for the owner.** GitHub will not run the deploy workflow until Pages is switched to Actions:

1. Open this repository on GitHub.
2. Go to **Settings → Pages**.
3. Under **Build and deployment**, set **Source** to **GitHub Actions** (not “Deploy from a branch”).

After that, every push to `main` runs [`.github/workflows/pages.yml`](.github/workflows/pages.yml). The workflow checks lint, types, and tests, builds the static export, then deploys with `actions/configure-pages`, `actions/upload-pages-artifact`, and `actions/deploy-pages`.

The first deploy can take a minute. If the site 404s immediately, wait until the Actions run is green and refresh.

`basePath` and `assetPrefix` are both `/duolingolikelearningforkids`, so pages, Next.js chunks, the web manifest `start_url` / `scope`, and icon URLs all sit under that path. `public/.nojekyll` is copied into the export so GitHub Pages does not run Jekyll on the files.

## Install on a tablet

A home-screen icon and full offline caching arrive with the service worker. Until then, the child can open the Pages URL in Chrome on the Android tablet. After the service worker ships, Chrome’s “Install app” / “Add to Home screen” uses the manifest in this project.

## Architecture

Dependencies point inward. The UI does not talk to IndexedDB or the browser speech APIs directly.

```
src/presentation   screens and visual components
src/composition    wires ports to adapters (the only place that may see both)
src/application    use cases and ports (storage, speech)
src/domain         lessons and progress rules, no React and no browser APIs
src/infrastructure adapters that implement the ports
```

- **Domain** holds the Unit 7 words and sentences, answer checking (accents, alternates such as torta/queque and fideos/pasta, small typos), hearts, XP, streaks, and the lesson session rules.
- **Application** builds the map (`getLessonPath`), loads the saved profile, and records a finished lesson. It talks to storage only through `ProgressRepository`. `SpeechSynthPort` and `SpeechRecognitionPort` are ready for the speech adapters.
- **Infrastructure** saves progress in IndexedDB with the `idb` package. If the tablet cannot open a database, an in-memory repository is used for that visit and the screen says so. Speech adapters still report “not available”.
- **Presentation** renders the map and the reading cards. It receives services from the composition root.

Progress, XP, hearts, the streak, UI language, and finished lessons stay in a database named `pipos-market` on the device. Nothing is sent to a server. A new calendar day refills hearts. Finishing a lesson on the next day continues the streak; skipping a day starts it again at one. The heart meter and streak are saved now and shown on screen in a later update.

`tests/architecture.test.ts` fails the build if those import rules are broken.

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Next.js dev server |
| `npm run build` | Static export into `out/` |
| `npm run preview` | Serves `out/` on the GitHub Pages base path |
| `npm test` | Unit tests (Vitest) |
| `npm run lint` | ESLint |
| `npm run typecheck` | `next typegen` and `tsc --noEmit` |
| `npm run icons` | Regenerates the original PNG app icons |

## Browser notes

The map itself needs a current Chrome, Edge, Firefox, or Safari (the Next.js 16 baseline). Text-to-speech and speech recognition are not in this version yet. They will use the browser’s built-in Web Speech APIs only — no third-party services — and the app will keep working when a voice or a microphone is missing.
