// ============================================================
// Cognitive World Simulator — 用 CognitiveSimulator 替代 WorldSimulator
// 对外暴露与 WorldSimulator 完全一致的 API
// 事件格式已兼容 App.tsx 的 onEvent 处理
// ============================================================

import type { SimEvent, SimEventHandler } from './worldSimulator';
import { CognitiveSimulator } from '../engine/cognitiveSimulator.js';
import type { AgentRuntimeSnapshot } from '../engine/cognitiveSimulator.js';

export type { SimEvent, SimEventHandler };

export function createCognitiveWorldSimulator(
  worldId: string,
  agentIds: string[],
  options?: { tickInterval?: number },
): CognitiveSimulator {
  return new CognitiveSimulator({
    worldId,
    agentIds,
    tickInterval: options?.tickInterval ?? 3500,
  });
}

// Re-export for App.tsx state sync
export type { AgentRuntimeSnapshot };
