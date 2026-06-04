/**
 * 环境粒子 — 漂浮发光粒子（萤火虫/尘埃）
 * 增强场景氛围感，类似 UE5 的 Niagara 粒子系统效果
 */
import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface AmbientParticlesProps {
  count?: number;
  radius?: number;
  heightRange?: [number, number];
  color?: string;
  size?: number;
  speed?: number;
}

export const AmbientParticles: React.FC<AmbientParticlesProps> = ({
  count = 200,
  radius = 28,
  heightRange = [0.5, 4.0],
  color = '#ffdd88',
  size = 0.06,
  speed = 0.3,
}) => {
  const ref = useRef<THREE.Points>(null);

  // 每个粒子的独立相位偏移
  const phases = useMemo(() => {
    const arr = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      arr[i] = Math.random() * Math.PI * 2;
    }
    return arr;
  }, [count]);

  // 每个粒子的速度偏移
  const velocities = useMemo(() => {
    const arr = new Float32Array(count * 2);
    for (let i = 0; i < count; i++) {
      arr[i * 2] = (Math.random() - 0.5) * 0.02;
      arr[i * 2 + 1] = (Math.random() - 0.5) * 0.02;
    }
    return arr;
  }, [count]);

  // 初始位置
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = Math.random() * radius;
      arr[i * 3] = Math.cos(angle) * r;
      arr[i * 3 + 1] = heightRange[0] + Math.random() * (heightRange[1] - heightRange[0]);
      arr[i * 3 + 2] = Math.sin(angle) * r;
    }
    return arr;
  }, [count, radius, heightRange]);

  const colorObj = useMemo(() => new THREE.Color(color), [color]);

  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.getElapsedTime() * speed;
    const pos = ref.current.geometry.attributes.position;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const phase = phases[i];
      const vx = velocities[i * 2];
      const vz = velocities[i * 2 + 1];

      // 缓慢飘移 + 正弦上下浮动
      pos.array[i3] += vx * 0.1;
      pos.array[i3 + 1] += Math.sin(t + phase) * 0.002;
      pos.array[i3 + 2] += vz * 0.1;

      // 边界环绕
      const x = pos.array[i3];
      const z = pos.array[i3 + 2];
      const dist = Math.sqrt(x * x + z * z);
      if (dist > radius) {
        pos.array[i3] = (x / dist) * (radius - 1);
        pos.array[i3 + 2] = (z / dist) * (radius - 1);
      }
    }
    pos.needsUpdate = true;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
          count={count}
        />
      </bufferGeometry>
      <pointsMaterial
        color={colorObj}
        size={size}
        transparent
        opacity={0.5}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  );
};
