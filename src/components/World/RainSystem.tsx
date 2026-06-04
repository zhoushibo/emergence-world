/**
 * 下雨粒子系统 — 斜落的雨线
 * 2500 条动态雨线，受风力影响产生倾斜
 */
import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface RainProps {
  count?: number;
  area?: [number, number]; // width, depth
  height?: number;
  wind?: number; // 风向偏转 -1~1
}

export const RainSystem: React.FC<RainProps> = ({
  count = 2500,
  area = [50, 50],
  height = 15,
  wind = 0.15,
}) => {
  const meshRef = useRef<THREE.Points>(null);

  // 每帧更新位置数据
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * area[0];
      arr[i * 3 + 1] = Math.random() * height;
      arr[i * 3 + 2] = (Math.random() - 0.5) * area[1];
    }
    return arr;
  }, [count, area, height]);

  // 雨滴速度（每滴略微不同）
  const speeds = useMemo(() => {
    const arr = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      arr[i] = 8 + Math.random() * 6; // 8-14 m/s 下落速度
    }
    return arr;
  }, [count]);

  // 雨滴长度
  const lengths = useMemo(() => {
    const arr = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      arr[i] = 0.15 + Math.random() * 0.2; // 雨滴拉长度
    }
    return arr;
  }, [count]);

  useFrame((state, delta) => {
    if (!meshRef.current) return;
    const pos = meshRef.current.geometry.attributes.position;
    const dt = Math.min(delta, 0.05);

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      // 下落
      pos.array[i3 + 1] -= speeds[i] * dt;
      // 风力偏斜
      pos.array[i3] += wind * dt * 2;

      // 到达底部后重置到顶部
      if (pos.array[i3 + 1] < -2) {
        pos.array[i3] = (Math.random() - 0.5) * area[0];
        pos.array[i3 + 1] = height + Math.random() * 3;
        pos.array[i3 + 2] = (Math.random() - 0.5) * area[1];
      }
    }
    pos.needsUpdate = true;
  });

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
          count={count}
        />
      </bufferGeometry>
      <pointsMaterial
        color="#aabbdd"
        size={0.04}
        transparent
        opacity={0.35}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  );
};

/**
 * 雨滴溅射粒子 — 地面碰撞效果
 */
export const RainSplash: React.FC<{
  count?: number;
  area?: [number, number];
}> = ({ count = 80, area = [50, 50] }) => {
  const ref = useRef<THREE.Points>(null);

  const data = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const life = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * area[0];
      pos[i * 3 + 1] = 0.02;
      pos[i * 3 + 2] = (Math.random() - 0.5) * area[1];
      life[i] = Math.random();
    }
    return { positions: pos, lifetimes: life };
  }, [count, area]);

  useFrame((state, delta) => {
    if (!ref.current) return;
    const pos = ref.current.geometry.attributes.position;
    const dt = Math.min(delta, 0.05);

    for (let i = 0; i < count; i++) {
      data.lifetimes[i] -= dt * (2 + Math.random());
      if (data.lifetimes[i] <= 0) {
        // 重置溅射
        pos.array[i * 3] = (Math.random() - 0.5) * area[0];
        pos.array[i * 3 + 1] = 0.02 + Math.random() * 0.1;
        pos.array[i * 3 + 2] = (Math.random() - 0.5) * area[1];
        data.lifetimes[i] = 0.3 + Math.random() * 0.5;
      }
    }
    pos.needsUpdate = true;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[data.positions, 3]}
          count={count}
        />
      </bufferGeometry>
      <pointsMaterial
        color="#99bbee"
        size={0.03}
        transparent
        opacity={0.4}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  );
};
