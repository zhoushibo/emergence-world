import React, { useRef, useMemo, useState } from 'react';
import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import type { LocationConfig } from '../../data/locations';

interface BuildingProps {
  data: LocationConfig;
  isSelected?: boolean;
  onClick?: (id: string) => void;
}

const MODEL_BASE = '/models/buildings/';

/** 建筑类型 → Rim Light 霓虹色 */
const NEON_BY_TYPE: Record<string, string> = {
  institution: '#ffd700',
  commercial: '#ffdd44',
  workplace: '#66ccff',
  residential: '#ccaaff',
  government: '#ff6666',
  financial: '#66ddcc',
  outdoor: '#44ff88',
  transit: '#ffcc44',
};

/** 预加载所有建筑模型（在模块加载时触发） */
const preloaded = new Set<string>();
export function preloadBuildingModels(locationIds: string[]) {
  for (const id of locationIds) {
    if (!preloaded.has(id)) {
      useGLTF.preload(`${MODEL_BASE}${id}.glb`);
      preloaded.add(id);
    }
  }
}

export const Building: React.FC<BuildingProps> = ({ data, isSelected, onClick }) => {
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);

  // 加载 GLB 模型（drei 的 useGLTF 自带缓存，相同路径不会重复加载）
  const { scene } = useGLTF(`${MODEL_BASE}${data.id}.glb`);

  // 克隆场景，确保每个建筑实例独立
  const modelClone = useMemo(() => {
    const cloned = scene.clone(true);
    cloned.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    return cloned;
  }, [scene]);

  // 动态材质覆写 — 选中/悬停时调整外观
  const effectColor = isSelected ? '#ffcc00' : hovered ? '#ffffff' : null;
  const roleNeonColor = NEON_BY_TYPE[data.type] || '#88aaff';

  useFrame((state) => {
    if (!groupRef.current || !effectColor) return;
    // 微弱的脉冲发光效果，选中时
    const t = state.clock.getElapsedTime();
    const pulse = 0.3 + 0.15 * Math.sin(t * 2 + data.position[0]);
    groupRef.current.children.forEach((child) => {
      if (child instanceof THREE.Mesh && child.material) {
        const mat = child.material as THREE.MeshStandardMaterial;
        if (mat.emissive) {
          mat.emissiveIntensity = isSelected ? pulse : 0;
        }
      }
    });
  });

  return (
    <group
      ref={groupRef}
      position={data.position}
      onClick={() => onClick?.(data.id)}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      {/* GLB 模型 */}
      <primitive object={modelClone} />

      {/* 选中/悬停 Rim Light 外发光框 */}
      {(isSelected || hovered) && (
        <>
          {/* 基础发光框 */}
          <mesh position={[0, data.size[1] / 2, 0]}>
            <boxGeometry args={[data.size[0] + 0.4, data.size[1] + 0.3, data.size[2] + 0.4]} />
            <meshStandardMaterial
              color={effectColor!}
              transparent
              opacity={isSelected ? 0.15 : 0.06}
              emissive={effectColor!}
              emissiveIntensity={isSelected ? 0.4 : 0.1}
              side={THREE.BackSide}
              depthWrite={false}
            />
          </mesh>
          {/* Rim Light 薄框 — 仅边缘发光（用 wireframe 风格框线） */}
          <mesh position={[0, data.size[1] / 2, 0]}>
            <boxGeometry args={[data.size[0] + 0.02, data.size[1] + 0.02, data.size[2] + 0.02]} />
            <meshBasicMaterial
              color={isSelected ? '#ffcc00' : roleNeonColor}
              transparent
              opacity={isSelected ? 0.35 : 0.12}
              wireframe
            />
          </mesh>
        </>
      )}

      {/* 建筑名称标签 */}
      <Text
        position={[0, data.size[1] + 1.0, 0]}
        fontSize={0.35}
        color={isSelected ? '#ffcc00' : '#e0e0ff'}
        anchorX="center"
        anchorY="bottom"
        outlineWidth={0.05}
        outlineColor="#000011"
      >
        {data.name}
      </Text>

      {/* 类型标签 */}
      <Text
        position={[0, data.size[1] + 0.55, 0]}
        fontSize={0.18}
        color={isSelected ? '#ffcc00' : '#8899bb'}
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
