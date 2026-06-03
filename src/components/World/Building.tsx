import React, { useState, useRef, useMemo } from 'react';
import { Text } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { LocationConfig } from '../../data/locations';

interface BuildingProps {
  data: LocationConfig;
  isSelected?: boolean;
  onClick?: (id: string) => void;
}

const TYPE_PBR: Record<string, { roughness: number; metalness: number; emissiveColor: string; emissiveIntensity: number }> = {
  outdoor:     { roughness: 0.9, metalness: 0.0, emissiveColor: '#22c55e', emissiveIntensity: 0.15 },
  transit:     { roughness: 0.6, metalness: 0.4, emissiveColor: '#64748b', emissiveIntensity: 0.05 },
  commercial:  { roughness: 0.3, metalness: 0.6, emissiveColor: '#fbbf24', emissiveIntensity: 0.2 },
  workplace:   { roughness: 0.4, metalness: 0.5, emissiveColor: '#3b82f6', emissiveIntensity: 0.15 },
  residential: { roughness: 0.7, metalness: 0.2, emissiveColor: '#a78bfa', emissiveIntensity: 0.1 },
  institution: { roughness: 0.5, metalness: 0.3, emissiveColor: '#f97316', emissiveIntensity: 0.1 },
  government:  { roughness: 0.35, metalness: 0.5, emissiveColor: '#ef4444', emissiveIntensity: 0.15 },
  financial:   { roughness: 0.2, metalness: 0.7, emissiveColor: '#14b8a6', emissiveIntensity: 0.2 },
};

const NEON_COLORS = ['#00ffff', '#ff00ff', '#ffff00', '#00ff88', '#ff4488', '#44aaff', '#ffaa00', '#88ff44'];

export const Building: React.FC<BuildingProps> = ({ data, isSelected, onClick }) => {
  const [hovered, setHovered] = useState(false);
  const glowRef = useRef<THREE.Mesh>(null);
  const [width, height, depth] = data.size;
  const isPark = data.type === 'outdoor';
  const pbr = TYPE_PBR[data.type] || TYPE_PBR.workplace;

  const neonColor = useMemo(() => {
    return NEON_COLORS[Math.abs(data.name.charCodeAt(0) + data.name.charCodeAt(1)) % NEON_COLORS.length];
  }, [data.name]);

  useFrame((state) => {
    if (glowRef.current) {
      const t = state.clock.getElapsedTime();
      const mat = glowRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 0.3 + 0.15 * Math.sin(t * 2 + data.position[0]);
    }
  });

  const baseColor = isSelected ? '#ffcc00' : hovered ? '#ffffff' : data.color;
  const edgeColor = isSelected ? '#ffcc00' : neonColor;

  return (
    <group position={data.position}>
      <mesh
        position={[0, isPark ? 0.15 : height / 2, 0]}
        castShadow
        receiveShadow
        onClick={() => onClick?.(data.id)}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <boxGeometry args={[width, isPark ? 0.3 : height, depth]} />
        <meshStandardMaterial
          color={baseColor}
          roughness={pbr.roughness}
          metalness={pbr.metalness}
          emissive={pbr.emissiveColor}
          emissiveIntensity={pbr.emissiveIntensity}
          transparent={isPark}
          opacity={isPark ? 0.8 : 1}
          envMapIntensity={1.2}
        />
      </mesh>

      {!isPark && (
        <>
          <mesh position={[0, height + 0.15, 0]} castShadow>
            <boxGeometry args={[width + 0.4, 0.3, depth + 0.4]} />
            <meshStandardMaterial
              color={data.roofColor}
              roughness={pbr.roughness * 0.8}
              metalness={pbr.metalness + 0.2}
              emissive={neonColor}
              emissiveIntensity={0.05}
            />
          </mesh>

          <mesh position={[0, height / 2, depth / 2 + 0.02]}>
            <planeGeometry args={[width + 0.1, height + 0.1]} />
            <meshStandardMaterial
              color={edgeColor}
              transparent
              opacity={isSelected ? 0.4 : hovered ? 0.2 : 0.08}
              emissive={edgeColor}
              emissiveIntensity={isSelected ? 0.6 : hovered ? 0.3 : 0.1}
              side={THREE.DoubleSide}
            />
          </mesh>
        </>
      )}

      {!isPark && height > 2.5 && (
        <>
          {Array.from({ length: Math.floor(height / 1.5) }).map((_, row) =>
            Array.from({ length: Math.max(1, Math.floor(width / 1.2)) }).map((_, col) => {
              const windowSeed = row * 7 + col * 13 + data.position[0];
              const isLit = ((windowSeed * 31) % 10) > 2;
              const windowColor = isLit ? neonColor : '#111122';
              const windowEmissive = isLit ? 0.8 : 0.0;

              return (
                <mesh
                  key={`f${row}-${col}`}
                  ref={isLit && row === 0 && col === 0 ? glowRef : undefined}
                  position={[
                    -width / 2 + 0.6 + col * 1.2,
                    1 + row * 1.5,
                    depth / 2 + 0.02,
                  ]}
                >
                  <planeGeometry args={[0.5, 0.7]} />
                  <meshStandardMaterial
                    color={windowColor}
                    emissive={windowColor}
                    emissiveIntensity={windowEmissive}
                    transparent
                    opacity={isLit ? 0.95 : 0.3}
                    toneMapped={false}
                  />
                </mesh>
              );
            })
          )}

          {Array.from({ length: Math.floor(height / 1.5) }).map((_, row) =>
            Array.from({ length: Math.max(1, Math.floor(width / 1.2)) }).map((_, col) => {
              const windowSeed = row * 11 + col * 17 + data.position[2];
              const isLit = ((windowSeed * 23) % 10) > 3;

              return (
                <mesh
                  key={`b${row}-${col}`}
                  position={[
                    -width / 2 + 0.6 + col * 1.2,
                    1 + row * 1.5,
                    -depth / 2 - 0.02,
                  ]}
                  rotation={[0, Math.PI, 0]}
                >
                  <planeGeometry args={[0.5, 0.7]} />
                  <meshStandardMaterial
                    color={isLit ? neonColor : '#111122'}
                    emissive={isLit ? neonColor : '#000000'}
                    emissiveIntensity={isLit ? 0.7 : 0.0}
                    transparent
                    opacity={isLit ? 0.95 : 0.3}
                    toneMapped={false}
                  />
                </mesh>
              );
            })
          )}
        </>
      )}

      {!isPark && (
        <pointLight
          position={[0, height * 0.6, depth / 2 + 1]}
          intensity={0.4}
          color={neonColor}
          distance={6}
          decay={2}
        />
      )}

      <Text
        position={[0, isPark ? 0.5 : height + 1.2, 0]}
        fontSize={0.4}
        color={isSelected ? '#ffcc00' : '#e0e0ff'}
        anchorX="center"
        anchorY="bottom"
        outlineWidth={0.06}
        outlineColor="#000011"
      >
        {data.name}
      </Text>

      <Text
        position={[0, isPark ? 0.2 : height + 0.7, 0]}
        fontSize={0.2}
        color={neonColor}
        anchorX="center"
        anchorY="bottom"
        outlineWidth={0.03}
        outlineColor="#000011"
      >
        {data.type}
      </Text>
    </group>
  );
};
