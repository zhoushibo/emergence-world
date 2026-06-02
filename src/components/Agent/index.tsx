import React, { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, Billboard } from '@react-three/drei';
import * as THREE from 'three';
import type { AgentData } from '../../services/database';
import { DialogueBubble } from './DialogueBubble';
import { EmotionIndicator } from './EmotionIndicator';

// 角色颜色映射
const ROLE_COLORS: Record<string, string> = {
  '科学家': '#e0f2fe',
  '工程师': '#dbeafe',
  '作家': '#fef3c7',
  '架构师': '#ede9fe',
  '调解者': '#dcfce7',
  '分析师': '#fce7f3',
  '探索者': '#fff7ed',
  '研究员': '#f0fdf4',
  '创新领袖': '#fdf2f8',
  '社区锚点': '#fef9c3',
};

interface AgentProps {
  data: AgentData;
  isSelected?: boolean;
  onClick?: (id: string) => void;
  activeDialogue?: string;
}

export const Agent: React.FC<AgentProps> = ({ data, isSelected, onClick, activeDialogue }) => {
  const groupRef = useRef<THREE.Group>(null);
  const leftLegRef = useRef<THREE.Mesh>(null);
  const rightLegRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  const bodyColor = ROLE_COLORS[data.role] || '#93c5fd';

  // 行走动画
  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (groupRef.current) {
      groupRef.current.position.y = Math.abs(Math.sin(t * 4)) * 0.05;
    }
    if (leftLegRef.current) {
      leftLegRef.current.rotation.x = Math.sin(t * 4) * 0.3;
    }
    if (rightLegRef.current) {
      rightLegRef.current.rotation.x = Math.sin(t * 4 + Math.PI) * 0.3;
    }
  });

  return (
    <group
      ref={groupRef}
      position={data.position}
      onClick={() => onClick?.(data.id)}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      {/* 腿 */}
      <mesh ref={leftLegRef} position={[-0.1, 0.15, 0]}>
        <capsuleGeometry args={[0.06, 0.25, 4, 8]} />
        <meshStandardMaterial color="#1e293b" />
      </mesh>
      <mesh ref={rightLegRef} position={[0.1, 0.15, 0]}>
        <capsuleGeometry args={[0.06, 0.25, 4, 8]} />
        <meshStandardMaterial color="#1e293b" />
      </mesh>

      {/* 身体 */}
      <mesh position={[0, 0.55, 0]} castShadow>
        <capsuleGeometry args={[0.15, 0.35, 4, 8]} />
        <meshStandardMaterial color={isSelected ? '#ffcc00' : hovered ? '#ffffff' : bodyColor} />
      </mesh>

      {/* 头部 */}
      <mesh position={[0, 1.0, 0]} castShadow>
        <sphereGeometry args={[0.18, 16, 16]} />
        <meshStandardMaterial color="#fef3c7" />
      </mesh>

      {/* 情绪指示器（头顶小圆点） */}
      <EmotionIndicator mood={data.mood} />

      {/* 名字标签 */}
      <Billboard position={[0, 1.5, 0]}>
        <Text
          fontSize={0.18}
          color="white"
          anchorX="center"
          anchorY="bottom"
          outlineWidth={0.03}
          outlineColor="#000000"
        >
          {data.name}
        </Text>
      </Billboard>

      {/* 角色标签 */}
      <Billboard position={[0, 1.35, 0]}>
        <Text fontSize={0.1} color="#9ca3af" anchorX="center" anchorY="bottom">
          {data.role}
        </Text>
      </Billboard>

      {/* 对话气泡 */}
      {activeDialogue && (
        <DialogueBubble text={activeDialogue} position={[0, 1.8, 0]} />
      )}

      {/* 能量条 */}
      <group position={[0, 1.15, 0.2]}>
        <mesh>
          <planeGeometry args={[0.3, 0.03]} />
          <meshBasicMaterial color="#374151" />
        </mesh>
        <mesh position={[-0.15 + (data.energy / 100) * 0.15, 0, 0.001]}>
          <planeGeometry args={[0.3 * (data.energy / 100), 0.03]} />
          <meshBasicMaterial color={data.energy > 30 ? '#4ade80' : '#ef4444'} />
        </mesh>
      </group>
    </group>
  );
};