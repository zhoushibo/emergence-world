import React from 'react';
import type { SkillExecution, ModelTier, SkillExecutionStatus } from '../../services/types';

interface SkillExecutionPanelProps {
  executions: SkillExecution[];
  maxDisplay?: number;
}

const STATUS_ICON: Record<SkillExecutionStatus, string> = {
  pending: '⏳',
  running: '⚡',
  completed: '✅',
  failed: '❌',
};

const STATUS_LABEL: Record<SkillExecutionStatus, string> = {
  pending: '等待中',
  running: '执行中',
  completed: '已完成',
  failed: '失败',
};

const TIER_ACCENT: Record<ModelTier, { text: string; bg: string; border: string; glow: string }> = {
  L0: { text: 'text-gray-400', bg: 'bg-gray-500/10', border: 'border-gray-600/40', glow: 'shadow-[0_0_8px_rgba(156,163,175,0.15)]' },
  L1: { text: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-600/40', glow: 'shadow-[0_0_8px_rgba(74,222,128,0.15)]' },
  L2: { text: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-600/40', glow: 'shadow-[0_0_8px_rgba(34,211,238,0.15)]' },
  L3: { text: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-600/40', glow: 'shadow-[0_0_8px_rgba(168,85,247,0.15)]' },
};

const TIER_PROGRESS: Record<ModelTier, string> = {
  L0: 'bg-gray-400',
  L1: 'bg-green-500',
  L2: 'bg-cyan-500',
  L3: 'bg-purple-500',
};

const truncate = (str: string, maxLen: number): string => {
  if (!str) return '';
  return str.length > maxLen ? str.slice(0, maxLen) + '…' : str;
};

const formatDuration = (startTime: number, endTime: number | null): string => {
  const end = endTime ?? Date.now();
  const ms = end - startTime;
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60_000).toFixed(1)}m`;
};

const getRunningProgress = (startTime: number): number => {
  const elapsed = Date.now() - startTime;
  const progress = Math.min(90, (elapsed / 30_000) * 90);
  return Math.round(progress);
};

interface SkillCardProps {
  execution: SkillExecution;
}

const SkillCard: React.FC<SkillCardProps> = ({ execution }) => {
  const { skillName, modelTier, status, input, output, startTime, endTime, error } = execution;
  const isRunning = status === 'running';
  const isFailed = status === 'failed';
  const accent = TIER_ACCENT[modelTier];

  return (
    <div className={`rounded-lg border px-3 py-2.5 text-sm transition-all backdrop-blur-sm ${
      isFailed
        ? 'bg-red-900/20 border-red-500/30 shadow-[0_0_10px_rgba(239,68,68,0.15)]'
        : `${accent.bg} ${accent.border} ${accent.glow}`
    }`}>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <span className="shrink-0">{STATUS_ICON[status]}</span>
          <span className="truncate font-medium text-cyan-100 font-mono text-xs" title={skillName}>
            {skillName}
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0 ml-2">
          <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${accent.bg} ${accent.text} border ${accent.border}`}>
            {modelTier}
          </span>
        </div>
      </div>

      {isRunning && (
        <div className="mb-2">
          <div className="w-full bg-cyan-900/30 rounded-full h-1 overflow-hidden">
            <div
              className={`h-1 rounded-full ${TIER_PROGRESS[modelTier]} shadow-[0_0_6px_rgba(0,255,255,0.3)]`}
              style={{ width: `${getRunningProgress(startTime)}%` }}
            />
          </div>
        </div>
      )}

      {input && (
        <div className="mb-1">
          <span className="text-[10px] text-cyan-500/40 uppercase tracking-wider">Input</span>
          <p className="text-xs text-cyan-200/60 mt-0.5 font-mono leading-relaxed">
            {truncate(input, 60)}
          </p>
        </div>
      )}

      {status === 'completed' && output && (
        <div className="mb-1">
          <span className="text-[10px] text-green-500/40 uppercase tracking-wider">Output</span>
          <p className="text-xs text-green-300/70 mt-0.5 font-mono leading-relaxed">
            {truncate(output, 60)}
          </p>
        </div>
      )}

      {isFailed && error && (
        <div className="mb-1 bg-red-900/30 rounded px-2 py-1 border border-red-500/20">
          <p className="text-xs text-red-300 font-mono leading-relaxed">{truncate(error, 60)}</p>
        </div>
      )}

      <div className="flex items-center justify-between mt-1.5">
        <span className={`text-[10px] uppercase tracking-wider ${isFailed ? 'text-red-400' : 'text-cyan-500/40'}`}>
          {STATUS_LABEL[status]}
        </span>
        <span className="text-[10px] text-cyan-500/40 font-mono">
          {formatDuration(startTime, endTime)}
        </span>
      </div>
    </div>
  );
};

export const SkillExecutionPanel: React.FC<SkillExecutionPanelProps> = ({
  executions,
  maxDisplay = 5,
}) => {
  const visibleExecutions = [...executions]
    .sort((a, b) => b.startTime - a.startTime)
    .slice(0, maxDisplay);

  const runningCount = executions.filter((e) => e.status === 'running').length;
  const totalCount = executions.length;

  if (visibleExecutions.length === 0) return null;

  return (
    <div className="absolute top-4 left-72 w-80 flex flex-col gap-2 pointer-events-auto">
      <div className="bg-[#050510]/85 backdrop-blur-xl text-white px-3 py-2 rounded-lg border border-cyan-500/20 shadow-[0_0_15px_rgba(0,255,255,0.1)]">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold font-mono tracking-wider text-cyan-300">SKILL EXEC</h3>
          <div className="flex items-center gap-2 text-xs text-cyan-400/50">
            {runningCount > 0 && (
              <span className="flex items-center gap-1">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_6px_rgba(0,255,255,0.6)]" />
                {runningCount} active
              </span>
            )}
            <span className="font-mono">{totalCount}</span>
          </div>
        </div>
      </div>

      {visibleExecutions.map((exec) => (
        <SkillCard key={exec.id} execution={exec} />
      ))}

      {totalCount > maxDisplay && (
        <div className="text-[10px] text-cyan-500/30 text-center font-mono uppercase tracking-wider">
          +{totalCount - maxDisplay} more
        </div>
      )}
    </div>
  );
};
