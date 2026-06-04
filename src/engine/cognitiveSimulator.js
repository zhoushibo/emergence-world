// @ts-nocheck
// ============================================================
// Cognitive Simulator — 认知模拟器主循环 (JS 版)
// 替代原有的 WorldSimulator，整合所有认知模块
// ============================================================

import { EventType, EmotionType as ET } from './types.js';
import { AGENT_DEFINITIONS, getAgentById } from './personalityEngine.js';
import { MemorySystem } from './memorySystem.js';
import { DialogueEngine } from './dialogueEngine.js';
import { NarrativeDirector } from './narrativeDirector.js';
import { llmClient } from './LLMClient.js';
import { LOCATIONS } from '../data/locations.ts';

// ─── 18 个地标坐标映射 ─────────────────────────────────
const LOCATION_POSITIONS = {};
for (const loc of LOCATIONS) {
  LOCATION_POSITIONS[loc.id] = loc.position;
}
const LOCATION_IDS = Object.keys(LOCATION_POSITIONS);

// ─── 情绪类型列表 ──────────────────────────────────────
const EMOTIONS = [
  ET.NEUTRAL, ET.ANGER, ET.FEAR, ET.SADNESS,
  ET.DESPAIR, ET.HOPE, ET.JOY,
];

// ─── CognitiveSimulator ────────────────────────────────

export class CognitiveSimulator {
  constructor(config) {
    this.worldId = config.worldId;
    this.tickInterval = config.tickInterval ?? 3000;
    this.timer = null;
    this.handlers = new Set();
    this.running = false;
    this.eventCounter = 0;
    this.tickCount = 0;

    // 初始化认知模块
    this.memorySystem = new MemorySystem();
    this.dialogueEngine = new DialogueEngine(this.memorySystem);
    this.narrativeDirector = new NarrativeDirector(this.memorySystem);

    // Agent 运行时状态
    this.agentStates = new Map();
    this.recentEvents = [];
    this.stateUpdateHandler = null;

    // 初始化 Agent 状态
    for (const id of config.agentIds) {
      const agentDef = getAgentById(id);
      if (!agentDef) continue;

      const startLocation = agentDef.initialLocation;
      this.agentStates.set(id, {
        agent: agentDef,
        currentEmotion: ET.NEUTRAL,
        currentLocation: LOCATION_IDS.includes(startLocation) ? startLocation : LOCATION_IDS[0],
        energy: 50 + Math.floor(Math.random() * 40),
        lastDialogue: '',
        lastTarget: null,
      });
    }

    // 初始化关系
    const agentIds = Array.from(this.agentStates.keys());
    for (let i = 0; i < agentIds.length; i++) {
      for (let j = i + 1; j < agentIds.length; j++) {
        const a = this.agentStates.get(agentIds[i]);
        const b = this.agentStates.get(agentIds[j]);
        if (!a || !b) continue;
        const compatibility = this.memorySystem.calculateCompatibility(
          a.agent.personality, b.agent.personality,
        );
        this.memorySystem.applyRelationshipDelta(agentIds[i], agentIds[j], 0);
        this.memorySystem.addMemory(agentIds[i], `和${b.agent.name}的初次相遇。`, 0.3);
        this.memorySystem.addMemory(agentIds[j], `和${a.agent.name}的初次相遇。`, 0.3);
      }
    }
  }

  // ─── 生命周期 ───────────────────────────────────────

  start() {
    if (this.running) return;
    this.running = true;
    this.timer = setInterval(() => this.tick(), this.tickInterval);
    console.log(`[CognitiveSimulator] Started — world=${this.worldId}, tick=${this.tickInterval}ms`);
  }

  stop() {
    if (!this.running) return;
    this.running = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    console.log('[CognitiveSimulator] Stopped');
  }

  onEvent(handler) {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  onStateUpdate(handler) {
    this.stateUpdateHandler = handler;
    return () => {
      if (this.stateUpdateHandler === handler) this.stateUpdateHandler = null;
    };
  }

  get isRunning() { return this.running; }

  getMemorySystem() { return this.memorySystem; }
  getNarrativeDirector() { return this.narrativeDirector; }
  getLLMClient() { return llmClient; }

  /** 获取 Agent 运行时状态（含坐标偏移） */
  getAgentRuntimeStates() {
    const standOffset = [2.2, 0, 2.2];
    return Array.from(this.agentStates.values()).map((s) => {
      const pos = LOCATION_POSITIONS[s.currentLocation];
      return {
        id: s.agent.id,
        name: s.agent.name,
        role: s.agent.role,
        mood: s.currentEmotion,
        emotion: s.currentEmotion,
        energy: s.energy,
        location: s.currentLocation,
        position: pos
          ? [pos[0] + standOffset[0], pos[1] + standOffset[1], pos[2] + standOffset[2]]
          : [0, 0, 0],
      };
    });
  }

  // ─── 主 tick ───────────────────────────────────────

  async tick() {
    try {
      this.tickCount++;

      // 1. 叙事导演推进
      await this.narrativeDirector.tick(this.worldId, this.recentEvents.slice(-20));
      const directorState = this.narrativeDirector.getDirectorState();

      // 2. 记忆衰减
      for (const [id] of this.agentStates) { this.memorySystem.applyDecay(id); }
      this.memorySystem.decayRelationships();

      // 3. 所有 Agent 都有概率移动
      for (const [agentId, state] of this.agentStates) {
        if (Math.random() < 0.65) {
          const event = this.generateMove(state);
          this.dispatchEvent(event);
          this.recentEvents.push(event);
        }
      }

      // 4. 活跃 Agent：额外生成对话/情绪/工具事件
      const activeAgents = this.selectActiveAgents(directorState.current_phase);
      for (const agentId of activeAgents) {
        const state = this.agentStates.get(agentId);
        if (!state) continue;

        const recommended = this.narrativeDirector.getRecommendedEventCategories()
          .filter((c) => c !== 'move');
        const category = recommended.length > 0
          ? recommended[Math.floor(Math.random() * recommended.length)]
          : 'emotion';

        const event = await this.generateEventForAgent(state, category);
        if (event) {
          this.dispatchEvent(event);
          this.recentEvents.push(event);
        }
      }

      // 5. 清理过期事件
      if (this.recentEvents.length > 100) {
        this.recentEvents = this.recentEvents.slice(-50);
      }

      // 6. 能量同步
      for (const [, state] of this.agentStates) {
        state.energy = Math.max(10, Math.min(100, state.energy + (Math.random() * 2 - 1)));
      }

      // 7. 状态同步到 store
      if (this.stateUpdateHandler) {
        this.stateUpdateHandler(this.getAgentRuntimeStates());
      }
    } catch (err) {
      console.error('[CognitiveSimulator] tick error:', err);
    }
  }

  // ─── Agent 选择 ─────────────────────────────────────

  selectActiveAgents(currentPhase) {
    const all = Array.from(this.agentStates.keys());
    const count =
      currentPhase === 'climax' ? 5 :
      currentPhase === 'rising' ? 4 :
      currentPhase === 'falling' ? 3 : 2;

    const shuffled = [...all].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(count, shuffled.length));
  }

  // ─── 事件生成 ─────────────────────────────────────

  async generateEventForAgent(state, category) {
    switch (category) {
      case 'dialogue': return this.generateDialogue(state);
      case 'move': return this.generateMove(state);
      case 'emotion': return this.generateEmotion(state);
      case 'tool_use': return this.generateToolUse(state);
      case 'relationship': return this.generateRelationship(state);
      default: return null;
    }
  }

  async generateDialogue(state) {
    const possibleTargets = Array.from(this.agentStates.values())
      .filter((s) => s.agent.id !== state.agent.id && s.currentLocation === state.currentLocation);
    const target = possibleTargets.length > 0
      ? possibleTargets[Math.floor(Math.random() * possibleTargets.length)]
      : null;

    const recentMemories = this.memorySystem.getRecentMemories(state.agent.id, 3);
    const recentEvents = this.memorySystem.getAgentEvents(state.agent.id, 3);
    const locationObj = LOCATIONS.find((l) => l.id === state.currentLocation);
    const locationName = locationObj?.name ?? state.currentLocation;

    const context = {
      targetAgent: target?.agent ?? undefined,
      recentEvents: recentEvents,
      locationName,
      currentEmotion: state.currentEmotion,
    };

    const dialogue = await this.dialogueEngine.generateDialogue(state.agent, context);

    if (target) {
      this.memorySystem.applyRelationshipDelta(state.agent.id, target.agent.id, 1);
      this.memorySystem.addMemory(state.agent.id, `对${target.agent.name}说了话。`, 0.4);
      this.memorySystem.logEvent({
        event_id: `evt_${Date.now().toString(36)}`,
        timestamp: Date.now(), type: 'dialogue',
        agent_id: state.agent.id, target_id: target.agent.id,
        content: dialogue, location: state.currentLocation, importance: 0.5,
      });
    }

    state.lastDialogue = dialogue;
    state.lastTarget = target?.agent.id ?? null;

    return {
      event_id: `cog_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      category: 'dialogue', event_type: EventType.AGENT_DIALOGUE,
      world_id: this.worldId, agent_id: state.agent.id, location: state.currentLocation,
      content: dialogue,
      involved_agents: target ? [state.agent.id, target.agent.id] : [state.agent.id],
      timestamp: new Date().toISOString(),
    };
  }

  generateMove(state) {
    const otherLocs = LOCATION_IDS.filter((l) => l !== state.currentLocation);
    const targetLocation = otherLocs[Math.floor(Math.random() * otherLocs.length)];
    const targetPos = LOCATION_POSITIONS[targetLocation];
    const locationObj = LOCATIONS.find((l) => l.id === targetLocation);
    const locationName = locationObj?.name ?? targetLocation;

    state.currentLocation = targetLocation;

    return {
      event_id: `cog_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      category: 'move', event_type: EventType.AGENT_MOVE,
      world_id: this.worldId, agent_id: state.agent.id, location: targetLocation,
      content: `前往 ${locationName}`,
      involved_agents: [state.agent.id],
      timestamp: new Date().toISOString(),
      target_position: targetPos,
    };
  }

  generateEmotion(state) {
    const volatility = state.agent.personality.emotionalVolatility;
    const newEmotion = Math.random() < volatility * 0.5
      ? EMOTIONS[Math.floor(Math.random() * EMOTIONS.length)]
      : state.currentEmotion;
    const oldEmotion = state.currentEmotion;
    state.currentEmotion = newEmotion;

    return {
      event_id: `cog_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      category: 'emotion', event_type: EventType.AGENT_EMOTION,
      world_id: this.worldId, agent_id: state.agent.id, location: state.agent.initialLocation,
      content: `情绪从${oldEmotion}变为${newEmotion}`,
      involved_agents: [state.agent.id],
      timestamp: new Date().toISOString(),
      emotion_value: newEmotion,
      emotion_deltas: [{ emotion: newEmotion, delta: 0.3, residue_intensity: 0.2 }],
    };
  }

  generateToolUse(state) {
    const tools = ['analysis', 'survey', 'research', 'design', 'review', 'monitor'];
    const tool = tools[Math.floor(Math.random() * tools.length)];
    return {
      event_id: `cog_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      category: 'tool_use', event_type: EventType.TOOL_USE,
      world_id: this.worldId, agent_id: state.agent.id, location: state.agent.initialLocation,
      content: `正在使用${tool}工具进行分析`,
      involved_agents: [state.agent.id],
      timestamp: new Date().toISOString(), tool_name: tool,
    };
  }

  generateRelationship(state) {
    const others = Array.from(this.agentStates.values())
      .filter((s) => s.agent.id !== state.agent.id);
    if (others.length === 0) return this.generateDialogue(state);

    const target = others[Math.floor(Math.random() * others.length)];
    const delta = Math.round((Math.random() * 6 - 2) * 10) / 10;
    const rel = this.memorySystem.applyRelationshipDelta(state.agent.id, target.agent.id, delta);
    const direction = delta >= 0 ? '提升' : '下降';

    return {
      event_id: `cog_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      category: 'relationship', event_type: EventType.RELATIONSHIP_CHANGE,
      world_id: this.worldId, agent_id: state.agent.id, location: state.currentLocation,
      content: `与 ${target.agent.name} 的关系${direction}了`,
      involved_agents: [state.agent.id, target.agent.id],
      timestamp: new Date().toISOString(),
      target_agent_id: target.agent.id, affinity_delta: delta,
      relationship_deltas: [{ target_agent: target.agent.id, affinity_delta: delta, tone: rel.emotional_tone }],
    };
  }

  dispatchEvent(event) {
    this.eventCounter++;
    this.handlers.forEach((handler) => {
      try { handler(event); } catch (err) { console.error('[CognitiveSimulator] Handler error:', err); }
    });
  }
}

// ─── 工厂函数 ─────────────────────────────────────────
export function createCognitiveSimulator(worldId, agentIds, options) {
  return new CognitiveSimulator({ worldId, agentIds, tickInterval: options?.tickInterval });
}

export { LOCATIONS, LOCATION_POSITIONS, LOCATION_IDS };

