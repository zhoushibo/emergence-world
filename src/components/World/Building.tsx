import React, { useState } from 'react';
import { Text } from '@react-three/drei';
import type { LocationConfig } from '../../data/locations';

interface BuildingProps {
  data: LocationConfig;
  isSelected?: boolean;
  onClick?: (id: string) => void;
}

/**
 * 单个建筑 3D 组件
 * - 根据类型渲染不同外观（公园扁平、建筑有屋顶/窗户）
 * - 支持选中高亮和 hover 效果
 * - 使用 drei Text 渲染中文标签
 */
export const Building: React.FC<BuildingProps> = ({ data, isSelected, onClick }) => {
  const [hovered, setHovered] = useState(false);
  const [width, height, depth] = data.size;
  const isPark = data.type === 'outdoor';

  return (
    <group position={data.position}>
      {/* 建筑主体 */}
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
          color={isSelected ? '#ffcc00' : hovered ? '#ffffff' : data.color}
          transparent={isPark}
          opacity={isPark ? 0.8 : 1}
        />
      </mesh>

      {/* 屋顶（非公园） */}
      {!isPark && (
        <mesh position={[0, height + 0.15, 0]} castShadow>
          <boxGeometry args={[width + 0.4, 0.3, depth + 0.4]} />
          <meshStandardMaterial color={data.roofColor} />
        </mesh>
      )}

      {/* 窗户（非公园、非低矮建筑） */}
      {!isPark && height > 2.5 && (
        <>
          {/* 前面窗户 */}
          {Array.from({ length: Math.floor(height / 1.5) }).map((_, row) =>
            Array.from({ length: Math.max(1, Math.floor(width / 1.2)) }).map((_, col) => (
              <mesh
                key={`f${row}-${col}`}
                position={[
                  -width / 2 + 0.6 + col * 1.2,
                  1 + row * 1.5,
                  depth / 2 + 0.01,
                ]}
              >
                <planeGeometry args={[0.5, 0.7]} />
                <meshStandardMaterial
                  color="#fef3c7"
                  emissive="#fef3c7"
                  emissiveIntensity={0.3}
                />
              </mesh>
            ))
          )}
        </>
      )}

      {/* 名字标签 */}
      <Text
        position={[0, isPark ? 0.5 : height + 1, 0]}
        fontSize={0.4}
        color="white"
        anchorX="center"
        anchorY="bottom"
        outlineWidth={0.05}
        outlineColor="#000000"
      >
        {data.name}
      </Text>

      {/* 类型标签 */}
      <Text
        position={[0, isPark ? 0.2 : height + 0.6, 0]}
        fontSize={0.2}
        color="#d1d5db"
        anchorX="center"
        anchorY="bottom"
      >
        {data.type}
      </Text>
    </group>
  );
};