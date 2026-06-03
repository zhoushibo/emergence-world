import React from 'react';
import { Text, Billboard } from '@react-three/drei';

interface DialogueBubbleProps {
  text: string;
  position?: [number, number, number];
  color?: string;
}

export const DialogueBubble: React.FC<DialogueBubbleProps> = ({
  text,
  position = [0, 2, 0],
  color = '#e0e0ff',
}) => {
  if (!text) return null;

  return (
    <Billboard position={position}>
      <mesh position={[0, 0, -0.02]}>
        <planeGeometry args={[Math.min(text.length * 0.12 + 0.3, 3), 0.5]} />
        <meshStandardMaterial
          color="#0a0a2a"
          transparent
          opacity={0.85}
          emissive="#1a1a4a"
          emissiveIntensity={0.3}
          roughness={0.3}
          metalness={0.5}
        />
      </mesh>
      <mesh position={[0, 0, -0.01]}>
        <planeGeometry args={[Math.min(text.length * 0.12 + 0.35, 3.05), 0.55]} />
        <meshStandardMaterial
          color="#44aaff"
          transparent
          opacity={0.15}
          emissive="#44aaff"
          emissiveIntensity={0.5}
          toneMapped={false}
        />
      </mesh>
      <Text
        fontSize={0.12}
        color={color}
        anchorX="center"
        anchorY="middle"
        maxWidth={2.5}
        outlineWidth={0.02}
        outlineColor="#000011"
      >
        {text}
      </Text>
    </Billboard>
  );
};
