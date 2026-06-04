// ============================================================
// IDA World 世界事件模拟引擎
// 定时生成智能体对话/移动/情绪/工具调用/关系事件，驱动 3D 世界实时变化
// ============================================================

import type { WorldEvent, EventType } from './types';
import { LOCATIONS } from '../data/locations';

// ─── 模拟事件子类型 ────────────────────────────────────────────

export type SimEventCategory = 'dialogue' | 'move' | 'emotion' | 'tool_use' | 'relationship';

/** 模拟引擎生成的扩展事件 */
export interface SimEvent extends WorldEvent {
  category: SimEventCategory;
  /** 移动目标 3D 坐标（仅 move 事件） */
  target_position?: [number, number, number];
  /** 情绪值（仅 emotion 事件） */
  emotion_value?: string;
  /** 工具名称（仅 tool_use 事件） */
  tool_name?: string;
  /** 关系对方 ID（仅 relationship 事件） */
  target_agent_id?: string;
  /** 关系变化量（仅 relationship 事件） */
  affinity_delta?: number;
}

// ─── 10 个角色定义 ─────────────────────────────────────────────

const AGENT_ROLES = [
  'mediator',       // 调解者
  'architect',      // 架构师
  'intel_analyst',  // 情报专家
  'explorer',       // 探索者
  'innovator',      // 创新领袖
  'anchor',         // 社区锚点
  'analyst',        // 行为分析师
  'guardian',       // 守护者
  'harmonizer',     // 和谐者
  'catalyst',       // 催化者
] as const;

export type AgentRole = (typeof AGENT_ROLES)[number];

// ─── 对话模板：每个角色 4 条符合性格的对话 ─────────────────────

const DIALOGUE_TEMPLATES: Record<AgentRole, string[]> = {
  mediator: [
    '大家冷静一下，我们先把问题理清楚。',
    '我理解双方的观点，让我们找一个共同点。',
    '冲突解决的关键是倾听，请先听对方说完。',
    '我们可以分步来处理，不需要一次性解决所有问题。',
  ],
  architect: [
    '这个模块的接口需要重新设计，耦合度太高了。',
    '从架构层面看，我们应该抽象出一个公共层。',
    '这个设计违反了单一职责原则，需要拆分。',
    '我画了一张新的架构图，大家看看有没有问题。',
  ],
  intel_analyst: [
    '我发现了一个潜在的安全风险，需要立即处理。',
    '最新的日志显示异常访问模式，我来分析一下。',
    '这个数据泄露的路径比我们预想的要复杂。',
    '建议立即启动应急响应流程，风险等级为高。',
  ],
  explorer: [
    '我发现了一个之前没人注意到的地方！',
    '那边有一条隐藏的通道，我们去看看。',
    '这个区域的拓扑结构跟文档描述的不一样。',
    '我刚探索了新区域，发现了一些有趣的线索。',
  ],
  innovator: [
    '我有一个大胆的想法！如果我们换个思路呢？',
    '传统方案已经到瓶颈了，试试逆向思维。',
    '把这两个看似无关的概念结合，可能产生突破。',
    '不要被现有框架束缚，让我们重新定义问题。',
  ],
  anchor: [
    '大家今天辛苦了，要不要一起喝杯咖啡？',
    '社区活动下周开始，欢迎大家参加。',
    '我整理了一份知识分享文档，放在共享空间了。',
    '有什么需要帮忙的随时找我，我就在这里。',
  ],
  analyst: [
    '从行为数据看，这个模式出现了三次以上。',
    '我建立了一个新的分析模型，准确率提升了 15%。',
    '群体情绪正在向焦虑方向偏移，需要关注。',
    '根据趋势预测，下周可能会出现资源瓶颈。',
  ],
  guardian: [
    '安全审计发现三个待修复项，我来跟进。',
    '权限配置需要更新，最小权限原则。',
    '这个操作有合规风险，我建议暂缓。',
    '我已经部署了监控规则，异常会自动告警。',
  ],
  harmonizer: [
    '团队氛围有点紧张，我来组织一次轻松的讨论。',
    '每个人都在努力，让我们互相认可一下。',
    '工作节奏需要调整，连续加班不是长久之计。',
    '我建议我们轮流休息，保持整体产出稳定。',
  ],
  catalyst: [
    '这个项目推进太慢了，我来加速一下。',
    '关键路径上的阻塞我来协调解决。',
    '我们不需要等所有条件成熟，先启动核心部分。',
    '跨团队协作效率低，我提议建立同步机制。',
  ],
};

// ─── 7 种情绪及转移概率 ───────────────────────────────────────

export type EmotionType =
  | 'neutral'
  | 'happy'
  | 'focused'
  | 'curious'
  | 'anxious'
  | 'frustrated'
  | 'excited';

/** 情绪 → 合理转移目标的权重分布 */
const EMOTION_TRANSITIONS: Record<EmotionType, Record<EmotionType, number>> = {
  neutral:    { neutral: 30, happy: 20, focused: 25, curious: 15, anxious: 5, frustrated: 3, excited: 2 },
  happy:      { neutral: 15, happy: 30, focused: 10, curious: 20, anxious: 2, frustrated: 1, excited: 22 },
  focused:    { neutral: 10, happy: 10, focused: 35, curious: 25, anxious: 8, frustrated: 7, excited: 5 },
  curious:    { neutral: 8, happy: 15, focused: 20, curious: 30, anxious: 5, frustrated: 2, excited: 20 },
  anxious:    { neutral: 15, happy: 10, focused: 15, curious: 10, anxious: 25, frustrated: 15, excited: 10 },
  frustrated: { neutral: 20, happy: 5, focused: 15, curious: 10, anxious: 15, frustrated: 25, excited: 10 },
  excited:    { neutral: 10, happy: 25, focused: 15, curious: 20, anxious: 2, frustrated: 3, excited: 25 },
};

const EMOTION_TYPES: EmotionType[] = [
  'neutral', 'happy', 'focused', 'curious', 'anxious', 'frustrated', 'excited',
];

// ─── 工具调用映射：角色 → 可用 Skill ─────────────────────────

const TOOL_MAPPING: Partial<Record<AgentRole, string[]>> = {
  architect:      ['architecture_design', 'code_review'],
  intel_analyst:  ['code_debugging', 'tech_research'],
  innovator:      ['ideation', 'prototype_design'],
  anchor:         ['knowledge_sharing', 'technical_discussion'],
  analyst:        ['tech_research', 'knowledge_synthesis'],
  mediator:       ['conflict_resolution', 'consensus_building'],
  explorer:       ['environment_scan', 'path_discovery'],
  guardian:       ['security_audit', 'compliance_check'],
  harmonizer:     ['team_wellness', 'rhythm_adjustment'],
  catalyst:       ['process_acceleration', 'blocker_resolution'],
};

// ─── 地点坐标（从 locations.ts 派生，单源 truth） ─────────────

const LOCATION_POSITIONS: Record<string, [number, number, number]> =
  Object.fromEntries(LOCATIONS.map((l) => [l.id, l.position]));

const LOCATION_IDS = Object.keys(LOCATION_POSITIONS);

// ─── 事件频率权重 ──────────────────────────────────────────────

const EVENT_WEIGHTS: Record<SimEventCategory, number> = {
  dialogue:     35,
  move:         20,
  emotion:      20,
  tool_use:     15,
  relationship: 10,
};

const EVENT_CATEGORIES: SimEventCategory[] = ['dialogue', 'move', 'emotion', 'tool_use', 'relationship'];
const EVENT_WEIGHT_VALUES = EVENT_CATEGORIES.map((c) => EVENT_WEIGHTS[c]);

// ─── 工具函数 ─────────────────────────────────────────────────

/** 按权重随机选择 */
function weightedRandom<T>(items: T[], weights: number[]): T {
  const total = weights.reduce((s, w) => s + w, 0);
  let r = Math.random() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

/** 随机选择数组元素 */
function randomPick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** 生成唯一事件 ID */
function generateEventId(): string {
  return `sim_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

// ─── 智能体运行时状态 ─────────────────────────────────────────

interface AgentState {
  id: string;
  role: AgentRole;
  current_emotion: EmotionType;
  current_location: string;
}

// ─── WorldSimulator 类 ────────────────────────────────────────

export interface WorldSimulatorConfig {
  worldId: string;
  agentIds: string[];
  tickInterval?: number;
  eventsPerTick?: [number, number]; // [min, max]
}

export type SimEventHandler = (event: SimEvent) => void;

export class WorldSimulator {
  private worldId: string;
  private tickInterval: number;
  private eventsPerTick: [number, number];
  private timer: ReturnType<typeof setInterval> | null = null;
  private handlers: Set<SimEventHandler> = new Set();
  private agentStates: Map<string, AgentState> = new Map();
  private running = false;
  private eventCounter = 0;

  constructor(config: WorldSimulatorConfig) {
    this.worldId = config.worldId;
    this.tickInterval = config.tickInterval ?? 3000;
    this.eventsPerTick = config.eventsPerTick ?? [1, 2];

    // 初始化智能体状态
    for (const id of config.agentIds) {
      const roleIndex = this.agentStates.size % AGENT_ROLES.length;
      const role = AGENT_ROLES[roleIndex];
      this.agentStates.set(id, {
        id,
        role,
        current_emotion: 'neutral',
        current_location: randomPick(LOCATION_IDS),
      });
    }
  }

  /** 启动模拟引擎 */
  start(): void {
    if (this.running) return;
    this.running = true;
    this.timer = setInterval(() => this.tick(), this.tickInterval);
    console.log(`[WorldSimulator] Started — world=${this.worldId}, tick=${this.tickInterval}ms`);
  }

  /** 停止模拟引擎 */
  stop(): void {
    if (!this.running) return;
    this.running = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    console.log('[WorldSimulator] Stopped');
  }

  /** 注册事件处理器，返回取消注册函数 */
  onEvent(handler: SimEventHandler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  /** 是否正在运行 */
  get isRunning(): boolean {
    return this.running;
  }

  /** 获取智能体当前状态 */
  getAgentState(agentId: string): AgentState | undefined {
    return this.agentStates.get(agentId);
  }

  /** 获取所有智能体状态 */
  getAllAgentStates(): AgentState[] {
    return Array.from(this.agentStates.values());
  }

  /** 手动触发一次 tick（用于测试） */
  tick(): SimEvent[] {
    const [min, max] = this.eventsPerTick;
    const count = min + Math.floor(Math.random() * (max - min + 1));
    const events: SimEvent[] = [];

    for (let i = 0; i < count; i++) {
      const event = this.generateEvent();
      if (event) {
        events.push(event);
        this.dispatchEvent(event);
      }
    }

    return events;
  }

  // ─── 事件生成 ─────────────────────────────────────────────

  private generateEvent(): SimEvent | null {
    const category = weightedRandom(EVENT_CATEGORIES, EVENT_WEIGHT_VALUES);

    switch (category) {
      case 'dialogue':
        return this.generateDialogue();
      case 'move':
        return this.generateMove();
      case 'emotion':
        return this.generateEmotion();
      case 'tool_use':
        return this.generateToolUse();
      case 'relationship':
        return this.generateRelationship();
      default:
        return null;
    }
  }

  private pickAgent(): AgentState | null {
    const agents = this.getAllAgentStates();
    if (agents.length === 0) return null;
    return randomPick(agents);
  }

  private pickOtherAgent(excludeId: string): AgentState | null {
    const others = this.getAllAgentStates().filter((a) => a.id !== excludeId);
    if (others.length === 0) return null;
    return randomPick(others);
  }

  /** 生成对话事件 */
  private generateDialogue(): SimEvent | null {
    const agent = this.pickAgent();
    if (!agent) return null;

    const templates = DIALOGUE_TEMPLATES[agent.role];
    const content = randomPick(templates);

    // 可能涉及其他智能体
    const other = this.pickOtherAgent(agent.id);
    const involvedAgents = other ? [agent.id, other.id] : [agent.id];

    return {
      event_id: generateEventId(),
      event_type: 'agent_dialogue' as EventType,
      world_id: this.worldId,
      agent_id: agent.id,
      location: agent.current_location,
      content,
      involved_agents: involvedAgents,
      timestamp: new Date().toISOString(),
      category: 'dialogue',
    };
  }

  /** 生成移动事件 */
  private generateMove(): SimEvent | null {
    const agent = this.pickAgent();
    if (!agent) return null;

    // 选择一个不同于当前位置的目标地点
    const otherLocations = LOCATION_IDS.filter((l) => l !== agent.current_location);
    const targetLocation = randomPick(otherLocations);
    const targetPosition = LOCATION_POSITIONS[targetLocation];

    // 更新智能体位置
    agent.current_location = targetLocation;

    return {
      event_id: generateEventId(),
      event_type: 'agent_move' as EventType,
      world_id: this.worldId,
      agent_id: agent.id,
      location: targetLocation,
      content: `移动到 ${targetLocation}`,
      timestamp: new Date().toISOString(),
      category: 'move',
      target_position: targetPosition,
    };
  }

  /** 生成情绪事件 */
  private generateEmotion(): SimEvent | null {
    const agent = this.pickAgent();
    if (!agent) return null;

    const currentEmotion = agent.current_emotion;
    const transitions = EMOTION_TRANSITIONS[currentEmotion];
    const nextEmotion = weightedRandom(EMOTION_TYPES, EMOTION_TYPES.map((e) => transitions[e]));

    // 更新智能体情绪
    agent.current_emotion = nextEmotion;

    return {
      event_id: generateEventId(),
      event_type: 'agent_emotion' as EventType,
      world_id: this.worldId,
      agent_id: agent.id,
      location: agent.current_location,
      content: `情绪从 ${currentEmotion} 转变为 ${nextEmotion}`,
      timestamp: new Date().toISOString(),
      category: 'emotion',
      emotion_value: nextEmotion,
    };
  }

  /** 生成工具调用事件 */
  private generateToolUse(): SimEvent | null {
    const agent = this.pickAgent();
    if (!agent) return null;

    const availableTools = TOOL_MAPPING[agent.role];
    if (!availableTools || availableTools.length === 0) return null;

    const toolName = randomPick(availableTools);

    return {
      event_id: generateEventId(),
      event_type: 'agent_action' as EventType,
      world_id: this.worldId,
      agent_id: agent.id,
      location: agent.current_location,
      content: `调用工具 ${toolName}`,
      timestamp: new Date().toISOString(),
      category: 'tool_use',
      tool_name: toolName,
    };
  }

  /** 生成关系事件 */
  private generateRelationship(): SimEvent | null {
    const agent = this.pickAgent();
    if (!agent) return null;

    const other = this.pickOtherAgent(agent.id);
    if (!other) return null;

    // 关系变化量：-3 到 +3 的随机值，偏向正面
    const affinityDelta = Math.round((Math.random() * 6 - 2) * 10) / 10;

    const direction = affinityDelta >= 0 ? '提升' : '降低';
    return {
      event_id: generateEventId(),
      event_type: 'world_event' as EventType,
      world_id: this.worldId,
      agent_id: agent.id,
      location: agent.current_location,
      content: `与 ${other.id} 的关系${direction}了 ${Math.abs(affinityDelta)}`,
      involved_agents: [agent.id, other.id],
      timestamp: new Date().toISOString(),
      category: 'relationship',
      target_agent_id: other.id,
      affinity_delta: affinityDelta,
    };
  }

  // ─── 事件分发 ─────────────────────────────────────────────

  private dispatchEvent(event: SimEvent): void {
    this.eventCounter++;
    this.handlers.forEach((handler) => {
      try {
        handler(event);
      } catch (err) {
        console.error('[WorldSimulator] Event handler error:', err);
      }
    });
  }
}

// ─── 便捷工厂函数 ─────────────────────────────────────────────

/** 从 locations.ts 数据创建模拟引擎 */
export function createWorldSimulator(
  worldId: string,
  agentIds: string[],
  options?: { tickInterval?: number; eventsPerTick?: [number, number] },
): WorldSimulator {
  // 验证地点坐标一致性
  for (const loc of LOCATIONS) {
    const pos = LOCATION_POSITIONS[loc.id];
    if (!pos || pos[0] !== loc.position[0] || pos[1] !== loc.position[1] || pos[2] !== loc.position[2]) {
      console.warn(
        `[WorldSimulator] Location "${loc.id}" position mismatch: ` +
        `locations.ts=${loc.position.join(',')} vs worldSimulator=${pos?.join(',') ?? 'undefined'}`,
      );
    }
  }

  return new WorldSimulator({
    worldId,
    agentIds,
    tickInterval: options?.tickInterval,
    eventsPerTick: options?.eventsPerTick,
  });
}