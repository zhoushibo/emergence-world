/**
 * 城市地面 — 科幻网格 + 道路 + 车道标线
 */
import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// 道路位置（与 locations.ts 建筑布局对齐）
const ROAD_Z = [-17.5, -7.5, 2.5, 12.5, 19.5];  // 横向道路
const ROAD_X = [-14, -6, 2, 10];                  // 纵向道路
const BUILDING_X = [-12, -4, 4, 12];
const BUILDING_Z = [-15, -5, 5, 15, 22];

export const UECityGround: React.FC = () => {
  const gridMaterialRef = useRef<THREE.ShaderMaterial>(null);

  const gridShader = useMemo(() => ({
    uniforms: {
      uTime: { value: 0 },
      uColor1: { value: new THREE.Color('#0a0a1a') },
      uColor2: { value: new THREE.Color('#111133') },
      uGridColor: { value: new THREE.Color('#1a1a4a') },
      uFogColor: { value: new THREE.Color('#0a0a1a') },
      uFogNear: { value: 30.0 },
      uFogFar: { value: 120.0 },
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vWorldPos;
      void main() {
        vUv = uv;
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vWorldPos = worldPos.xyz;
        gl_Position = projectionMatrix * viewMatrix * worldPos;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uColor1;
      uniform vec3 uColor2;
      uniform vec3 uGridColor;
      uniform vec3 uFogColor;
      uniform float uFogNear;
      uniform float uFogFar;
      varying vec2 vUv;
      varying vec3 vWorldPos;

      void main() {
        float dist = length(vWorldPos.xz);
        float fog = smoothstep(uFogNear, uFogFar, dist);

        vec2 grid = abs(fract(vWorldPos.xz * 0.25 - 0.5) - 0.5);
        float gridLine = min(grid.x, grid.y);
        float gridMask = 1.0 - smoothstep(0.0, 0.03, gridLine);

        float pulse = 0.5 + 0.5 * sin(uTime * 0.3 - dist * 0.1);
        vec3 baseColor = mix(uColor1, uColor2, fog);
        vec3 gridCol = uGridColor * (0.6 + 0.4 * pulse);
        vec3 color = mix(baseColor, gridCol, gridMask * (1.0 - fog) * 0.7);

        color = mix(color, uFogColor, fog);
        gl_FragColor = vec4(color, 1.0);
      }
    `,
  }), []);

  useFrame((state) => {
    if (gridMaterialRef.current) {
      gridMaterialRef.current.uniforms.uTime.value = state.clock.getElapsedTime();
    }
  });

  return (
    <group>
      {/* 基础网格地面 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[200, 200, 1, 1]} />
        <shaderMaterial
          ref={gridMaterialRef}
          args={[gridShader]}
          transparent={false}
        />
      </mesh>

      {/* ── 横向道路（z 方向） ── */}
      {ROAD_Z.map((z, i) => (
        <React.Fragment key={`road-ew-${i}`}>
          {/* 路面 */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, z]}>
            <planeGeometry args={[60, 3]} />
            <meshStandardMaterial
              color="#0d0d2b"
              roughness={0.7}
              metalness={0.3}
              emissive="#0a0a2a"
              emissiveIntensity={0.1}
            />
          </mesh>
          {/* 车道线（中间虚线） */}
          {Array.from({ length: 6 }).map((_, j) => (
            <mesh
              key={`line-ew-${i}-${j}`}
              rotation={[-Math.PI / 2, 0, 0]}
              position={[-15 + j * 6, 0.03, z]}
            >
              <planeGeometry args={[2.5, 0.06]} />
              <meshBasicMaterial
                color="#334466"
                transparent
                opacity={0.5}
              />
            </mesh>
          ))}
        </React.Fragment>
      ))}

      {/* ── 纵向道路（x 方向） ── */}
      {ROAD_X.map((x, i) => (
        <React.Fragment key={`road-ns-${i}`}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.02, 3.5]}>
            <planeGeometry args={[3, 60]} />
            <meshStandardMaterial
              color="#0d0d2b"
              roughness={0.7}
              metalness={0.3}
              emissive="#0a0a2a"
              emissiveIntensity={0.1}
            />
          </mesh>
          {/* 车道线 */}
          {Array.from({ length: 6 }).map((_, j) => (
            <mesh
              key={`line-ns-${i}-${j}`}
              rotation={[-Math.PI / 2, 0, 0]}
              position={[x, 0.03, -12 + j * 6]}
            >
              <planeGeometry args={[0.06, 2.5]} />
              <meshBasicMaterial
                color="#334466"
                transparent
                opacity={0.5}
              />
            </mesh>
          ))}
        </React.Fragment>
      ))}

      {/* ── 交叉口斑马线 ── */}
      {ROAD_X.map((x) =>
        ROAD_Z.map((z, i) => (
          <mesh
            key={`crosswalk-${x}-${z}`}
            rotation={[-Math.PI / 2, 0, 0]}
            position={[x, 0.035, z]}
          >
            <planeGeometry args={[1.8, 0.15]} />
            <meshBasicMaterial
              color="#445577"
              transparent
              opacity={0.3}
            />
          </mesh>
        ))
      )}

      {/* ── 装饰性点光源（路口） ── */}
      <pointLight position={[-14, 0.5, -17.5]} intensity={0.3} color="#4466ff" distance={8} decay={2} />
      <pointLight position={[10, 0.5, -7.5]} intensity={0.3} color="#ff4488" distance={8} decay={2} />
      <pointLight position={[-6, 0.5, 12.5]} intensity={0.3} color="#44ffaa" distance={8} decay={2} />
      <pointLight position={[2, 0.5, 19.5]} intensity={0.3} color="#ffaa44" distance={8} decay={2} />
    </group>
  );
};
