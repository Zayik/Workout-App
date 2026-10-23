# Workout App

Installable web app (PWA): Vite + React + TypeScript, vite-plugin-pwa, Dexie (IndexedDB). Deployed to GitHub Pages at /Workout-App/ by `.github/workflows/deploy.yml`.

- Before pushing, run `npm run lint` and `npm run build`.
- The site is served under a sub-path: `BASE_PATH=/Workout-App/` at build time. Reference public assets with relative paths or `import.meta.env.BASE_URL`, never a leading `/`, except in `index.html` (Vite rewrites those).
- Keep the app offline-first: write to Dexie first, sync to the cloud in the background.
- Must work at phone width (360px) and with notches (safe-area insets).
- Platform decisions and roadmap: docs/platform.md.
