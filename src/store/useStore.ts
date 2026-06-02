import { create } from 'zustand';
import type { AgentData, WorldEvent, WorldStats, SkillExecution } from '../services/types';
import type { SimEvent } from '../services/worldSimulator';
import { api } from '../services/api';
import { agentDB, eventDB } from '../services/database';

interface WorldState {
  // 核心状态
  agents: AgentData[];
  logs: { message: string; timestamp: number }[];
  mode: 'cinematic' | 'immersive';
  selectedAgentId: string | null;
  selectedLocationId: string | null;
  worldId: string;
  connected: boolean;

  // 世界统计
  eventCount: number;
  dramaLevel: number;

  // 对话状态
  activeDialogues: Record<string, string>; // agentId → dialogue text

  // 模拟引擎状态
  simEvents: SimEvent[];
  skillExecutions: SkillExecution[];
  worldTime: number; // 世界时间（模拟 NYC 时间戳）
  isSimulating: boolean;

  // Actions
  setMode: (mode: 'cinematic' | 'immersive') => void;
  setSelectedAgent: (id: string | null) => void;
  setSelectedLocation: (id: string | null) => void;
  updateAgents: (agents: AgentData[]) => void;
  addLog: (message: string) => void;
  setConnected: (connected: boolean) => void;
  setDramaLevel: (level: number) => void;
  setActiveDialogue: (agentId: string, text: string) => void;
  clearDialogue: (agentId: string) => void;

  // 模拟引擎 Actions
  addSimEvent: (event: SimEvent) => void;
  consumeSimEvent: (eventId: string) => void;
  addSkillExecution: (exec: SkillExecution) => void;
  updateSkillExecution: (id: string, updates: Partial<SkillExecution>) => void;
  setWorldTime: (time: number) => void;
  setIsSimulating: (running: boolean) => void;
  updateAgentState: (agentId: string, updates: Partial<AgentData>) => void;

  // API Actions
  fetchWorldStats: () => Promise<void>;
  emitEvent: (event: Partial<WorldEvent>) => Promise<void>;
}

export const useStore = create<WorldState>((set, get) => ({
  agents: [],
  logs: [],
  mode: 'cinematic',
  selectedAgentId: null,
  selectedLocationId: null,
  worldId: 'modern_city_01',
  connected: false,
  eventCount: 0,
  dramaLevel: 0.5,
  activeDialogues: {},

  // 模拟引擎初始状态
  simEvents: [],
  skillExecutions: [],
  worldTime: Date.now(),
  isSimulating: false,

  setMode: (mode) => set({ mode }),
  setSelectedAgent: (id) => set({ selectedAgentId: id }),
  setSelectedLocation: (id) => set({ selectedLocationId: id }),
  setConnected: (connected) => set({ connected }),
  setDramaLevel: (level) => set({ dramaLevel: level }),
  setActiveDialogue: (agentId, text) =>
    set((state) => ({
      activeDialogues: { ...state.activeDialogues, [agentId]: text },
    })),
  clearDialogue: (agentId) =>
    set((state) => {
      const { [agentId]: _, ...rest } = state.activeDialogues;
      return { activeDialogues: rest };
    }),

  // ─── 模拟引擎 Actions ─────────────────────────────────────

  addSimEvent: (event) =>
    set((state) => ({
      simEvents: [...state.simEvents, event].slice(-50), // 保留最近 50 条
    })),

  consumeSimEvent: (eventId) =>
    set((state) => ({
      simEvents: state.simEvents.filter((e) => e.event_id !== eventId),
    })),

  addSkillExecution: (exec) =>
    set((state) => ({
      skillExecutions: [...state.skillExecutions, exec].slice(-20), // 保留最近 20 条
    })),

  updateSkillExecution: (id, updates) =>
    set((state) => ({
      skillExecutions: state.skillExecutions.map((e) =>
        e.id === id ? { ...e, ...updates } : e,
      ),
    })),

  setWorldTime: (time) => set({ worldTime: time }),
  setIsSimulating: (running) => set({ isSimulating: running }),

  updateAgentState: (agentId, updates) =>
    set((state) => ({
      agents: state.agents.map((a) =>
        a.id === agentId ? { ...a, ...updates } : a,
      ),
    })),

  // ─── 原有 Actions ─────────────────────────────────────────

  updateAgents: async (agents) => {
    set({ agents });
    for (const agent of agents) {
      await agentDB.put(agent);
    }
  },

  addLog: async (message) => {
    const log = { message, timestamp: Date.now() };
    set((state) => ({ logs: [log, ...state.logs].slice(0, 50) }));
    await eventDB.add(log);
  },

  fetchWorldStats: async () => {
    try {
      const stats = await api.getWorldStats(get().worldId);
      set({ eventCount: stats.total });
      const directorState = await api.getDirectorState(get().worldId);
      set({ dramaLevel: directorState.drama_level });
    } catch {
      // 后端未连接时静默失败
    }
  },

  emitEvent: async (event) => {
    try {
      await api.emitEvent(get().worldId, event);
      set((state) => ({ eventCount: state.eventCount + 1 }));
    } catch {
      // 后端未连接时静默失败
    }
  },
}));
