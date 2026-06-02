import React from 'react';

interface StatsOverlayProps {
  worldId: string;
  agentCount: number;
  eventCount: number;
  dramaLevel: number;
  mode: 'cinematic' | 'immersive';
  onModeChange: (mode: 'cinematic' | 'immersive') => void;
  connected: boolean;
  worldTime: number;
  isSimulating: boolean;
  onToggleSimulation: () => void;
}

/** 格式化世界时间为 NYC 时区可读格式 */
const formatWorldTime = (timestamp: number): string => {
  return new Date(timestamp).toLocaleTimeString('zh-CN', {
    timeZone: 'America/New_York',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
};

export const StatsOverlay: React.FC<StatsOverlayProps> = ({
  worldId,
  agentCount,
  eventCount,
  dramaLevel,
  mode,
  onModeChange,
  connected,
  worldTime,
  isSimulating,
  onToggleSimulation,
}) => {
  return (
    <div className="absolute top-4 left-4 bg-gray-900/90 text-white p-4 rounded-xl shadow-xl border border-gray-700 min-w-56">
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-lg font-bold">Emergence World</h1>
        <div
          className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`}
          title={connected ? '已连接' : '未连接'}
        />
      </div>

      <div className="space-y-1.5 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-400">世界</span>
          <span>{worldId}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">智能体</span>
          <span className="text-blue-400">{agentCount}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">事件</span>
          <span className="text-yellow-400">{eventCount}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">戏剧等级</span>
          <span className="text-orange-400">{dramaLevel.toFixed(1)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">世界时间</span>
          <span className="text-cyan-400 font-mono text-xs">{formatWorldTime(worldTime)}</span>
        </div>
      </div>

      {/* 模拟控制 */}
      <div className="mt-3 flex gap-1">
        <button
          onClick={onToggleSimulation}
          className={`flex-1 text-xs py-1 rounded transition-colors ${
            isSimulating
              ? 'bg-emerald-600 text-white'
              : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
          }`}
          title={isSimulating ? '暂停模拟' : '恢复模拟'}
        >
          {isSimulating ? '⏸ 暂停' : '▶ 播放'}
        </button>
      </div>

      {/* 模式切换 */}
      <div className="mt-2 flex gap-1">
        <button
          onClick={() => onModeChange('cinematic')}
          className={`flex-1 text-xs py-1 rounded transition-colors ${
            mode === 'cinematic'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
          }`}
        >
          🎬 电影
        </button>
        <button
          onClick={() => onModeChange('immersive')}
          className={`flex-1 text-xs py-1 rounded transition-colors ${
            mode === 'immersive'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
          }`}
        >
          🎮 沉浸
        </button>
      </div>
    </div>
  );
};
