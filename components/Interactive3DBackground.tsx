'use client';

import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Points, PointMaterial } from '@react-three/drei';

function ParticleField() {
  const ref = useRef<any>();

  // Generate random 3D positions for 2,000 particles
  const [positions] = React.useState(() => {
    const pos = new Float32Array(2000 * 3);
    for (let i = 0; i < 2000 * 3; i++) {
      pos[i] = (Math.random() - 0.5) * 10;
    }
    return pos;
  });

  // Rotate particle field
  useFrame((_, delta) => {
    if (ref.current) {
      ref.current.rotation.x -= delta / 10;
      ref.current.rotation.y -= delta / 15;
    }
  });

  return (
    <group rotation={[0, 0, Math.PI / 4]}>
      <Points ref={ref} positions={positions} stride={3} frustumCulled={false}>
        <PointMaterial
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
  return (
    <div className="fixed inset-0 -z-10 bg-[#0b0f17]">
      <Canvas camera={{ position: [0, 0, 5] }}>
        <ambientLight intensity={0.5} />
        <ParticleField />
      </Canvas>
    </div>
  );
}