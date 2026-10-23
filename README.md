# Workout App

A home-strength workout tracker for desktop and phone, built as an installable web app (PWA). One codebase runs in any browser, installs to a phone's home screen, and works offline.

Live site (after the first deploy): https://zayik.github.io/Workout-App/

## Develop

Requires Node 22+.

```sh
npm install
npm run dev        # local dev server with hot reload
npm run build      # production build into dist/
npm run preview    # serve the production build
npm run lint
```

To try it on your phone while developing, run `npm run dev -- --host` and open the "Network" URL on a phone on the same Wi-Fi.

## Install on a phone

- **Android (Chrome):** open the site, then menu → *Install app*.
- **iPhone (Safari):** open the site, then Share → *Add to Home Screen*.

## Stack

- [Vite](https://vite.dev) + React + TypeScript
- [vite-plugin-pwa](https://vite-pwa-org.netlify.app) for the manifest and offline service worker
- [Dexie](https://dexie.org) (IndexedDB) for on-device storage
- GitHub Pages for free hosting, deployed by `.github/workflows/deploy.yml` on every push to `main`

See [docs/platform.md](docs/platform.md) for why it's built this way and what comes next.
