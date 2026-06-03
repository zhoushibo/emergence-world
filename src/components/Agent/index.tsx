/* eslint-disable react-hooks/immutability */
import React, { useRef, useState } from 'react';import { useFrame } from '@react-three/fiber';
import { Text, Billboard } from '@react-three/drei';
import * as THREE from 'three';
import type { AgentData } from '../../services/database';
import { DialogueBubble } from './DialogueBubble';
import { EmotionIndicator } from './EmotionIndicator';

const ROLE_COLORS: Record<string, { body: string; emissive: string; accent: string }> = {
  '科学家':   { body: '#1a3a5c', emissive: '#00ccff', accent: '#00ffff' },
  '工程师':   { body: '#1a2a4c', emissive: '#4488ff', accent: '#66aaff' },
  '作家':     { body: '#3a2a1a', emissive: '#ffaa44', accent: '#ffcc66' },
  '架构师':   { body: '#2a1a3a', emissive: '#aa66ff', accent: '#cc88ff' },
  '调解者':   { body: '#1a3a2a', emissive: '#44ff88', accent: '#66ffaa' },
  '分析师':   { body: '#3a1a2a', emissive: '#ff44aa', accent: '#ff66cc' },
  '探索者':   { body: '#3a2a0a', emissive: '#ff8800', accent: '#ffaa44' },
  '研究员':   { body: '#1a3a1a', emissive: '#44ff44', accent: '#88ff88' },
  '创新领袖': { body: '#3a1a3a', emissive: '#ff44ff', accent: '#ff88ff' },
  '社区锚点': { body: '#3a3a1a', emissive: '#ffff44', accent: '#ffff88' },
};

const DEFAULT_ROLE_COLOR = { body: '#1a2a3c', emissive: '#4488ff', accent: '#66aaff' };

interface AgentProps {
  data: AgentData;
  isSelected?: boolean;
  onClick?: (id: string) => void;
  activeDialogue?: string;
}

function ParticleTrail({ color, count = 20 }: { color: string; count?: number }) {
  const ref = useRef<THREE.Points>(null);
  const [buffers] = useState(() => ({
    positions: new Float32Array(count * 3),
    velocities: new Float32Array(count * 3),
  }));

  useFrame((state, delta) => {
    if (!ref.current) return;
    const t = state.clock.getElapsedTime();
    const { positions, velocities } = buffers;
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      positions[i3 + 1] += delta * (0.3 + velocities[i3 + 1]);
      positions[i3] += Math.sin(t + i) * delta * 0.1;
      positions[i3 + 2] += Math.cos(t + i) * delta * 0.1;

      if (positions[i3 + 1] > 2.0) {
        positions[i3] = (Math.random() - 0.5) * 0.4;
        positions[i3 + 1] = 0;
        positions[i3 + 2] = (Math.random() - 0.5) * 0.4;
        velocities[i3 + 1] = Math.random() * 0.5;
      }
    }
    ref.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[buffers.positions, 3]}
          count={count}
        />
      </bufferGeometry>
      <pointsMaterial
        color={color}
        size={0.04}
        transparent
        opacity={0.6}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  );
}

export const Agent: React.FC<AgentProps> = ({ data, isSelected, onClick, activeDialogue }) => {
  const groupRef = useRef<THREE.Group>(null);
  const leftLegRef = useRef<THREE.Mesh>(null);
  const rightLegRef = useRef<THREE.Mesh>(null);
  const auraRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  const roleColor = ROLE_COLORS[data.role] || DEFAULT_ROLE_COLOR;
  const displayColor = isSelected ? '#ffcc00' : hovered ? '#ffffff' : roleColor.body;
  const emissiveColor = isSelected ? '#ffcc00' : roleColor.emissive;

  useFrame((state, delta) => {
    const t = state.clock.getElapsedTime();
    if (!groupRef.current) return;

    const target = data.position;
    const current = groupRef.current.position;
    const dx = target[0] - current.x;
    const dz = target[2] - current.z;
    const distSq = dx * dx + dz * dz;

    const lerpRate = 1 - Math.exp(-delta * 2);
    current.x += dx * lerpRate;
    current.z += dz * lerpRate;

    const moving = distSq > 0.04;
    const walkFreq = moving ? 7 : 2;
    const walkAmp = moving ? 0.45 : 0.05;
    const bobAmp = moving ? 0.08 : 0.015;
    current.y = Math.abs(Math.sin(t * walkFreq)) * bobAmp;

    if (leftLegRef.current) {
      leftLegRef.current.rotation.x = Math.sin(t * walkFreq) * walkAmp;
    }
    if (rightLegRef.current) {
      rightLegRef.current.rotation.x = Math.sin(t * walkFreq + Math.PI) * walkAmp;
    }

    if (auraRef.current) {
      auraRef.current.rotation.y = t * 1.5;
      auraRef.current.rotation.z = t * 0.8;
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
      <mesh ref={leftLegRef} position={[-0.1, 0.15, 0]} castShadow>
        <capsuleGeometry args={[0.06, 0.25, 8, 12]} />
        <meshStandardMaterial color="#0a0a1a" roughness={0.8} metalness={0.2} />
      </mesh>
      <mesh ref={rightLegRef} position={[0.1, 0.15, 0]} castShadow>
        <capsuleGeometry args={[0.06, 0.25, 8, 12]} />
        <meshStandardMaterial color="#0a0a1a" roughness={0.8} metalness={0.2} />
      </mesh>

      <mesh position={[0, 0.55, 0]} castShadow>
        <capsuleGeometry args={[0.15, 0.35, 8, 16]} />
        <meshStandardMaterial
          color={displayColor}
          roughness={0.4}
          metalness={0.6}
          emissive={emissiveColor}
          emissiveIntensity={isSelected ? 0.5 : hovered ? 0.3 : 0.15}
          envMapIntensity={1.5}
        />
      </mesh>

      <mesh position={[0, 1.0, 0]} castShadow>
        <icosahedronGeometry args={[0.18, 2]} />
        <meshStandardMaterial
          color={displayColor}
          roughness={0.3}
          metalness={0.7}
          emissive={emissiveColor}
          emissiveIntensity={isSelected ? 0.6 : 0.2}
          envMapIntensity={2.0}
        />
      </mesh>

      <mesh ref={auraRef} position={[0, 0.55, 0]}>
        <torusGeometry args={[0.35, 0.01, 8, 32]} />
        <meshStandardMaterial
          color={roleColor.accent}
          emissive={roleColor.accent}
          emissiveIntensity={isSelected ? 1.0 : 0.4}
          transparent
          opacity={isSelected ? 0.8 : 0.3}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>

      <ParticleTrail color={roleColor.accent} />

      <EmotionIndicator mood={data.mood} />

      <Billboard position={[0, 1.55, 0]}>
        <Text
          fontSize={0.18}
          color={roleColor.accent}
          anchorX="center"
          anchorY="bottom"
          outlineWidth={0.04}
          outlineColor="#000011"
        >
          {data.name}
        </Text>
      </Billboard>

      <Billboard position={[0, 1.38, 0]}>
        <Text
          fontSize={0.1}
          color={roleColor.emissive}
          anchorX="center"
          anchorY="bottom"
          outlineWidth={0.02}
          outlineColor="#000011"
        >
          {data.role}
        </Text>
      </Billboard>

      {activeDialogue && (
        <DialogueBubble text={activeDialogue} position={[0, 1.8, 0]} />
      )}

      <group position={[0, 1.15, 0.2]}>
        <mesh>
          <planeGeometry args={[0.3, 0.03]} />
          <meshBasicMaterial color="#111133" transparent opacity={0.8} />
        </mesh>
        <mesh position={[-0.15 + (data.energy / 100) * 0.15, 0, 0.001]}>
          <planeGeometry args={[0.3 * (data.energy / 100), 0.03]} />
          <meshBasicMaterial
            color={data.energy > 30 ? roleColor.accent : '#ef4444'}
            toneMapped={false}
          />
        </mesh>
      </group>

      {isSelected && (
        <pointLight
          position={[0, 0.5, 0]}
          intensity={0.8}
          color={roleColor.accent}
          distance={4}
          decay={2}
        />
      )}
    </group>
  );
};
