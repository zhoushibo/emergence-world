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

const MOOD_LABELS: Record<string, string> = {
  '开心': '开心',
  '思考中': '思考中',
  '焦虑': '焦虑',
  '愤怒': '愤怒',
  '悲伤': '悲伤',
  '平静': '平静',
  '兴奋': '兴奋',
  '疲惫': '疲惫',
};

const MOOD_COLORS: Record<string, string> = {
  '开心': '#4ade80',
  '思考中': '#60a5fa',
  '焦虑': '#f59e0b',
  '愤怒': '#ef4444',
  '悲伤': '#6366f1',
  '平静': '#94a3b8',
  '兴奋': '#f472b6',
  '疲惫': '#78716c',
};

const getEnergyColor = (energy: number) => {
  if (energy > 70) return '#4ade80';
  if (energy > 30) return '#fbbf24';
  return '#ef4444';
};

const getSkillStatusStyle = (status: string) => {
  switch (status) {
    case 'completed': return 'text-green-400';
    case 'running': return 'text-cyan-400';
    case 'failed': return 'text-red-400';
    case 'pending': return 'text-yellow-400';
    default: return 'text-gray-400';
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

  const [apiMemories, setApiMemories] = useState<Array<{ id: string; content: string; importance: number }>>([]);

  const [apiLoading, setApiLoading] = useState(false);

  const memories = apiMemories.length > 0 ? apiMemories : propMemories;
  const relationships = propRelationships;

  useEffect(() => {
    if (!agent?.id) return;

    let cancelled = false;

    const loadData = async () => {
      setApiLoading(true);
      try {
        const [memResult, relResult] = await Promise.allSettled([
          api.searchMemories(agent.id, '', 5),
          api.getRelationship(agent.id, agent.id),
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

        if (relResult.status === 'fulfilled') {
          // API 可达
        }
      } catch {
        // fallback
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

  const moodColor = MOOD_COLORS[agent.mood] || '#94a3b8';

  return (
    <>
      <div className="absolute top-4 right-4 w-80 pointer-events-auto">
        <div className="relative bg-[#050510]/90 backdrop-blur-xl text-white rounded-lg border border-cyan-500/20 shadow-[0_0_20px_rgba(0,255,255,0.1)] overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent" />
          </div>

          <div className="relative z-10">
            <div className="px-4 py-3 bg-cyan-500/5 border-b border-cyan-500/15 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold font-mono tracking-wider text-cyan-200">{agent.name}</h2>
                <p className="text-xs text-cyan-400/60 font-mono uppercase tracking-widest">{agent.role}</p>
              </div>
              <div className="flex items-center gap-2">
                {apiLoading && (
                  <span className="text-[10px] text-cyan-400/40 animate-pulse font-mono">LOADING</span>
                )}
                <button
                  onClick={onClose}
                  className="text-cyan-400/40 hover:text-cyan-300 text-xl transition-colors"
                  aria-label="关闭详情面板"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="px-4 py-3 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-cyan-400/40 uppercase tracking-wider">Mood</span>
                <span className="text-sm font-mono" style={{ color: moodColor }}>
                  {MOOD_LABELS[agent.mood] || agent.mood}
                </span>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-cyan-400/40 uppercase tracking-wider">Energy</span>
                  <span className="text-xs font-mono" style={{ color: getEnergyColor(agent.energy) }}>{agent.energy}%</span>
                </div>
                <div className="w-full bg-cyan-900/30 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="h-1.5 rounded-full transition-all"
                    style={{
                      width: `${agent.energy}%`,
                      backgroundColor: getEnergyColor(agent.energy),
                      boxShadow: `0 0 8px ${getEnergyColor(agent.energy)}40`,
                    }}
                  />
                </div>
              </div>

              {agent.location && (
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-cyan-400/40 uppercase tracking-wider">Location</span>
                  <span className="text-xs text-cyan-300 font-mono">{agent.location}</span>
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className="text-[10px] text-cyan-400/40 uppercase tracking-wider">Position</span>
                <span className="text-[10px] text-cyan-500/40 font-mono">
                  ({agent.position[0].toFixed(1)}, {agent.position[1].toFixed(1)}, {agent.position[2].toFixed(1)})
                </span>
              </div>
            </div>

            {relationships.length > 0 && (
              <div className="px-4 py-3 border-t border-cyan-500/10">
                <h3 className="text-[10px] font-mono text-cyan-400/40 uppercase tracking-widest mb-2">Relationships</h3>
                <div className="space-y-1.5 max-h-32 overflow-y-auto">
                  {relationships.map((rel, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <span className="text-cyan-200/70 font-mono">{rel.name}</span>
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-mono text-[10px] ${
                            rel.affinity > 0 ? 'text-green-400' : rel.affinity < 0 ? 'text-red-400' : 'text-gray-500'
                          }`}
                        >
                          {rel.affinity > 0 ? '+' : ''}{rel.affinity}
                        </span>
                        {rel.tone && <span className="text-[10px] text-cyan-500/30">{rel.tone}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {memories.length > 0 && (
              <div className="px-4 py-3 border-t border-cyan-500/10">
                <h3 className="text-[10px] font-mono text-cyan-400/40 uppercase tracking-widest mb-2">
                  MEMORIES
                  {apiMemories.length > 0 && (
                    <span className="ml-1.5 text-green-400/60 font-normal">● API</span>
                  )}
                </h3>
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {memories.slice(0, 5).map((mem, i) => (
                    <div key={i} className="text-[10px] text-cyan-200/50 bg-cyan-500/5 rounded px-2 py-1 border border-cyan-500/10">
                      <span className="text-cyan-200/70">{mem.content}</span>
                      <span className="ml-1 text-cyan-500/30">({mem.importance.toFixed(1)})</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {recentSkills.length > 0 && (
              <div className="px-4 py-3 border-t border-cyan-500/10">
                <h3 className="text-[10px] font-mono text-cyan-400/40 uppercase tracking-widest mb-2">Recent Skills</h3>
                <div className="space-y-1.5 max-h-32 overflow-y-auto">
                  {recentSkills.map((sk, i) => (
                    <div key={i} className="flex items-center justify-between text-[10px] bg-cyan-500/5 rounded px-2 py-1.5 border border-cyan-500/10">
                      <span className="text-cyan-200/70 font-mono">{sk.skill}</span>
                      <div className="flex items-center gap-2">
                        <span className={getSkillStatusStyle(sk.status)}>{sk.status}</span>
                        <span className="text-cyan-500/30">{sk.time}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="px-4 py-3 border-t border-cyan-500/15 flex gap-1.5">
              <button className="flex-1 text-[10px] bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 rounded py-1.5 transition-all font-mono tracking-wider">
                DIALOG
              </button>
              <button className="flex-1 text-[10px] bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30 rounded py-1.5 transition-all font-mono tracking-wider">
                MEMORY
              </button>
              <button className="flex-1 text-[10px] bg-gray-500/15 hover:bg-gray-500/25 text-gray-300 border border-gray-500/30 rounded py-1.5 transition-all font-mono tracking-wider">
                TOOL
              </button>
              <button
                onClick={() => setShowNovelUI(true)}
                className="flex-1 text-[10px] bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 rounded py-1.5 transition-all font-mono tracking-wider"
              >
                NOVEL
              </button>
              <button
                onClick={() => setShowCodeUI(true)}
                className="flex-1 text-[10px] bg-teal-500/15 hover:bg-teal-500/25 text-teal-300 border border-teal-500/30 rounded py-1.5 transition-all font-mono tracking-wider"
              >
                CODE
              </button>
            </div>
          </div>
        </div>
      </div>

      {showNovelUI && (
        <NovelCreationUI onClose={() => setShowNovelUI(false)} />
      )}

      <CodeDevUI open={showCodeUI} onClose={() => setShowCodeUI(false)} />
    </>
  );
};
