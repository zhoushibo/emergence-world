import React from 'react';

/**
 * 城市地面组件
 * - 灰色主地面
 * - 道路网格（东西向 + 南北向）
 * - 人行道覆盖层
 */
export const CityGround: React.FC = () => {
  return (
    <group>
      {/* 主地面 — 城市灰 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[60, 60]} />
        <meshStandardMaterial color="#6b7280" />
      </mesh>

      {/* 东西向道路 */}
      {[-15, -5, 5, 15, 22].map((z, i) => (
        <mesh
          key={`road-ew-${i}`}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0.01, z + 2.5]}
        >
          <planeGeometry args={[40, 3]} />
          <meshStandardMaterial color="#374151" />
        </mesh>
      ))}

      {/* 南北向道路 */}
      {[-12, -4, 4, 12].map((x, i) => (
        <mesh
          key={`road-ns-${i}`}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[x, 0.01, 3.5]}
        >
          <planeGeometry args={[3, 45]} />
          <meshStandardMaterial color="#374151" />
        </mesh>
      ))}

      {/* 人行道 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]} receiveShadow>
        <planeGeometry args={[50, 50]} />
        <meshStandardMaterial color="#9ca3af" transparent opacity={0.3} />
      </mesh>
    </group>
  );
};