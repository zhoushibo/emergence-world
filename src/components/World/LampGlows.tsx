/**
 * 路灯体积光晕 — 模拟 UE5 的体积光效果
 * 每个路灯下方一个锥形光柱 + 球状辉光精灵
 */
import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// 路灯位置（与 Decorations.tsx 中一致）
const LAMP_POSITIONS: [number, number, number][] = (() => {
  const positions: [number, number, number][] = [];
  const zRoads = [-17.5, -7.5, 2.5, 12.5, 19.5];
  for (const z of zRoads) {
    for (let x = -14; x <= 14; x += 5) {
      positions.push([x, 0, z]);
      if (Math.random() > 0.5) {
        positions.push([x + 2, 0, z - 0.3]);
      }
    }
  }
  return positions;
})();

/**
 * 单个光晕精灵 — Canvas 绘制的径向渐变
 */
function createGlowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;

  const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, 'rgba(255, 220, 150, 1)');
  gradient.addColorStop(0.2, 'rgba(255, 200, 100, 0.6)');
  gradient.addColorStop(0.5, 'rgba(255, 180, 80, 0.2)');
  gradient.addColorStop(1, 'rgba(255, 180, 80, 0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

/**
 * 创建光锥纹理
 */
function createConeTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;

  const gradient = ctx.createLinearGradient(0, 0, 0, 64);
  gradient.addColorStop(0, 'rgba(255, 200, 150, 0.15)');
  gradient.addColorStop(0.3, 'rgba(255, 200, 150, 0.08)');
  gradient.addColorStop(0.7, 'rgba(255, 200, 150, 0.03)');
  gradient.addColorStop(1, 'rgba(255, 200, 150, 0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 32, 64);

  // 边缘柔化
  const edgeGrad = ctx.createLinearGradient(0, 0, 32, 0);
  edgeGrad.addColorStop(0, 'rgba(0,0,0,1)');
  edgeGrad.addColorStop(0.3, 'rgba(0,0,0,0)');
  edgeGrad.addColorStop(0.7, 'rgba(0,0,0,0)');
  edgeGrad.addColorStop(1, 'rgba(0,0,0,1)');
  ctx.fillStyle = edgeGrad;
  ctx.fillRect(0, 0, 32, 64);

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

/**
 * 单个路灯的光晕组
 */
const LampGlowSprite: React.FC<{
  position: [number, number, number];
  glowTex: THREE.CanvasTexture;
  coneTex: THREE.CanvasTexture;
  index: number;
}> = ({ position, glowTex, coneTex, index }) => {
  const glowRef = useRef<THREE.Sprite>(null);
  const coneRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (glowRef.current && coneRef.current) {
      const t = state.clock.getElapsedTime();
      // 微弱呼吸效果
      const breathe = 0.85 + 0.15 * Math.sin(t * 0.7 + index * 0.5);
      glowRef.current.scale.setScalar(0.6 * breathe);
      // 光锥透明度波动
      const mat = coneRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.06 + 0.03 * Math.sin(t * 0.5 + index);
    }
  });

  return (
    <group position={[position[0], position[1], position[2]]}>
      {/* 光晕精灵 — 球状辉光 */}
      <sprite ref={glowRef} position={[0, 1.15, 0]}>
        <spriteMaterial
          map={glowTex}
          blending={THREE.AdditiveBlending}
          transparent
          depthWrite={false}
          opacity={0.4}
        />
      </sprite>

      {/* 光锥 — 向下投射 */}
      <mesh ref={coneRef} position={[0, 1.1, 0]} rotation={[0, 0, 0]}>
        <planeGeometry args={[0.8, 1.2]} />
        <meshBasicMaterial
          map={coneTex}
          transparent
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          opacity={0.08}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
};

/**
 * 路灯光晕管理器
 */
export const LampGlows: React.FC = () => {
  const glowTex = useMemo(() => createGlowTexture(), []);
  const coneTex = useMemo(() => createConeTexture(), []);

  return (
    <group>
      {LAMP_POSITIONS.map((pos, i) => (
        <LampGlowSprite
          key={i}
          position={pos}
          glowTex={glowTex}
          coneTex={coneTex}
          index={i}
        />
      ))}
    </group>
  );
};
