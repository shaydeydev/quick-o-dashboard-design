'use client';

import React, { useRef } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { Points, PointMaterial } from '@react-three/drei';
import { useScanPhase, type ScanPhase } from '@/lib/scan-store';

// How the field looks and moves in each scan phase
const LOOK: Record<ScanPhase, { color: string; speed: number; pulse: number; size: number }> = {
  idle: { color: '#3b82f6', speed: 1, pulse: 0, size: 0.03 },
  live: { color: '#22d3ee', speed: 1.8, pulse: 0, size: 0.032 },
  analyzing: { color: '#a78bfa', speed: 4, pulse: 1, size: 0.036 },
  pricing: { color: '#fbbf24', speed: 6, pulse: 1.4, size: 0.038 },
  found: { color: '#34d399', speed: 2, pulse: 0, size: 0.034 },
  error: { color: '#f87171', speed: 0.5, pulse: 0, size: 0.03 },
};

function ParticleField({ phase }: { phase: ScanPhase }) {
  const pointsRef = useRef<any>(null);
  const matRef = useRef<any>(null);
  const speedRef = useRef(1);
  const burstRef = useRef(0);
  const prevPhaseRef = useRef<ScanPhase>(phase);
  const targetColor = useRef(new THREE.Color(LOOK.idle.color));
  const reduceMotionRef = useRef<boolean | null>(null);

  // Generate random 3D positions for 2,000 particles
  const [positions] = React.useState(() => {
    const pos = new Float32Array(2000 * 3);
    for (let i = 0; i < 2000 * 3; i++) {
      pos[i] = (Math.random() - 0.5) * 10;
    }
    return pos;
  });

  useFrame((state, delta) => {
    const pts = pointsRef.current;
    const mat = matRef.current;
    if (!pts) return;

    // Read the "reduce motion" setting once
    if (reduceMotionRef.current === null && typeof window !== 'undefined') {
      reduceMotionRef.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    const reduce = reduceMotionRef.current === true;

    const look = LOOK[phase] ?? LOOK.idle;

    // Burst the moment a product is found
    if (phase === 'found' && prevPhaseRef.current !== 'found' && !reduce) {
      burstRef.current = 1;
    }
    prevPhaseRef.current = phase;

    // Ease the spin speed toward the phase speed
    const goalSpeed = reduce ? Math.min(look.speed, 1) * 0.3 : look.speed;
    speedRef.current += (goalSpeed - speedRef.current) * Math.min(1, delta * 3);

    pts.rotation.x -= (delta / 10) * speedRef.current;
    pts.rotation.y -= (delta / 15) * speedRef.current;

    // Pulse while analyzing / pricing
    const t = state.clock.elapsedTime;
    const pulse = reduce || look.pulse === 0 ? 0 : ((Math.sin(t * 5) + 1) / 2) * look.pulse;

    // Burst fades out over about a second
    burstRef.current = Math.max(0, burstRef.current - delta * 0.9);
    const burst = burstRef.current;

    pts.scale.setScalar(1 + pulse * 0.08 + burst * 0.8);

    if (mat) {
      mat.size = look.size * (1 + pulse * 0.6 + burst * 1.5);
      targetColor.current.set(look.color);
      mat.color.lerp(targetColor.current, Math.min(1, delta * 4));
    }
  });

  return (
    <group rotation={[0, 0, Math.PI / 4]}>
      <Points ref={pointsRef} positions={positions} stride={3} frustumCulled={false}>
        <PointMaterial
          ref={matRef}
          transparent
          color="#3b82f6"
          size={0.03}
          sizeAttenuation={true}
          depthWrite={false}
        />
      </Points>
    </group>
  );
}

export default function Interactive3DBackground() {
  const phase = useScanPhase();

  return (
    <div className="fixed inset-0 -z-10 bg-[#0b0f17]" aria-hidden="true">
      <Canvas camera={{ position: [0, 0, 5] }}>
        <ambientLight intensity={0.5} />
        <ParticleField phase={phase} />
      </Canvas>
    </div>
  );
}