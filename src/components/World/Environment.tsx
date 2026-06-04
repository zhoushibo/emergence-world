/**
 * 天空、大气、环境贴图、灯光系统
 * 完全由 Zustand store 中的 timeOfDay 和 weather 控制
 */
import React, { useRef } from 'react';
import { Environment } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { CustomAtmosphere } from './CustomAtmosphere';
import { useStore } from '../../store/useStore';

export const UESkyAndAtmosphere: React.FC = () => {
  const dirLightRef = useRef<THREE.DirectionalLight>(null);
  const ambientRef = useRef<THREE.AmbientLight>(null);
  const hemiRef = useRef<THREE.HemisphereLight>(null);

  const timeOfDay = useStore((s) => s.timeOfDay);
  const weather = useStore((s) => s.weather);
  const isRaining = weather === 'rain';

  // 时段参数
  const sunHeights: Record<string, number> = { day: 25, dusk: 5, night: -5 };
  const sunHeight = sunHeights[timeOfDay] ?? 25;
  const isNight = timeOfDay === 'night';
  const isDusk = timeOfDay === 'dusk';

  useFrame((state) => {
    if (dirLightRef.current) {
      const t = state.clock.getElapsedTime() * 0.02;
      // 固定太阳高度，水平缓慢旋转
      dirLightRef.current.position.set(
        Math.cos(t) * 30,
        sunHeight,
        Math.sin(t) * 30,
      );

      // 根据时段和天气调整灯光
      let intensity = isNight ? 0.3 : isDusk ? 1.2 : 2.2;
      let color = '#ffeedd';
      if (isNight) { color = '#223355'; }
      else if (isDusk) { color = '#ff8844'; }
      else if (isRaining) { color = '#bbccdd'; intensity *= 0.7; }

      dirLightRef.current.intensity = intensity;
      dirLightRef.current.color.setHex(parseInt(color.replace('#', '0x')));
    }
    if (ambientRef.current) {
      ambientRef.current.intensity = isNight ? 0.08 : isRaining ? 0.25 : 0.2;
      ambientRef.current.color.setHex(isNight ? 0x112244 : isRaining ? 0x4466aa : 0x4466aa);
    }
    if (hemiRef.current) {
      hemiRef.current.color.setHex(isNight ? 0x112244 : isRaining ? 0x8899bb : 0xb1e1ff);
      hemiRef.current.groundColor.setHex(isNight ? 0x050510 : isRaining ? 0x0a1122 : 0x1a0a2e);
      hemiRef.current.intensity = isNight ? 0.15 : 0.4;
    }
  });

  return (
    <>
      <CustomAtmosphere />

      {/* 阴云层（雨天） */}
      {isRaining && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 18, 0]}>
          <planeGeometry args={[80, 80]} />
          <meshBasicMaterial color="#0a1122" transparent opacity={0.25} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      )}

      {/* 雾 */}
      <fog
        attach="fog"
        args={[
          isNight ? '#050510' : isRaining ? '#080818' : '#0a0a1a',
          isNight ? 25 : isRaining ? 25 : 40,
          isNight ? 70 : isRaining ? 100 : 150,
        ]}
      />

      {/* HDR 环境贴图 */}
      <Environment files="/textures/env.hdr" background={false} blur={0.2} intensity={isNight ? 0.15 : isRaining ? 0.3 : 0.6} />

      <ambientLight ref={ambientRef} intensity={0.2} color="#4466aa" />

      <directionalLight
        ref={dirLightRef}
        position={[30, sunHeight, 20]}
        intensity={isNight ? 0.3 : 1.8}
        color={isNight ? '#223355' : '#ffeedd'}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={100}
        shadow-camera-left={-40}
        shadow-camera-right={40}
        shadow-camera-top={40}
        shadow-camera-bottom={-40}
        shadow-bias={-0.0005}
        shadow-normalBias={0.02}
      />

      <pointLight position={[0, 15, 0]} intensity={isNight ? 0.2 : isRaining ? 0.5 : 1.0} color="#6644ff" distance={60} decay={2} />
      <pointLight position={[-20, 8, -15]} intensity={isNight ? 0.1 : isRaining ? 0.3 : 0.6} color="#ff4488" distance={40} decay={2} />
      <pointLight position={[20, 8, 15]} intensity={isNight ? 0.1 : isRaining ? 0.3 : 0.6} color="#44aaff" distance={40} decay={2} />

      <hemisphereLight ref={hemiRef} args={['#b1e1ff', '#1a0a2e', 0.3]} />
    </>
  );
};
