import { Component, Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import './PageLoader.css';

const LoaderScene = lazy(() => import('./loader/LoaderScene'));

class SceneBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onError(); }
  render() { return this.state.failed ? null : this.props.children; }
}

function canRenderWebGL() {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2');
    if (!gl) return false;
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return true;
  } catch { return false; }
}

/** Mount once at the app root, outside route elements. ready = essential homepage assets loaded. */
export default function PageLoader({ ready = true, onComplete, timeout = 8500 }) {
  const overlay = useRef();
  const completion = useRef(onComplete);
  const exited = useRef(false);
  const exitTween = useRef();
  const previousOverflow = useRef('');
  const [finished, setFinished] = useState(false);
  const [mode, setMode] = useState('checking');
  const [assembled, setAssembled] = useState(false);
  const [phase, setPhase] = useState('falling');
  completion.current = onComplete;

  const exit = useCallback((immediate = false) => {
    if (exited.current) return;
    exited.current = true;
    setPhase('revealing');
    exitTween.current = gsap.to(overlay.current, {
      clipPath: 'inset(0 0 100% 0)', duration: immediate ? 0 : 0.85,
      ease: 'power4.inOut', onComplete: () => {
        setFinished(true);
        completion.current?.();
      },
    });
  }, []);
  const fallback = useCallback(() => { setMode('static'); setAssembled(true); }, []);
  const assembledScene = useCallback(() => { setAssembled(true); setPhase('assembled'); }, []);

  useEffect(() => {
    if (finished) return;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => {
      if (motion.matches) { setMode('reduced'); setAssembled(true); }
    };
    if (motion.matches) update();
    else if (canRenderWebGL()) setMode('webgl');
    else fallback();
    motion.addEventListener('change', update);
    const timer = window.setTimeout(() => exit(true), Math.max(1000, timeout));
    previousOverflow.current = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      clearTimeout(timer);
      motion.removeEventListener('change', update);
      exitTween.current?.kill();
      document.body.style.overflow = previousOverflow.current;
    };
  }, [exit, fallback, timeout, finished]);

  useEffect(() => {
    if (!ready || !assembled) return;
    const timer = setTimeout(() => exit(mode === 'reduced'), mode === 'webgl' ? 500 : 150);
    return () => clearTimeout(timer);
  }, [ready, assembled, exit, mode]);

  if (finished) return null;
  return <div className="page-loader" ref={overlay} data-phase={phase} data-mode={mode}>
    <p className="sr-only" role="status" aria-live="polite">Preparing Apex Tech Solution. Please wait.</p>
    <div aria-hidden="true" className="loader-top"><span className="loader-brand">APEX↗</span><span className="loader-edition">IDEAS INTO IMPACT.</span><span className="loader-index">INTRO / 001</span></div>
    <div className="loader-stage" aria-hidden="true">
      {mode === 'webgl' && <SceneBoundary onError={fallback}><Suspense fallback={null}><LoaderScene onAssembled={assembledScene} onError={fallback} /></Suspense></SceneBoundary>}
      {(mode === 'static' || mode === 'reduced') && <div className="loader-static">APEX TECH<br/>SOLUTION</div>}
    </div>
    <div aria-hidden="true" className="loader-caption"><span className="caption-line"/><span>GREAT THINGS COME TOGETHER.</span><span className="caption-line"/></div>
    <div aria-hidden="true" className="loader-bottom"><span>CREATIVE MINDSET.<br/><strong>COLLECTIVE IMPACT.</strong></span><span className="loader-orbit">✳</span><span className="loader-bottom-right">A NEW PERSPECTIVE<br/><strong>IS TAKING SHAPE.</strong></span></div>
  </div>;
}
