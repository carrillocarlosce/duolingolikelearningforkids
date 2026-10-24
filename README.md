# Pipo's Market

A bright, offline-friendly web app for a first grader learning the food words from school **Unit 7 — Let's go to the market!** in English and Spanish (Latin American / Peruvian).

Pipo is an original mango character. This is not Duolingo and it does not use Duolingo's owl or brand assets.

Open a lesson, read the words, then practice: tap the word for a picture, tap the picture for a word, match pairs, build a sentence from tiles, and type the word or sentence. The writing lesson also asks the child to trace each letter with a finger. A small typo still counts, and the screen shows the spelling. Pick EN→ES, ES→EN, English only, or Spanish only on the map. Finishing the round saves the lesson and opens the next one.

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

`basePath` and `assetPrefix` are both `/duolingolikelearningforkids`, so pages, Next.js chunks, the web manifest `start_url` / `scope`, icon URLs, and the service worker all sit under that path. `public/.nojekyll` is copied into the export so GitHub Pages does not run Jekyll on the files. The build writes `out/sw.js` after the static export. Its precache list uses the same `/duolingolikelearningforkids` prefix, including both `/duolingolikelearningforkids/` and `index.html`.

## Install on a tablet

Use Chrome on the Android tablet.

1. Open the Pages URL once while the tablet is online and let the page finish loading. That visit installs the service worker and caches the app.
2. In Chrome’s menu, choose **Install app** or **Add to Home screen**.
3. Open Pipo’s Market from the new icon.

After that first online visit, the lesson map and exercises open with the network off. Turn on airplane mode and open the icon again to check. If the first visit was interrupted, open the site online one more time, then try offline.

Progress, XP, hearts, and finished lessons stay in IndexedDB on the tablet. Nothing is uploaded. The cache holds the pages, scripts, styles, font, icons, and manifest. A newer deploy replaces the cache the next time the tablet is online. Text-to-speech uses a voice already installed on the device, so it does not download audio. Speech recognition is not in this version; the lessons do not need it.

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
- **Infrastructure** saves progress in IndexedDB with the `idb` package. If the tablet cannot open a database, an in-memory repository is used for that visit and the screen says so. Spoken words use the device `speechSynthesis` voices. The recognition adapter still reports “not available”.
- **Presentation** renders the map, the reading cards, and the practice round. A production build registers the service worker. Dev server visits do not. It receives services from the composition root.

Progress, XP, hearts, the streak, UI language, and finished lessons stay in a database named `pipos-market` on the device. Nothing is sent to a server. A new calendar day refills hearts. Finishing a lesson on the next day continues the streak; skipping a day starts it again at one. The heart meter and streak are saved now and shown on screen in a later update.

`tests/architecture.test.ts` fails the build if those import rules are broken.

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Next.js dev server |
| `npm run build` | Static export into `out/`, then the service worker |
| `npm run preview` | Serves `out/` on the GitHub Pages base path |
| `npm test` | Unit tests (Vitest) |
| `npm run lint` | ESLint |
| `npm run typecheck` | `next typegen` and `tsc --noEmit` |
| `npm run icons` | Regenerates the original PNG app icons |

## Browser notes

The app needs a current Chrome, Edge, Firefox, or Safari (the Next.js 16 baseline). Chrome on the Android tablet is the one that matters here.

**Text-to-speech** uses the tablet’s own voices (`speechSynthesis`). A speaker button plays a word, and the turtle button plays it slowly. The app prefers a Peruvian Spanish voice (`es-PE`) when one is installed, then another Latin American Spanish voice, then any Spanish voice. English prefers a US voice. If that language has no installed voice, the word is written on the screen and the lesson continues. No audio file is downloaded. To hear Spanish, install a Spanish voice in the tablet’s text-to-speech settings.

**Speech recognition** (“say it”) is not in this version yet. When it arrives it will use the browser’s built-in recognizer only, and the lessons will still run if the microphone or the network is unavailable. In Chrome that recognizer needs an internet connection even though the rest of the app does not.
