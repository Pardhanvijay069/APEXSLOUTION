import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import PageLoader from './components/PageLoader';
import './styles.css';

function App() {
  const [ready, setReady] = useState(false);
  const [replay, setReplay] = useState(0);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    // Replace this promise with the existing homepage's essential asset promises.
    const pageReady = document.readyState === 'complete' ? Promise.resolve() : new Promise(resolve => window.addEventListener('load', resolve, { once: true }));
    Promise.all([pageReady, document.fonts.ready]).then(() => {
      if (!cancelled) setReady(true);
    });
    return () => { cancelled = true; };
  }, []);
  return <>
    <main inert={loading} aria-busy={loading} className="preview-shell">
      <header className="preview-header"><a href="/" className="brand" aria-label="Apex Tech Solution home"><span className="brand-icon">A<span>↗</span></span><span>APEX TECH<small>SOLUTION</small></span></a><span className="eyebrow">INTERACTION STUDY / 001</span></header>
      <section className="preview-content"><div className="eyebrow"><span className="live-dot"/> THE OPENING ACT</div><h1>A little gravity.<br/><em>A lasting impression.</em></h1><p>A bespoke introduction for Apex Tech Solution.<br/>Individual by nature. Extraordinary together.</p><button onClick={() => { setLoading(true); setReplay(v => v + 1); }}>Replay the experience <span>↗</span></button><span className="preview-note">LOADER PREVIEW · HOMEPAGE INTEGRATION READY</span></section>
      <footer className="preview-footer"><span>APEX TECH SOLUTION</span><span>CREATIVE THINKING. REAL IMPACT.</span><span>© {new Date().getFullYear()}</span></footer>
    </main>
    <PageLoader key={replay} ready={ready} onComplete={() => setLoading(false)} />
  </>;
}

createRoot(document.getElementById('root')).render(<App />);
