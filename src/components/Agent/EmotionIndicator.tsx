import React from 'react';

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
  size = 0.06,
}) => {
  const color = MOOD_COLORS[mood] || '#94a3b8';

  return (
    <mesh position={position}>
      <sphereGeometry args={[size, 8, 8]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} />
    </mesh>
  );
};