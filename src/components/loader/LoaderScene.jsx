import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Text3D, useFont } from '@react-three/drei';
import { Physics, RigidBody, CuboidCollider, useRapier } from '@react-three/rapier';
import { Euler, Quaternion, ShapeGeometry } from 'three';
import gsap from 'gsap';

const FONT = '/fonts/helvetiker_bold.typeface.json';
const SIZE = 1.65;
const FINAL_ROTATION = new Quaternion().setFromEuler(new Euler(0.075, -0.10, 0));

function measure(font, char) {
  const geometry = new ShapeGeometry(font.generateShapes(char, SIZE));
  geometry.computeBoundingBox();
  const { min, max } = geometry.boundingBox;
  const metric = { width: max.x - min.x, height: max.y - min.y };
  geometry.dispose();
  return metric;
}

function makeLetters(font) {
  const result = [];
  ['APEX TECH', 'SOLUTION'].forEach((line, row) => {
    const metrics = [...line].map(char => char === ' ' ? { width: 0.55 } : measure(font, char));
    const width = metrics.reduce((sum, metric) => sum + metric.width + 0.09, -0.09);
    let x = -width / 2;
    [...line].forEach((char, index) => {
      const metric = metrics[index];
      if (char !== ' ') result.push({ char, ...metric, target: { x: x + metric.width / 2, y: row === 0 ? 0.99 : -0.99, z: 0 }, index: result.length });
      x += metric.width + 0.09;
    });
  });
  return result;
}

function Framing() {
  const { camera, size } = useThree();
  useLayoutEffect(() => {
    // Fit a fixed safe rectangle on either axis; final layout is never cropped.
    camera.zoom = Math.min(size.width / 14.6, size.height / 10.8);
    camera.updateProjectionMatrix();
  }, [camera, size]);
  return null;
}

function Letter({ letter, register, height }) {
  const body = useRef();
  const index = letter.index;
  useEffect(() => {
    register(index, body.current);
    return () => register(index, null);
  }, [index, register]);
  return <RigidBody ref={body} type="kinematicPosition" colliders={false}
    position={[Math.sin(index * 7.31) * 4.6, height / 2 + 2 + (index % 3) * 0.4, 0.6 + (index % 3) * 0.3]}
    rotation={[(index % 3 - 1) * 0.25, Math.sin(index * 2) * 0.6, Math.sin(index * 3.7) * 1.0]}
    restitution={0.38 + (index % 4) * 0.06} friction={0.65} linearDamping={0.3} angularDamping={0.75} ccd>
    <CuboidCollider args={[letter.width / 2 + 0.025, letter.height / 2 + 0.025, 0.23]} />
    <Text3D font={FONT} size={SIZE} height={0.36} bevelEnabled bevelSize={0.027} bevelThickness={0.035} bevelSegments={3} curveSegments={6}
      castShadow receiveShadow ref={mesh => { if (mesh) mesh.geometry.center(); }}>
      {letter.char}
      <meshStandardMaterial color="#f2680b" metalness={0.22} roughness={0.28} />
    </Text3D>
  </RigidBody>;
}

function Choreography({ onAssembled }) {
  const font = useFont(FONT);
  const letters = useMemo(() => makeLetters(font), [font]);
  const bodies = useRef([]);
  const proxies = useRef([]);
  const progress = useMemo(() => letters.map(() => ({ value: 0 })), [letters]);
  const assembling = useRef(false);
  const notify = useRef(onAssembled);
  const { rapier } = useRapier();
  const { size } = useThree();
  const initialHeight = useRef(size.height / Math.min(size.width / 14.6, size.height / 10.8));
  const register = useMemo(() => (index, body) => { bodies.current[index] = body; }, []);
  notify.current = onAssembled;

  useEffect(() => {
    const timeline = gsap.timeline();
    letters.forEach((letter, index) => {
      timeline.call(() => {
        const body = bodies.current[index];
        if (!body) return;
        body.setBodyType(rapier.RigidBodyType.Dynamic, true);
        body.setGravityScale(0.82 + (index % 5) * 0.1, true);
        body.setLinvel({ x: Math.sin(index * 4) * 1.3, y: -1 - (index % 3), z: 0 }, true);
        body.setAngvel({ x: Math.sin(index) * 1.4, y: Math.cos(index) * 1.2, z: Math.sin(index * 3) * 2.6 }, true);
      }, [], 0.1 + ((index * 7) % 16) * 0.042);
    });
    // Physics owns the fall. At this boundary all bodies become kinematic and
    // GSAP interpolates proxies; only the physics frame writes to Rapier.
    const assemblyStart = Math.max(2.25, Math.sqrt((initialHeight.current / 2 + 5) / 20) + 1.15);
    timeline.call(() => {
      bodies.current.forEach((body, index) => {
        if (!body) return;
        const position = body.translation();
        const rotation = body.rotation();
        proxies.current[index] = { ...position, from: new Quaternion(rotation.x, rotation.y, rotation.z, rotation.w), rotation: new Quaternion() };
        body.setLinvel({ x: 0, y: 0, z: 0 }, true);
        body.setAngvel({ x: 0, y: 0, z: 0 }, true);
        body.setBodyType(rapier.RigidBodyType.KinematicPositionBased, true);
        for (let i = 0; i < body.numColliders(); i++) body.collider(i).setCollisionGroups(0);
      });
      assembling.current = true;
    }, [], assemblyStart);
    letters.forEach((letter, index) => {
      timeline.to(progress[index], { value: 1, duration: 1.05, ease: 'power3.inOut' }, assemblyStart + index * 0.022);
    });
    timeline.call(() => notify.current(), [], '>');
    return () => { timeline.kill(); assembling.current = false; };
  }, [letters, progress, rapier]);

  useFrame(() => {
    if (!assembling.current) return;
    letters.forEach((letter, index) => {
      const body = bodies.current[index];
      const proxy = proxies.current[index];
      if (!body || !proxy) return;
      const t = progress[index].value;
      body.setNextKinematicTranslation({ x: proxy.x + (letter.target.x - proxy.x) * t, y: proxy.y + (letter.target.y - proxy.y) * t, z: proxy.z * (1 - t) });
      proxy.rotation.slerpQuaternions(proxy.from, FINAL_ROTATION, t);
      body.setNextKinematicRotation(proxy.rotation);
    });
  });

  return <>
    {letters.map(letter => <Letter key={letter.index} letter={letter} height={initialHeight.current} register={register} />)}
    <RigidBody type="fixed" colliders={false}><CuboidCollider args={[20, 0.2, 8]} position={[0, -3, 0]} /><CuboidCollider args={[0.2, 40, 8]} position={[-6.6, 12, 0]} /><CuboidCollider args={[0.2, 40, 8]} position={[6.6, 12, 0]} /><CuboidCollider args={[20, 40, 0.2]} position={[0, 12, -0.7]} /><CuboidCollider args={[20, 40, 0.2]} position={[0, 12, 2]} /></RigidBody>
  </>;
}

export default function LoaderScene({ onAssembled, onError }) {
  return <Canvas orthographic shadows dpr={[1, 1.5]} camera={{ position: [0, 0, 24], zoom: 70, near: 0.1, far: 100 }}
    gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
    onCreated={({ gl }) => { gl.domElement.addEventListener('webglcontextlost', onError, { once: true }); }}>
    <Framing />
    <ambientLight intensity={1.65} />
    <directionalLight position={[-4, 7, 10]} intensity={3.4} castShadow shadow-mapSize={[1024, 1024]} shadow-camera-left={-9} shadow-camera-right={9} shadow-camera-top={8} shadow-camera-bottom={-8} shadow-normalBias={0.04} shadow-bias={-0.0003} shadow-radius={5} />
    <directionalLight position={[6, -2, 4]} intensity={1.1} color="#ffdcb3" />
    <mesh position={[0, 0, -1.05]} receiveShadow><planeGeometry args={[200, 200]} /><shadowMaterial transparent opacity={0.13} /></mesh>
    <Physics gravity={[0, -40, 0]} timeStep={1 / 60} interpolate><Choreography onAssembled={onAssembled} /></Physics>
  </Canvas>;
}
