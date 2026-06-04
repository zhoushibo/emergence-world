/**
 * 加载遮罩 — 在 3D 模型加载完成前显示
 * 使用 @react-three/drei 的 useProgress 跟踪 GLTF 加载进度
 */
import React, { useEffect, useState } from 'react';
import { useProgress } from '@react-three/drei';

export const LoaderOverlay: React.FC = () => {
  const { progress, active } = useProgress();
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (progress === 100 && !active) {
      // 加载完成后延迟 300ms 淡出
      const timer = setTimeout(() => setDone(true), 300);
      return () => clearTimeout(timer);
    }
  }, [progress, active]);

  // 加载完成后完全隐藏（不移除 DOM，避免闪烁）
  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#050510] transition-opacity duration-500 ${
        done ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Logo / 标题 */}
      <div className="mb-8 text-center">
        <div className="text-5xl mb-4">🌍</div>
        <h1 className="text-2xl font-bold text-white tracking-wide">
          Emergence World
        </h1>
        <p className="text-sm text-gray-500 mt-2">智能体模拟世界</p>
      </div>

      {/* 进度条 */}
      <div className="w-64 h-1.5 bg-gray-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${Math.max(progress, 5)}%` }}
        />
      </div>

      {/* 进度文字 */}
      <p className="text-xs text-gray-600 mt-3 font-mono">
        {progress < 100
          ? `加载中... ${Math.round(progress)}%`
          : '准备就绪'}
      </p>
    </div>
  );
};

/**
 * 场景内部的加载进度监听器（空组件，仅用于触发 useProgress）
 * 放在 Canvas 内部，LoaderOverlay 在 Canvas 外部读取同一进度
 */
export const ProgressReporter: React.FC = () => {
  return null;
};
