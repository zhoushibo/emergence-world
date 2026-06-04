/**
 * 城市交通 — 程序化生成汽车（不依赖 GLB 加载）
 */
import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const ROAD_Z = [-17.5, -7.5, 2.5, 12.5, 19.5];
const ROAD_X = [-14, -6, 2, 10];
const CAR_COLORS = ['#2266cc','#cc2244','#22aa66','#cc8822','#8822cc','#44aacc','#aa4466','#dd6644','#448844','#6666bb'];

// 简单盒型轿车
function CarModel({ color }: { color: string }) {
  return (
    <group scale={[0.5, 0.5, 0.5]}>
      {/* body */}
      <mesh position={[0, 0.15, 0]} castShadow>
        <boxGeometry args={[1.6, 0.28, 0.75]} />
        <meshStandardMaterial color={color} roughness={0.3} metalness={0.6} />
      </mesh>
      {/* cabin */}
      <mesh position={[0.05, 0.36, 0]} castShadow>
        <boxGeometry args={[0.8, 0.18, 0.65]} />
        <meshStandardMaterial color="#4488cc" roughness={0.1} metalness={0.3} emissive="#113355" emissiveIntensity={0.4} />
      </mesh>
      {/* headlights */}
      <mesh position={[0.75, 0.15, 0.32]}>
        <planeGeometry args={[0.1, 0.12]} />
        <meshBasicMaterial color="#ffffaa" toneMapped={false} />
      </mesh>
      <mesh position={[0.75, 0.15, -0.32]}>
        <planeGeometry args={[0.1, 0.12]} />
        <meshBasicMaterial color="#ffffaa" toneMapped={false} />
      </mesh>
      {/* taillights */}
      <mesh position={[-0.75, 0.15, 0.32]}>
        <planeGeometry args={[0.08, 0.1]} />
        <meshBasicMaterial color="#ff2222" toneMapped={false} />
      </mesh>
      <mesh position={[-0.75, 0.15, -0.32]}>
        <planeGeometry args={[0.08, 0.1]} />
        <meshBasicMaterial color="#ff2222" toneMapped={false} />
      </mesh>
      {/* wheels */}
      {[[0.5,0.4,0.2],[0.5,-0.4,0.2],[-0.5,0.4,0.2],[-0.5,-0.4,0.2]].map(([x,z,y], i) => (
        <mesh key={i} position={[x, y, z]} rotation={[0, 0, Math.PI/2]}>
          <cylinderGeometry args={[0.1, 0.1, 0.08, 8]} />
          <meshStandardMaterial color="#111" roughness={0.8} />
        </mesh>
      ))}
    </group>
  );
}

// 公交车
function BusModel() {
  return (
    <group scale={[0.5, 0.5, 0.5]}>
      <mesh position={[0, 0.35, 0]} castShadow>
        <boxGeometry args={[2.4, 0.5, 0.8]} />
        <meshStandardMaterial color="#ffaa22" roughness={0.3} metalness={0.5} />
      </mesh>
      {/* windows */}
      {[0.6, -0.6, 0].map((z, i) => (
        <mesh key={i} position={[0, 0.35, z]}>
          <boxGeometry args={[2.2, 0.25, 0.55]} />
          <meshStandardMaterial color="#88ccff" roughness={0.1} emissive="#224466" emissiveIntensity={0.3} />
        </mesh>
      ))}
      {/* wheels */}
      {[[0.8,0.42,0.2],[0.8,-0.42,0.2],[-0.8,0.42,0.2],[-0.8,-0.42,0.2]].map(([x,z,y], i) => (
        <mesh key={i} position={[x, y, z]} rotation={[0, 0, Math.PI/2]}>
          <cylinderGeometry args={[0.14, 0.14, 0.1, 8]} />
          <meshStandardMaterial color="#111" roughness={0.8} />
        </mesh>
      ))}
    </group>
  );
}

export const TrafficSystem: React.FC = () => {
  const cars = useMemo(() => {
    const arr: { ew: boolean; road: number; lane: -1|1; offset: number; speed: number; bus: boolean; color: string }[] = [];
    for (let i = 0; i < 30; i++) {
      const ew = Math.random() > 0.5;
      arr.push({
        ew,
        road: Math.floor(Math.random() * (ew ? ROAD_Z.length : ROAD_X.length)),
        lane: Math.random() > 0.5 ? 1 : -1,
        offset: Math.random(),
        speed: 0.02 + Math.random() * 0.03,
        bus: Math.random() < 0.15,
        color: CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)],
      });
    }
    return arr;
  }, []);

  const groups = useRef<THREE.Group[]>([]);

  useFrame((s) => {
    const t = s.clock.getElapsedTime();
    for (let i = 0; i < groups.current.length; i++) {
      const g = groups.current[i];
      const c = cars[i];
      if (!g || !c) continue;
      const p = ((c.offset + t * c.speed * c.lane) % 1 + 1) % 1;
      const pos = p * 40 - 20;
      if (c.ew) {
        g.position.set(pos, 0.25, ROAD_Z[c.road]);
        g.rotation.set(0, c.lane > 0 ? 0 : Math.PI, 0);
      } else {
        g.position.set(ROAD_X[c.road], 0.25, pos);
        g.rotation.set(0, c.lane > 0 ? Math.PI / 2 : -Math.PI / 2, 0);
      }
    }
    // Set a flag anytime we update to avoid react re-render
    groups.current.forEach((g) => { g.matrixAutoUpdate = true; });
  });

  return (
    <group>
      {cars.map((c, i) => {
        const Model = c.bus ? BusModel : CarModel;
        return (
          <group
            key={i}
            ref={(el) => { if (el) groups.current[i] = el; }}
          >
            <Model color={c.color} />
          </group>
        );
      })}
    </group>
  );
};
