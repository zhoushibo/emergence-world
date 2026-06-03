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
    <div className="absolute top-4 left-4 min-w-60 pointer-events-auto">
      <div className="relative bg-[#050510]/85 backdrop-blur-xl text-white p-4 rounded-lg border border-cyan-500/30 shadow-[0_0_20px_rgba(0,255,255,0.15),inset_0_0_30px_rgba(0,255,255,0.05)]">
        <div className="absolute inset-0 rounded-lg overflow-hidden pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-purple-500/5" />
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent" />
        </div>

        <div className="relative z-10">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-lg font-bold tracking-wider bg-gradient-to-r from-cyan-300 to-purple-300 bg-clip-text text-transparent">
              EMERGENCE
            </h1>
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.8)]' : 'bg-red-400 shadow-[0_0_8px_rgba(239,68,68,0.8)]'}`}
                title={connected ? '已连接' : '未连接'}
              />
              <span className="text-[10px] text-cyan-400/60 font-mono uppercase tracking-widest">
                {connected ? 'Online' : 'Offline'}
              </span>
            </div>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-cyan-400/50 text-xs uppercase tracking-wider">World</span>
              <span className="font-mono text-cyan-200 text-xs">{worldId}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-cyan-400/50 text-xs uppercase tracking-wider">Agents</span>
              <span className="text-cyan-300 font-mono font-bold">{agentCount}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-cyan-400/50 text-xs uppercase tracking-wider">Events</span>
              <span className="text-yellow-300 font-mono font-bold">{eventCount}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-cyan-400/50 text-xs uppercase tracking-wider">Drama</span>
              <div className="flex items-center gap-2">
                <div className="w-16 h-1.5 bg-cyan-900/50 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-purple-400"
                    style={{ width: `${dramaLevel * 100}%` }}
                  />
                </div>
                <span className="text-orange-300 font-mono text-xs">{dramaLevel.toFixed(1)}</span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-cyan-400/50 text-xs uppercase tracking-wider">Time</span>
              <span className="text-cyan-200 font-mono text-xs">{formatWorldTime(worldTime)}</span>
            </div>
          </div>

          <div className="mt-3 flex gap-1.5">
            <button
              onClick={onToggleSimulation}
              className={`flex-1 text-xs py-1.5 rounded transition-all font-mono tracking-wider ${
                isSimulating
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_10px_rgba(0,255,255,0.2)]'
                  : 'bg-gray-800/50 text-gray-500 border border-gray-700/50 hover:bg-gray-700/50'
              }`}
            >
              {isSimulating ? '⏸ PAUSE' : '▶ PLAY'}
            </button>
          </div>

          <div className="mt-2 flex gap-1.5">
            <button
              onClick={() => onModeChange('cinematic')}
              className={`flex-1 text-xs py-1.5 rounded transition-all font-mono tracking-wider ${
                mode === 'cinematic'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-[0_0_10px_rgba(168,85,247,0.2)]'
                  : 'bg-gray-800/50 text-gray-500 border border-gray-700/50 hover:bg-gray-700/50'
              }`}
            >
              CINEMATIC
            </button>
            <button
              onClick={() => onModeChange('immersive')}
              className={`flex-1 text-xs py-1.5 rounded transition-all font-mono tracking-wider ${
                mode === 'immersive'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-[0_0_10px_rgba(168,85,247,0.2)]'
                  : 'bg-gray-800/50 text-gray-500 border border-gray-700/50 hover:bg-gray-700/50'
              }`}
            >
              IMMERSIVE
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
