/**
 * 地面体积雾 — 类似 UE5 的 Exponential Height Fog
 * 使用噪声纹理 + 高度衰减，营造地面薄雾氛围
 */
import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// 生成噪声纹理
function createNoiseTexture(size = 64): THREE.DataTexture {
  const data = new Uint8Array(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    const val = Math.random() * 255;
    data[i * 4] = val;
    data[i * 4 + 1] = val;
    data[i * 4 + 2] = val;
    data[i * 4 + 3] = 255;
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.needsUpdate = true;
  return texture;
}

export const GroundFog: React.FC = () => {
  const meshRef = useRef<THREE.Mesh>(null);
  const noiseTexture = useMemo(() => createNoiseTexture(128), []);

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uNoiseTex: { value: noiseTexture },
    uColor: { value: new THREE.Color('#0a0a2a') },
    uFogDensity: { value: 0.15 },
    uHeightFalloff: { value: 2.0 },
  }), [noiseTexture]);

  useFrame((state) => {
    uniforms.uTime.value = state.clock.getElapsedTime() * 0.08;
  });

  return (
    <mesh
      ref={meshRef}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0.02, 0]}
    >
      <planeGeometry args={[60, 60, 1, 1]} />
      <shaderMaterial
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        vertexShader={`
          varying vec2 vUv;
          varying vec3 vWorldPos;
          void main() {
            vUv = uv;
            vec4 worldPos = modelMatrix * vec4(position, 1.0);
            vWorldPos = worldPos.xyz;
            gl_Position = projectionMatrix * viewMatrix * worldPos;
          }
        `}
        fragmentShader={`
          uniform float uTime;
          uniform sampler2D uNoiseTex;
          uniform vec3 uColor;
          uniform float uFogDensity;
          uniform float uHeightFalloff;

          varying vec2 vUv;
          varying vec3 vWorldPos;

          void main() {
            // 距离衰减
            float dist = length(vWorldPos.xz);
            float distFade = 1.0 - smoothstep(5.0, 40.0, dist);

            // 噪声扰动
            vec2 uv = vUv * 3.0 + uTime * 0.1;
            float noise1 = texture2D(uNoiseTex, uv).r;
            float noise2 = texture2D(uNoiseTex, uv * 2.0 - uTime * 0.05).r;
            float noise = (noise1 + noise2) * 0.5;

            // 高度衰减
            float heightFactor = exp(-vWorldPos.y * uHeightFalloff);

            // 最终雾密度
            float density = uFogDensity * noise * distFade * heightFactor;
            float alpha = clamp(density, 0.0, 0.35);

            gl_FragColor = vec4(uColor, alpha);
          }
        `}
      />
    </mesh>
  );
};
