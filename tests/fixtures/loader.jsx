import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import PageLoader from '../../src/components/PageLoader';
function Fixture() {
  const [ready, setReady] = useState(false);
  const [done, setDone] = useState(false);
  return <><button onClick={() => setReady(true)}>Resolve homepage assets</button><output>{done ? 'released' : 'waiting'}</output><PageLoader ready={ready} onComplete={() => setDone(true)} timeout={Number(new URLSearchParams(location.search).get('timeout')) || 15000} /></>;
}
createRoot(document.getElementById('root')).render(<Fixture />);
