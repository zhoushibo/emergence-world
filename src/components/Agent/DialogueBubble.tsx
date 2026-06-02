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
  color = '#1e293b',
}) => {
  if (!text) return null;

  return (
    <Billboard position={position}>
      <mesh position={[0, 0, -0.01]}>
        <planeGeometry args={[Math.min(text.length * 0.12 + 0.3, 3), 0.5]} />
        <meshStandardMaterial color="white" transparent opacity={0.9} />
      </mesh>
      <Text fontSize={0.12} color={color} anchorX="center" anchorY="middle" maxWidth={2.5}>
        {text}
      </Text>
    </Billboard>
  );
};