import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

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
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[200, 200, 1, 1]} />
        <shaderMaterial
          ref={gridMaterialRef}
          args={[gridShader]}
          transparent={false}
        />
      </mesh>

      {[-15, -5, 5, 15, 22].map((z, i) => (
        <mesh
          key={`road-ew-${i}`}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0.02, z + 2.5]}
        >
          <planeGeometry args={[60, 3]} />
          <meshStandardMaterial
            color="#0d0d2b"
            roughness={0.7}
            metalness={0.3}
            emissive="#0a0a2a"
            emissiveIntensity={0.1}
          />
        </mesh>
      ))}

      {[-12, -4, 4, 12].map((x, i) => (
        <mesh
          key={`road-ns-${i}`}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[x, 0.02, 3.5]}
        >
          <planeGeometry args={[3, 60]} />
          <meshStandardMaterial
            color="#0d0d2b"
            roughness={0.7}
            metalness={0.3}
            emissive="#0a0a2a"
            emissiveIntensity={0.1}
          />
        </mesh>
      ))}

      <pointLight position={[-12, 0.5, -15]} intensity={0.3} color="#4466ff" distance={8} decay={2} />
      <pointLight position={[4, 0.5, -5]} intensity={0.3} color="#ff4488" distance={8} decay={2} />
      <pointLight position={[-4, 0.5, 5]} intensity={0.3} color="#44ffaa" distance={8} decay={2} />
      <pointLight position={[12, 0.5, 15]} intensity={0.3} color="#ffaa44" distance={8} decay={2} />
    </group>
  );
};
