# Platform plan

Decided 2026-10-23: build a web app (PWA) first, wrap it for the Google Play Store later, and add the Apple App Store only if sales justify it.

## Why a PWA

- One codebase for desktop, Android and iPhone.
- No store fees to start. Hosting on GitHub Pages is free.
- Installs to the home screen, opens full screen, and works offline.
- Can be sold directly with Stripe subscriptions (no store cut).

## Best practices this repo follows

- **Offline first.** Data is written to IndexedDB on the device (Dexie), so logging a set never waits on the network. Cloud sync copies it up in the background.
- **Service worker precaches the app** (vite-plugin-pwa, `autoUpdate`), so it opens with no connection and picks up new versions on the next launch.
- **Mobile-safe layout.** `viewport-fit=cover` plus `env(safe-area-inset-*)` padding for notches, 16px+ inputs so iOS doesn't zoom, numeric keyboards via `inputMode`.
- **Icons:** 192 and 512 PNGs, a maskable icon for Android, and an `apple-touch-icon` for iPhone.

## iPhone limits to know

- Safari can clear site data for a site not opened in about 7 days. Installed (home screen) apps are treated better, and cloud sync is the real fix.
- Web push works only once the app is added to the home screen (iOS 16.4+).
- No Apple Health or Watch access from a web app.

## App structure (2026-10-24)

- **Today** (home): builds the day's workout from the rotation rules (`src/planner.ts`), in pairs plus 1-set add-ons, and logs sets with a rest timer.
- **Explore**: muscle groups and their exercises; the interactive body map from the Muscle Map prototype goes here next.
- **Progress**: logged sets by day for now.
- Both Today and Explore open the same exercise page (photos, steps, tips, swaps).
- Catalog and photos come from the project planning files via `scripts/import_catalog.py`. Photos are Free Exercise DB (public domain, Unlicense); 16 exercises have none yet. Before selling the app, replace them with art we own.

## Next steps

1. **Cloud sync and login.** Recommended: Supabase (free tier: Postgres, email/Google login). Keep Dexie as the local store and sync the `sets` table to Supabase.
2. **Port the prototypes.** Bring in the exercise catalog, Rep Log rules and the Muscle Map from the project's `plans/` folder.
3. **Google Play.** Package the live site as a Trusted Web Activity with [PWABuilder](https://www.pwabuilder.com) ($25 one-time developer fee; new personal accounts need a 14-day closed test with about 12 testers).
4. **Payments (later).** Stripe Checkout + a Supabase table recording who has paid.
