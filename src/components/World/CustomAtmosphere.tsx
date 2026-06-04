/**
 * 自定义大气天空着色器 — 类似 UE5 的 Sky Atmosphere
 * 多层颜色渐变 + 动态太阳辉光 + 星空闪烁
 */
import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore } from '../../store/useStore';

export const CustomAtmosphere: React.FC = () => {
  const meshRef = useRef<THREE.Mesh>(null);
  const timeOfDay = useStore((s) => s.timeOfDay);

  // ─── 时段参数 ──────────────────────────────────────────────
  // day:    太阳在头顶，天空蓝色，星星隐藏
  // dusk:   太阳在地平线，天空橙红，星星微弱
  // night:  太阳在背面，天空深蓝，星星明亮
  const sunAngles: Record<string, number> = { day: 0.6, dusk: 0.12, night: -0.15 };
  const sunAngle = sunAngles[timeOfDay] ?? 0.5;

  // 生成星空纹理
  const starTexture = useMemo(() => {
    const size = 256;
    const data = new Uint8Array(size * size * 4);
    for (let i = 0; i < size * size; i++) {
      const brightness = Math.random();
      // 大部分像素暗，少数亮（星星）
      const val = brightness > 0.98 ? Math.floor(brightness * 255) : 0;
      data[i * 4] = val;
      data[i * 4 + 1] = val;
      data[i * 4 + 2] = val;
      data[i * 4 + 3] = val > 0 ? 255 : 0;
    }
    const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
    tex.needsUpdate = true;
    return tex;
  }, []);

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uSunDirection: { value: new THREE.Vector3(0.3, 0.5, 0.8).normalize() },
    uTopColor: { value: new THREE.Color('#0a0a2a') },
    uMidColor: { value: new THREE.Color('#1a1a4a') },
    uHorizonColor: { value: new THREE.Color('#2a1a3a') },
    uSunColor: { value: new THREE.Color('#ffaa44') },
    uStarTex: { value: starTexture },
    uStarBrightness: { value: 0.3 },
  }), [starTexture]);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    uniforms.uTime.value = t;

    // ─── 根据时段固定太阳位置 ──────────────────────────────
    let sunY: number;
    let dayFactor: number;
    let starBright: number;

    switch (timeOfDay) {
      case 'day':
        sunY = 0.55;
        dayFactor = 1.0;
        starBright = 0.0;
        break;
      case 'dusk':
        sunY = 0.08;
        dayFactor = 0.35;
        starBright = 0.2;
        break;
      case 'night':
        sunY = -0.1;
        dayFactor = 0.0;
        starBright = 0.9;
        break;
      default:
        sunY = 0.5;
        dayFactor = 1.0;
        starBright = 0.0;
    }

    uniforms.uSunDirection.value.set(0.3, sunY, 0.8).normalize();

    // ─── 天空颜色 ──────────────────────────────────────────
    // 白天 → 蓝色调，黄昏 → 橙红调，夜晚 → 深蓝
    const topR = 0.02 + dayFactor * 0.10;
    const topG = 0.02 + dayFactor * 0.14;
    const topB = 0.12 + dayFactor * 0.14;
    uniforms.uTopColor.value.setRGB(topR, topG, topB);

    const horR = 0.06 + dayFactor * 0.30 + (1 - dayFactor) * 0.20;
    const horG = 0.04 + dayFactor * 0.18 + (1 - dayFactor) * 0.06;
    const horB = 0.08 + dayFactor * 0.12;
    uniforms.uHorizonColor.value.setRGB(horR, horG, horB);

    // 星星亮度
    uniforms.uStarBrightness.value = starBright;

    // 太阳颜色 — 黄昏最橙，夜晚消失
    if (timeOfDay === 'night') {
      uniforms.uSunColor.value.setRGB(0.1, 0.05, 0.2);
    } else if (timeOfDay === 'dusk') {
      uniforms.uSunColor.value.setRGB(1.0, 0.5, 0.15);
    } else {
      uniforms.uSunColor.value.setRGB(1.0, 0.85, 0.6);
    }
  });

  return (
    <mesh ref={meshRef}>
      {/* 巨大的天空球 */}
      <sphereGeometry args={[500, 32, 32]} />
      <shaderMaterial
        side={THREE.BackSide}
        depthWrite={false}
        uniforms={uniforms}
        vertexShader={`
          varying vec3 vDirection;
          varying vec3 vPosition;
          void main() {
            vec4 worldPos = modelMatrix * vec4(position, 1.0);
            vPosition = worldPos.xyz;
            vDirection = normalize(position);
            gl_Position = projectionMatrix * viewMatrix * worldPos;
          }
        `}
        fragmentShader={`
          uniform vec3 uSunDirection;
          uniform vec3 uTopColor;
          uniform vec3 uMidColor;
          uniform vec3 uHorizonColor;
          uniform vec3 uSunColor;
          uniform sampler2D uStarTex;
          uniform float uStarBrightness;
          uniform float uTime;

          varying vec3 vDirection;
          varying vec3 vPosition;

          void main() {
            vec3 dir = normalize(vDirection);
            float y = dir.y;

            // 天顶 = top, 地平线 = horizon
            float horizonFactor = 1.0 - abs(y);
            float topFactor = 1.0 - horizonFactor;

            // 天空颜色：天顶 → 中间 → 地平线渐变
            vec3 skyColor = mix(uTopColor, uMidColor, horizonFactor * 0.5);
            skyColor = mix(skyColor, uHorizonColor, horizonFactor * horizonFactor * 0.6);

            // 太阳辉光
            float sunDot = max(dot(dir, uSunDirection), 0.0);
            float sunGlow = pow(sunDot, 80.0) * 2.0;
            float sunHalo = pow(sunDot, 8.0) * 0.3;
            vec3 sunGlowColor = uSunColor * (sunGlow + sunHalo);

            // 地平线暖色带
            float horizonBand = exp(-abs(y) * 15.0) * 0.4;
            vec3 horizonGlow = vec3(0.8, 0.3, 0.1) * horizonBand * (1.0 - topFactor);

            // 星空（仅在头顶区域可见）
            float starVis = smoothstep(0.0, 0.3, y);
            vec2 starUV = dir.xz * 0.5 + 0.5;
            float stars = texture2D(uStarTex, starUV * 20.0 + uTime * 0.001).r;
            float starAlpha = stars * starVis * uStarBrightness;
            vec3 starColor = vec3(1.0) * starAlpha;

            // 闪烁星星
            float twinkle = sin(dir.x * 100.0 + dir.y * 50.0 + dir.z * 80.0 + uTime * 2.0) * 0.5 + 0.5;
            starColor *= (0.7 + 0.3 * twinkle);

            // 合成最终颜色
            vec3 finalColor = skyColor + sunGlowColor + horizonGlow + starColor;

            // 底部暗化（地面以下）
            float groundFade = smoothstep(0.0, -0.05, y);
            finalColor *= (1.0 - groundFade * 0.8);

            gl_FragColor = vec4(finalColor, 1.0);
          }
        `}
      />
    </mesh>
  );
};
