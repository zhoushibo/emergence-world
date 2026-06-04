/* eslint-disable react-hooks/immutability */
import React, { useRef, useState, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, Text, Billboard } from '@react-three/drei';
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
  '医生':     { body: '#1a4a3a', emissive: '#44dd88', accent: '#66ffaa' },
  '教师':     { body: '#2a3a4a', emissive: '#6688ff', accent: '#88aaff' },
  '警官':     { body: '#2a2a4a', emissive: '#4444ff', accent: '#6688ff' },
  '规划师':   { body: '#4a3a1a', emissive: '#ff8844', accent: '#ffaa66' },
  '调度员':   { body: '#2a4a3a', emissive: '#44aa88', accent: '#66ccaa' },
  '财务官':   { body: '#1a3a4a', emissive: '#4488dd', accent: '#66aaee' },
  '运维工程师': { body: '#3a3a3a', emissive: '#888888', accent: '#aaaacc' },
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
  const auraRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  const roleColor = ROLE_COLORS[data.role] || DEFAULT_ROLE_COLOR;
  const displayEmissive = isSelected ? '#ffcc00' : roleColor.emissive;

  // 加载角色 GLB 模型
  const { scene } = useGLTF('/models/agent.glb');

  // 克隆并覆写材质颜色
  const modelClone = useMemo(() => {
    const cloned = scene.clone(true);
    const bodyColor = new THREE.Color(isSelected ? '#ffcc00' : hovered ? '#ffffff' : roleColor.body);
    const emissiveColor = new THREE.Color(isSelected ? '#ffcc00' : roleColor.emissive);

    cloned.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = false;
        if (child.material) {
          const mat = child.material as THREE.MeshStandardMaterial;
          // 身体/头部/手臂/腿用 roleColor
          if (mat.name === 'body_mat' || mat.name === 'arm_mat' || mat.name === 'leg_mat') {
            mat.color.copy(bodyColor);
            mat.emissive.copy(emissiveColor);
            mat.emissiveIntensity = isSelected ? 0.5 : hovered ? 0.3 : 0.15;
            mat.roughness = 0.3;
            mat.metalness = 0.3;
            mat.envMapIntensity = 1.5;
          }
          // 头部用稍亮版本
          if (mat.name === 'head_mat') {
            const headColor = bodyColor.clone();
            headColor.lerp(new THREE.Color('#ffffff'), 0.15);
            mat.color.copy(headColor);
            mat.emissive.copy(emissiveColor);
            mat.emissiveIntensity = isSelected ? 0.3 : 0.1;
            mat.roughness = 0.2;
            mat.metalness = 0.05;
          }
          // 腮红保持粉色
          if (mat.name === 'blush_mat') {
            mat.color.set('#ff9999');
            mat.emissive.set('#ff9999');
            mat.emissiveIntensity = 0.15;
          }
          // 选中时增强发光
          if (isSelected) {
            mat.emissiveIntensity = 0.5;
          }
        }
      }
    });
    return cloned;
  }, [scene, isSelected, hovered, roleColor, data.role]);

  // 选中时颜色变化（依赖 isSelected/hovered 变化时重新应用）
  useEffect(() => {
    if (modelClone) {
      const bodyColor = new THREE.Color(isSelected ? '#ffcc00' : hovered ? '#ffffff' : roleColor.body);
      const emissiveColor = new THREE.Color(isSelected ? '#ffcc00' : roleColor.emissive);
      modelClone.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material) {
          const mat = child.material as THREE.MeshStandardMaterial;
          if (mat.name === 'body_mat' || mat.name === 'arm_mat' || mat.name === 'leg_mat') {
            mat.color.copy(bodyColor);
            mat.emissive.copy(emissiveColor);
            mat.emissiveIntensity = isSelected ? 0.5 : hovered ? 0.3 : 0.15;
          }
          if (mat.name === 'head_mat') {
            const headColor = bodyColor.clone();
            headColor.lerp(new THREE.Color('#ffffff'), 0.15);
            mat.color.copy(headColor);
          }
        }
      });
    }
  }, [modelClone, isSelected, hovered, roleColor]);

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    const t = state.clock.getElapsedTime();

    const target = data.position;
    const current = groupRef.current.position;
    const dx = target[0] - current.x;
    const dz = target[2] - current.z;
    const distSq = dx * dx + dz * dz;

    // 平滑移动
    const lerpRate = 1 - Math.exp(-delta * 2);
    current.x += dx * lerpRate;
    current.z += dz * lerpRate;

    // 走路弹跳
    const moving = distSq > 0.04;
    const walkFreq = moving ? 7 : 2;
    const bobAmp = moving ? 0.06 : 0.012;
    current.y = Math.abs(Math.sin(t * walkFreq)) * bobAmp;

    // 身体微旋转（走路时轻微左右摇摆）
    if (moving) {
      groupRef.current.rotation.z = Math.sin(t * walkFreq * 0.5) * 0.03;
    } else {
      groupRef.current.rotation.z *= 0.95;
    }

    // 光环旋转
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
      {/* GLB 角色模型 */}
      <primitive object={modelClone} />

      {/* 能量光环 */}
      <mesh ref={auraRef} position={[0, 0.45, 0]}>
        <torusGeometry args={[0.32, 0.012, 8, 32]} />
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

      {/* 粒子轨迹 */}
      <ParticleTrail color={roleColor.accent} />

      {/* 情绪指示器 */}
      <EmotionIndicator mood={data.mood} />

      {/* 名称标签 */}
      <Billboard position={[0, 1.3, 0]}>
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

      {/* 角色标签 */}
      <Billboard position={[0, 1.13, 0]}>
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

      {/* 对话气泡 */}
      {activeDialogue && (
        <DialogueBubble text={activeDialogue} position={[0, 1.6, 0]} />
      )}

      {/* 能量条 */}
      <group position={[0, 1.0, 0.25]}>
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

      {/* 选中时点光源 */}
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
