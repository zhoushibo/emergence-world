import React, { useState, useEffect } from 'react';
import type { AgentData } from '../../services/types';
import { api } from '../../services/api';
import { NovelCreationUI } from './NovelCreationUI';
import { CodeDevUI } from './CodeDevUI';

interface AgentDetailPanelProps {
  agent: AgentData | null;
  onClose: () => void;
  memories?: Array<{ id: string; content: string; importance: number }>;
  relationships?: Array<{ name: string; affinity: number; tone: string }>;
  recentSkills?: Array<{ skill: string; status: string; time: string }>;
}

// 情绪中文映射
const MOOD_LABELS: Record<string, string> = {
  '开心': '😊 开心',
  '思考中': '🤔 思考中',
  '焦虑': '😰 焦虑',
  '愤怒': '😡 愤怒',
  '悲伤': '😢 悲伤',
  '平静': '😌 平静',
  '兴奋': '🤩 兴奋',
  '疲惫': '😴 疲惫',
};

// 能量颜色
const getEnergyColor = (energy: number) => {
  if (energy > 70) return 'text-green-400';
  if (energy > 30) return 'text-yellow-400';
  return 'text-red-400';
};

const getEnergyBarColor = (energy: number) => {
  if (energy > 70) return 'bg-green-500';
  if (energy > 30) return 'bg-yellow-500';
  return 'bg-red-500';
};

// Skill 状态颜色映射
const getSkillStatusStyle = (status: string) => {
  switch (status) {
    case 'completed':
      return 'text-green-400';
    case 'running':
      return 'text-blue-400';
    case 'failed':
      return 'text-red-400';
    case 'pending':
      return 'text-yellow-400';
    default:
      return 'text-gray-400';
  }
};

export const AgentDetailPanel: React.FC<AgentDetailPanelProps> = ({
  agent,
  onClose,
  memories: propMemories = [],
  relationships: propRelationships = [],
  recentSkills = [],
}) => {
  const [showNovelUI, setShowNovelUI] = useState(false);
  const [showCodeUI, setShowCodeUI] = useState(false);

  // API 加载的记忆和关系数据
  const [apiMemories, setApiMemories] = useState<Array<{ id: string; content: string; importance: number }>>([]);
  const [apiRelationships, setApiRelationships] = useState<Array<{ name: string; affinity: number; tone: string }>>([]);
  const [apiLoading, setApiLoading] = useState(false);

  // 合并：API 数据优先，fallback 到 props
  const memories = apiMemories.length > 0 ? apiMemories : propMemories;
  const relationships = apiRelationships.length > 0 ? apiRelationships : propRelationships;

  // 尝试从后端 API 加载记忆和关系数据
  useEffect(() => {
    if (!agent?.id) return;

    let cancelled = false;

    const loadData = async () => {
      setApiLoading(true);
      try {
        // 并行请求记忆和关系
        const [memResult, relResult] = await Promise.allSettled([
          api.searchMemories(agent.id, '', 5),
          api.getRelationship(agent.id, agent.id), // 获取自身关系概览
        ]);

        if (cancelled) return;

        if (memResult.status === 'fulfilled' && memResult.value.results) {
          setApiMemories(
            memResult.value.results.map((m) => ({
              id: m.id,
              content: m.content,
              importance: m.importance,
            })),
          );
        }

        // 关系 API 返回的是单个关系，这里作为标记表示 API 可用
        // 实际关系列表仍由 props 提供（需要批量关系查询 API）
        if (relResult.status === 'fulfilled') {
          // API 可达，保留 props 关系数据
        }
      } catch {
        // API 不可用时静默 fallback 到 props 数据
      } finally {
        if (!cancelled) {
          setApiLoading(false);
        }
      }
    };

    loadData();

    return () => {
      cancelled = true;
    };
  }, [agent?.id]);

  if (!agent) return null;

  return (
    <>
      <div className="absolute top-4 right-4 w-80 bg-gray-900/95 text-white rounded-xl shadow-2xl border border-gray-700 overflow-hidden">
        {/* 头部 */}
        <div className="px-4 py-3 bg-gray-800 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">{agent.name}</h2>
            <p className="text-sm text-gray-400">{agent.role}</p>
          </div>
          <div className="flex items-center gap-2">
            {apiLoading && (
              <span className="text-xs text-gray-500 animate-pulse">加载中...</span>
            )}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white text-xl"
              aria-label="关闭详情面板"
            >
              ✕
            </button>
          </div>
        </div>

        {/* 状态 */}
        <div className="px-4 py-3 space-y-3">
          {/* 情绪 */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">情绪</span>
            <span className="text-sm">{MOOD_LABELS[agent.mood] || agent.mood}</span>
          </div>

          {/* 能量 */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-gray-400">能量</span>
              <span className={`text-sm ${getEnergyColor(agent.energy)}`}>{agent.energy}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${getEnergyBarColor(agent.energy)}`}
                style={{ width: `${agent.energy}%` }}
              />
            </div>
          </div>

          {/* 位置 */}
          {agent.location && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">位置</span>
              <span className="text-sm text-blue-400">{agent.location}</span>
            </div>
          )}

          {/* 坐标 */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">坐标</span>
            <span className="text-xs text-gray-500 font-mono">
              ({agent.position[0].toFixed(1)}, {agent.position[1].toFixed(1)},{' '}
              {agent.position[2].toFixed(1)})
            </span>
          </div>
        </div>

        {/* 关系 */}
        {relationships.length > 0 && (
          <div className="px-4 py-3 border-t border-gray-700">
            <h3 className="text-sm font-semibold text-gray-300 mb-2">关系</h3>
            <div className="space-y-1.5 max-h-32 overflow-y-auto">
              {relationships.map((rel, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-gray-300">{rel.name}</span>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs ${
                        rel.affinity > 0
                          ? 'text-green-400'
                          : rel.affinity < 0
                            ? 'text-red-400'
                            : 'text-gray-500'
                      }`}
                    >
                      {rel.affinity > 0 ? '+' : ''}
                      {rel.affinity}
                    </span>
                    {rel.tone && <span className="text-xs text-gray-500">{rel.tone}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 记忆 */}
        {memories.length > 0 && (
          <div className="px-4 py-3 border-t border-gray-700">
            <h3 className="text-sm font-semibold text-gray-300 mb-2">
              近期记忆
              {apiMemories.length > 0 && (
                <span className="ml-1.5 text-xs text-green-500 font-normal">● API</span>
              )}
            </h3>
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {memories.slice(0, 5).map((mem, i) => (
                <div key={i} className="text-xs text-gray-400 bg-gray-800/50 rounded px-2 py-1">
                  <span className="text-gray-300">{mem.content}</span>
                  <span className="ml-1 text-gray-600">({mem.importance.toFixed(1)})</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 近期 Skill 执行 */}
        {recentSkills.length > 0 && (
          <div className="px-4 py-3 border-t border-gray-700">
            <h3 className="text-sm font-semibold text-gray-300 mb-2">近期 Skill 执行</h3>
            <div className="space-y-1.5 max-h-32 overflow-y-auto">
              {recentSkills.map((sk, i) => (
                <div key={i} className="flex items-center justify-between text-xs bg-gray-800/50 rounded px-2 py-1.5">
                  <span className="text-gray-300 font-mono">{sk.skill}</span>
                  <div className="flex items-center gap-2">
                    <span className={getSkillStatusStyle(sk.status)}>{sk.status}</span>
                    <span className="text-gray-600">{sk.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 操作按钮 - 5 个 */}
        <div className="px-4 py-3 border-t border-gray-700 flex gap-1.5">
          <button className="flex-1 text-xs bg-blue-600 hover:bg-blue-500 rounded py-1.5 transition-colors">
            对话
          </button>
          <button className="flex-1 text-xs bg-purple-600 hover:bg-purple-500 rounded py-1.5 transition-colors">
            查看记忆
          </button>
          <button className="flex-1 text-xs bg-gray-600 hover:bg-gray-500 rounded py-1.5 transition-colors">
            工具
          </button>
          <button
            onClick={() => setShowNovelUI(true)}
            className="flex-1 text-xs bg-amber-600 hover:bg-amber-500 rounded py-1.5 transition-colors"
          >
            📚 写小说
          </button>
          <button
            onClick={() => setShowCodeUI(true)}
            className="flex-1 text-xs bg-teal-600 hover:bg-teal-500 rounded py-1.5 transition-colors"
          >
            💻 写代码
          </button>
        </div>
      </div>

      {/* 小说创作全屏模态 */}
      {showNovelUI && (
        <NovelCreationUI onClose={() => setShowNovelUI(false)} />
      )}

      {/* 代码开发全屏模态 */}
      <CodeDevUI open={showCodeUI} onClose={() => setShowCodeUI(false)} />
    </>
  );
};
