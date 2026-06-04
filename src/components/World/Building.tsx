import React, { useRef, useMemo, useState } from 'react';
import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import type { LocationConfig } from '../../data/locations';
import { createBuildingMaterial } from './BuildingShader';

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

  // 克隆并应用 Fresnel 边缘光 Shader
  const modelClone = useMemo(() => {
    const cloned = scene.clone(true);
    const { color: baseColor, roofColor: neonColor } = data;
    cloned.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        if (child.material) {
          const mat = child.material as THREE.MeshStandardMaterial;
          // 保留纹理建筑（Blender 生成的有真实纹理图）
          const hasTexture = !!(mat.map);
          // 保留自带发光的材质（窗户/霓虹/玻璃）
          const hasEmission = (mat.emissive && (mat.emissive.getHex?.() ?? 0) > 0) || (mat.emissiveIntensity ?? 0) > 0.1;
          const matName = (mat.name || '').toLowerCase();
          const isEmissive = matName.includes('window') || matName.includes('emissive') || matName.includes('glass') || matName.includes('emit') || hasEmission;
          // 只有无纹理、无发光的纯色建筑才套 Fresnel Shader
          if (!hasTexture && !isEmissive) {
            child.material = createBuildingMaterial(baseColor, neonColor, 0.35, 0.4, 0.2);
            (child.material as THREE.ShaderMaterial).uniforms.uTime.value = Math.random() * 100;
          }
        }
      }
    });
    return cloned;
  }, [scene, data.color, data.roofColor]);

  // 动态材质覆写 — 选中/悬停时调整外观
  const effectColor = isSelected ? '#ffcc00' : hovered ? '#ffffff' : null;
  const roleNeonColor = NEON_BY_TYPE[data.type] || '#88aaff';

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.getElapsedTime();

    // 更新所有 ShaderMaterial 的时间 uniform（Fresnel 脉冲）
    groupRef.current.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material instanceof THREE.ShaderMaterial) {
        child.material.uniforms.uTime.value = t;
        child.material.uniforms.uCameraPos.value.copy(state.camera.position);
      }
    });

    if (!effectColor) return;
    // 选中/悬停脉冲发光
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
