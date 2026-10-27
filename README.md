# Apex Tech Solution — 3D page loader

A reusable React + Vite loader using real beveled Drei Text3D geometry, Rapier rigid bodies and GSAP. The supplied workspace was empty; `src/main.jsx` is a small preview shell, not an agency homepage redesign.

## Run locally

Node.js 20.19+ or 22.12+ is required. Install with `pnpm install`, then `pnpm dev`. Open http://localhost:5173. `pnpm build` creates the production build; `pnpm preview` serves it. npm equivalents work as well.

## Integration

Import `PageLoader` from `src/components/PageLoader.jsx` and retain its `loader/` directory and CSS. Copy `public/fonts/` including the font license. Mount once at the application root, outside the router's changing page elements:

```jsx
const [loading, setLoading] = useState(true);
// Resolve this from your homepage's critical images, fonts and data.
const homepageReady = useEssentialHomepageAssets();

return <>
  <main inert={loading} aria-busy={loading}>
    <YourExistingRouter />
  </main>
  <PageLoader
    ready={homepageReady}
    onComplete={() => setLoading(false)}
    timeout={8500}
  />
</>;
```

Do not give PageLoader a route-dependent key or mount it inside individual routes. It runs once per mount, so full document loads replay and internal navigation does not. The preview's Replay button explicitly remounts it for demonstration only. Readiness must describe essential assets, not every below-the-fold or lazy image.

## Behavior

- Letters are released with staggered timing, variable gravity, velocity, spin and restitution; invisible floor and boundaries contain the scatter.
- At about 2.25 seconds of scene time, colliders stop interacting and rigid bodies switch to position-driven kinematics. GSAP interpolates poses into two centered lines. Each layout is measured from the local font, and the camera fits a safe rectangle across portrait, landscape and desktop.
- The complete wordmark holds for 500 ms, then a 850 ms eased curtain reveals the already-mounted homepage. Slow homepage assets postpone the reveal; the configurable 8.5-second total timeout always releases it.
- Reduced motion skips the entire 3D import and uses a still wordmark with an immediate reveal when ready. Missing WebGL2, missing fonts, scene errors and WebGL context loss use the static fallback. All paths share the readiness gate and timeout.
- An accessible live loading status accompanies the visual. The integration keeps the underlying content inert while loading and restores scrolling on completion or unmount.
- Timelines, timers and motion listeners are cleaned up. The canvas unmounts on completion, allowing R3F to dispose its GPU geometries/materials/renderer and Rapier to release its physics world. The cached font data contains no GPU resources.
- Fonts and Rapier WASM are served from the app bundle/local assets; no runtime CDN calls are needed. The 3D scene is lazy loaded. The scene bundle includes the physics WASM and is about 1.1 MB gzipped; a slow first visit can hit the fail-open timeout.

## Verification

`pnpm exec playwright install chromium`, then run `pnpm test` while the local dev server is running. Tests exercise the real WebGL sequence at desktop, mobile portrait and mobile landscape sizes, check the rendered orange typography fits onscreen, verify readiness gating, timeouts, reduced motion, font failures, WebGL failures, cleanup and navigation/replay behavior. Screenshots are saved in `test-results/`. Mobile testing uses Chromium viewport emulation, not a physical device.

The font is Three.js's Helvetiker Bold. Attribution and redistribution terms are in `public/fonts/LICENSE` and the typeface JSON metadata.
