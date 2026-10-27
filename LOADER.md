# Loader integration

The repository's original `App.jsx`, `App.css`, `index.css`, assets and layout are unchanged. `src/main.jsx` renders the original app and portals the loader into `document.body`, without introducing layout wrappers or global homepage styles.

The loader waits for document load, local fonts and decoding of the existing homepage's essential images. The underlying application stays mounted and becomes interactive when the loader finishes. Internal state updates or client-side history navigation do not replay it. A full document reload does.

`src/components/PageLoader.jsx` accepts `ready`, `onComplete` and `timeout` (8500 ms by default). The lazy-loaded scene uses Drei Text3D with the locally served font in `public/fonts/`, Rapier for the fall and collisions, and GSAP for assembly and reveal. Reduced motion, unsupported WebGL2, scene or font failures and context loss use a still fallback; the hard timeout always releases the app. Canvas and physics resources unmount after completion.

Run `pnpm install` and `pnpm dev --host 0.0.0.0`. Use `pnpm build` for a production build and `pnpm lint` for lint checks. With the dev server running at port 5173, run `pnpm exec playwright install chromium` once, then `pnpm test`. Tests cover desktop, mobile portrait and landscape, readiness gating, timeout and fallback behavior, and unchanged homepage interaction. Mobile coverage uses Chromium viewport emulation.

No replay control or additional UI is added to the original homepage. Loader-only controls used in tests live in `tests/fixtures/`.
