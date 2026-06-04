/**
 * 湿地面着色器 — 模拟雨后地面积水反射
 * 覆盖在 CityGround 之上，产生湿润反光 + 水面涟漪
 */
import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// 生成涟漪法线纹理
function createRippleTexture(size = 128): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // 随机多点涟漪
  const imageData = ctx.createImageData(size, size);
  for (let i = 0; i < 30; i++) {
    const cx = Math.random() * size;
    const cy = Math.random() * size;
    const r = 5 + Math.random() * 15;
    const amp = 30 + Math.random() * 60;

    for (let x = 0; x < size; x++) {
      for (let y = 0; y < size; y++) {
        const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
        if (dist < r) {
          const idx = (y * size + x) * 4;
          const val = Math.sin(dist * Math.PI / r) * amp;
          imageData.data[idx] = Math.min(255, imageData.data[idx] + 128 + val);
          imageData.data[idx + 1] = Math.min(255, imageData.data[idx + 1] + 128 + val);
          imageData.data[idx + 2] = 255;
          imageData.data[idx + 3] = 255;
        }
      }
    }
  }
  ctx.putImageData(imageData, 0, 0);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 4);
  tex.needsUpdate = true;
  return tex;
}

export const WetGround: React.FC = () => {
  const meshRef = useRef<THREE.Mesh>(null);
  const rippleTex = useMemo(() => createRippleTexture(), []);

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uRippleTex: { value: rippleTex },
    uWetness: { value: 0.6 },            // 湿润度 0~1
    uWaterColor: { value: new THREE.Color('#0a122a') },
    uReflectionIntensity: { value: 0.3 },
  }), [rippleTex]);

  useFrame((state) => {
    uniforms.uTime.value = state.clock.getElapsedTime() * 0.5;
  });

  return (
    <mesh
      ref={meshRef}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0.03, 0]}
    >
      <planeGeometry args={[50, 50, 1, 1]} />
      <shaderMaterial
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.NormalBlending}
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
          uniform sampler2D uRippleTex;
          uniform float uWetness;
          uniform vec3 uWaterColor;
          uniform float uReflectionIntensity;

          varying vec2 vUv;
          varying vec3 vWorldPos;

          void main() {
            // 涟漪采样（随时间流动）
            vec2 rippleUV = vUv * 3.0 + uTime * 0.05;
            vec2 rippleUV2 = vUv * 2.0 - uTime * 0.03;

            float ripple = texture2D(uRippleTex, rippleUV).r / 255.0;
            float ripple2 = texture2D(uRippleTex, rippleUV2).g / 255.0;
            float combinedRipple = (ripple + ripple2) * 0.5;

            // 距离衰减（近处反射强，远处弱）
            float dist = length(vWorldPos.xz);
            float distFade = 1.0 - smoothstep(5.0, 35.0, dist);

            // 水面反光
            float reflection = combinedRipple * uReflectionIntensity * distFade;

            // 在水洼处有更强的反射
            float puddle = smoothstep(0.4, 0.6, combinedRipple);
            float wetFade = distFade * uWetness;

            // 路面颜色（深色湿路）
            vec3 wetColor = mix(
              vec3(0.02, 0.02, 0.05),    // 干路面
              uWaterColor,                 // 湿路面
              wetFade * 0.5
            );

            // 高光反射（模拟雨水反光）
            vec3 specColor = vec3(0.3, 0.4, 0.6) * reflection * 2.0;

            // 微弱的发光
            float glow = 0.02 + combinedRipple * 0.03 * wetFade;
            vec3 glowColor = vec3(0.1, 0.15, 0.3) * glow;

            vec3 finalColor = wetColor + specColor + glowColor;

            float alpha = wetFade * 0.8 + 0.2;
            gl_FragColor = vec4(finalColor, alpha);
          }
        `}
      />
    </mesh>
  );
};
