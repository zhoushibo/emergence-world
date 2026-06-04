/**
 * 天气系统 — 从 Zustand store 读取 weather 状态
 * 整合 RainSystem + WetGround + 大气色调偏移
 */
import React from 'react';
import { RainSystem, RainSplash } from './RainSystem';
import { WetGround } from './WetGround';
import { useStore } from '../../store/useStore';

export const WeatherSystem: React.FC = () => {
  const weather = useStore((s) => s.weather);
  const isRaining = weather === 'rain';

  if (!isRaining) return null;

  return (
    <group>
      <RainSystem count={2500} area={[55, 55]} height={18} wind={0.12} />
      <RainSplash count={80} area={[50, 50]} />
      <WetGround />
    </group>
  );
};
