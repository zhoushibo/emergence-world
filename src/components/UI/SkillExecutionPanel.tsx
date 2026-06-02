import React from 'react';
import type { SkillExecution, ModelTier, SkillExecutionStatus } from '../../services/types';

// ============================================================
// SkillExecutionPanel — Skill 扥行进度可视化面板
// absolute 定位在 3D Canvas 之上，左上角统计面板右侧
// ============================================================

interface SkillExecutionPanelProps {
  executions: SkillExecution[];
  maxDisplay?: number;
}

// --- 状态图标映射 ---
const STATUS_ICON: Record<SkillExecutionStatus, string> = {
  pending: '⏳',
  running: '⚡',
  completed: '✅',
  failed: '❌',
};

// --- 状态标签映射 ---
const STATUS_LABEL: Record<SkillExecutionStatus, string> = {
  pending: '等待中',
  running: '执行中',
  completed: '已完成',
  failed: '失败',
};

// --- 模型层级颜色 ---
const TIER_TEXT_COLOR: Record<ModelTier, string> = {
  L0: 'text-gray-400',
  L1: 'text-green-400',
  L2: 'text-blue-400',
  L3: 'text-purple-400',
};

const TIER_BG_COLOR: Record<ModelTier, string> = {
  L0: 'bg-gray-500/20',
  L1: 'bg-green-500/20',
  L2: 'bg-blue-500/20',
  L3: 'bg-purple-500/20',
};

const TIER_BORDER_COLOR: Record<ModelTier, string> = {
  L0: 'border-gray-600',
  L1: 'border-green-600',
  L2: 'border-blue-600',
  L3: 'border-purple-600',
};

const TIER_PROGRESS_COLOR: Record<ModelTier, string> = {
  L0: 'bg-gray-400',
  L1: 'bg-green-500',
  L2: 'bg-blue-500',
  L3: 'bg-purple-500',
};

// --- 工具函数 ---

/** 截断字符串到指定长度 */
const truncate = (str: string, maxLen: number): string => {
  if (!str) return '';
  return str.length > maxLen ? str.slice(0, maxLen) + '…' : str;
};

/** 计算执行耗时（ms → 可读格式） */
const formatDuration = (startTime: number, endTime: number | null): string => {
  const end = endTime ?? Date.now();
  const ms = end - startTime;
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60_000).toFixed(1)}m`;
};

/** running 状态的模拟进度（基于已用时间，上限 90%） */
const getRunningProgress = (startTime: number): number => {
  const elapsed = Date.now() - startTime;
  // 30 秒内从 0 → 90%，对数曲线
  const progress = Math.min(90, (elapsed / 30_000) * 90);
  return Math.round(progress);
};

// --- 子组件：单条 Skill 执行卡片 ---

interface SkillCardProps {
  execution: SkillExecution;
}

const SkillCard: React.FC<SkillCardProps> = ({ execution }) => {
  const { skillName, modelTier, status, input, output, startTime, endTime, error } = execution;
  const isRunning = status === 'running';
  const isFailed = status === 'failed';

  return (
    <div
      className={`rounded-lg border px-3 py-2.5 text-sm transition-all ${
        isFailed
          ? 'bg-red-900/30 border-red-700'
          : `${TIER_BG_COLOR[modelTier]} ${TIER_BORDER_COLOR[modelTier]}`
      }`}
    >
      {/* 头部：Skill 名称 + 状态图标 + 层级标签 */}
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <span className="shrink-0">{STATUS_ICON[status]}</span>
          <span className="truncate font-medium text-white" title={skillName}>
            {skillName}
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0 ml-2">
          <span
            className={`text-xs font-mono px-1.5 py-0.5 rounded ${TIER_BG_COLOR[modelTier]} ${TIER_TEXT_COLOR[modelTier]} border ${TIER_BORDER_COLOR[modelTier]}`}
          >
            {modelTier}
          </span>
        </div>
      </div>

      {/* 进度条（仅 running 状态） */}
      {isRunning && (
        <div className="mb-2">
          <div className="w-full bg-gray-700 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-1.5 rounded-full ${TIER_PROGRESS_COLOR[modelTier]} transition-all duration-500 ease-out`}
              style={{ width: `${getRunningProgress(startTime)}%` }}
            />
          </div>
        </div>
      )}

      {/* 输入预览 */}
      {input && (
        <div className="mb-1">
          <span className="text-xs text-gray-500">输入</span>
          <p className="text-xs text-gray-300 mt-0.5 font-mono leading-relaxed">
            {truncate(input, 60)}
          </p>
        </div>
      )}

      {/* 输出预览（completed 状态） */}
      {status === 'completed' && output && (
        <div className="mb-1">
          <span className="text-xs text-gray-500">输出</span>
          <p className="text-xs text-green-300 mt-0.5 font-mono leading-relaxed">
            {truncate(output, 60)}
          </p>
        </div>
      )}

      {/* 错误信息（failed 状态） */}
      {isFailed && error && (
        <div className="mb-1 bg-red-800/40 rounded px-2 py-1">
          <p className="text-xs text-red-300 font-mono leading-relaxed">{truncate(error, 60)}</p>
        </div>
      )}

      {/* 底部：状态标签 + 耗时 */}
      <div className="flex items-center justify-between mt-1.5">
        <span className={`text-xs ${isFailed ? 'text-red-400' : 'text-gray-500'}`}>
          {STATUS_LABEL[status]}
        </span>
        <span className="text-xs text-gray-500 font-mono">
          {formatDuration(startTime, endTime)}
        </span>
      </div>
    </div>
  );
};

// --- 主组件 ---

export const SkillExecutionPanel: React.FC<SkillExecutionPanelProps> = ({
  executions,
  maxDisplay = 5,
}) => {
  // 最多显示 maxDisplay 条，按 startTime 倒序（最新在前）
  const visibleExecutions = [...executions]
    .sort((a, b) => b.startTime - a.startTime)
    .slice(0, maxDisplay);

  // 统计
  const runningCount = executions.filter((e) => e.status === 'running').length;
  const totalCount = executions.length;

  if (visibleExecutions.length === 0) return null;

  return (
    <div className="absolute top-4 left-72 w-80 flex flex-col gap-2 pointer-events-auto">
      {/* 面板标题 */}
      <div className="bg-gray-900/90 text-white px-3 py-2 rounded-xl shadow-xl border border-gray-700">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Skill 执行</h3>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            {runningCount > 0 && (
              <span className="flex items-center gap-1">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
                {runningCount} 运行中
              </span>
            )}
            <span>共 {totalCount}</span>
          </div>
        </div>
      </div>

      {/* 执行卡片列表 */}
      {visibleExecutions.map((exec) => (
        <SkillCard key={exec.id} execution={exec} />
      ))}

      {/* 超出数量提示 */}
      {totalCount > maxDisplay && (
        <div className="text-xs text-gray-500 text-center">
          还有 {totalCount - maxDisplay} 条未显示
        </div>
      )}
    </div>
  );
};