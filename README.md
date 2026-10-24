# Pipo's Market

A bright, offline-friendly web app for a first grader learning the food words from school **Unit 7 — Let's go to the market!** in English and Spanish (Latin American / Peruvian).

Pipo is an original mango character. This is not Duolingo and it does not use Duolingo's owl or brand assets.

This version is the lesson map for the unit: ten lessons, the first one open, the rest waiting until the one before them is finished. Practice activities are added in later updates.

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

- **Domain** knows the Unit 7 lesson order and which lesson is unlocked.
- **Application** turns that into the path the map renders (`getLessonPath`) and declares `ProgressRepository`, `SpeechSynthPort`, and `SpeechRecognitionPort`.
- **Infrastructure** currently ships an in-memory progress repository and speech adapters that report “not available”. IndexedDB and the Web Speech API replace those adapters without changing the domain.
- **Presentation** renders the map. It receives services from the composition root.

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
