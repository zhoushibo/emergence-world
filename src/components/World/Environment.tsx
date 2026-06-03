import React, { useRef } from 'react';
import { Sky, Cloud } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export const UESkyAndAtmosphere: React.FC = () => {
  const dirLightRef = useRef<THREE.DirectionalLight>(null);

  useFrame((state) => {
    if (dirLightRef.current) {
      const t = state.clock.getElapsedTime() * 0.05;
      dirLightRef.current.position.set(
        Math.cos(t) * 30,
        20 + Math.sin(t * 0.5) * 5,
        Math.sin(t) * 30
      );
    }
  });

  return (
    <>
      <fog attach="fog" args={['#0a0a1a', 30, 120]} />

      <Sky
        distance={450000}
        sunPosition={[100, 20, 100]}
        inclination={0.52}
        azimuth={0.25}
        rayleigh={2}
        turbidity={8}
        mieCoefficient={0.005}
        mieDirectionalG={0.8}
      />

      <Cloud
        opacity={0.4}
        speed={0.2}
        position={[0, 30, -20]}
        color="#c8d0e0"
      />
      <Cloud
        opacity={0.25}
        speed={0.15}
        position={[-30, 35, 10]}
        color="#b0b8cc"
      />

      <ambientLight intensity={0.15} color="#4466aa" />

      <directionalLight
        ref={dirLightRef}
        position={[30, 25, 20]}
        intensity={2.5}
        color="#ffeedd"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={100}
        shadow-camera-left={-40}
        shadow-camera-right={40}
        shadow-camera-top={40}
        shadow-camera-bottom={-40}
        shadow-bias={-0.0005}
        shadow-normalBias={0.02}
      />

      <pointLight position={[0, 15, 0]} intensity={1.0} color="#6644ff" distance={60} decay={2} />
      <pointLight position={[-20, 8, -15]} intensity={0.6} color="#ff4488" distance={40} decay={2} />
      <pointLight position={[20, 8, 15]} intensity={0.6} color="#44aaff" distance={40} decay={2} />

      <hemisphereLight
        args={['#b1e1ff', '#1a0a2e', 0.4]}
      />
    </>
  );
};
