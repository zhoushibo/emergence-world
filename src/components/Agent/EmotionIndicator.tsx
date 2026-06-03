import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const MOOD_COLORS: Record<string, string> = {
  '开心': '#4ade80',
  '思考中': '#60a5fa',
  '焦虑': '#f59e0b',
  '愤怒': '#ef4444',
  '悲伤': '#6366f1',
  '平静': '#94a3b8',
  '兴奋': '#f472b6',
  '疲惫': '#78716c',
};

interface EmotionIndicatorProps {
  mood: string;
  position?: [number, number, number];
  size?: number;
}

export const EmotionIndicator: React.FC<EmotionIndicatorProps> = ({
  mood,
  position = [0, 1.3, 0],
  size = 0.08,
}) => {
  const ref = useRef<THREE.Mesh>(null);
  const color = MOOD_COLORS[mood] || '#94a3b8';

  useFrame((state) => {
    if (ref.current) {
      const t = state.clock.getElapsedTime();
      ref.current.position.y = position[1] + Math.sin(t * 3) * 0.03;
      const mat = ref.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 0.5 + 0.3 * Math.sin(t * 2);
    }
  });

  return (
    <mesh ref={ref} position={position}>
      <icosahedronGeometry args={[size, 2]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.5}
        roughness={0.2}
        metalness={0.8}
        toneMapped={false}
      />
    </mesh>
  );
};
