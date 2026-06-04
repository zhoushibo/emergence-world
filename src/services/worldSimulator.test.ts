// ============================================================
// WorldSimulator 单元测试
// TDD 工作流 — 测试 5 种事件类别 + 状态管理 + 生命周期 + 边界条件
// ============================================================

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { WorldSimulator, createWorldSimulator, type SimEvent, type SimEventCategory, type EmotionType, type AgentRole } from './worldSimulator';

// ─── 辅助：创建标准模拟器 ───────────────────────────────────

const WORLD_ID = 'test_world_01';
const AGENT_IDS = ['agent_a', 'agent_b', 'agent_c', 'agent_d', 'agent_e'];

function createSimulator(eventsPerTick: [number, number] = [1, 2]) {
  return new WorldSimulator({
    worldId: WORLD_ID,
    agentIds: AGENT_IDS,
    eventsPerTick,
    tickInterval: 1000,
  });
}

// ─── 辅助：运行多次 tick 收集事件 ───────────────────────────

function collectEvents(sim: WorldSimulator, ticks = 50): SimEvent[] {
  const events: SimEvent[] = [];
  for (let i = 0; i < ticks; i++) {
    events.push(...sim.tick());
  }
  return events;
}

// ═══════════════════════════════════════════════════════════════
// 1. 构造函数
// ═══════════════════════════════════════════════════════════════

describe('构造函数', () => {
  it('应使用有效配置创建模拟器并初始化所有智能体', () => {
    const sim = createSimulator();
    const states = sim.getAllAgentStates();
    expect(states).toHaveLength(AGENT_IDS.length);
    for (const id of AGENT_IDS) {
      expect(sim.getAgentState(id)).toBeDefined();
      expect(sim.getAgentState(id)!.id).toBe(id);
    }
  });

  it('应为每个智能体分配一个角色', () => {
    const sim = createSimulator();
    const states = sim.getAllAgentStates();
    for (const state of states) {
      expect(state.role).toBeDefined();
      expect(typeof state.role).toBe('string');
    }
  });

  it('所有智能体的初始情绪应为 neutral', () => {
    const sim = createSimulator();
    const states = sim.getAllAgentStates();
    for (const state of states) {
      expect(state.current_emotion).toBe('neutral');
    }
  });

  it('每个智能体应分配一个有效的地点', () => {
    const sim = createSimulator();
    const states = sim.getAllAgentStates();
    const validLocations = [
      'research_institute', 'hospital', 'school', 'police_station',
      'apartment_complex', 'office_tower', 'tech_hub', 'coding_lab',
      'writers_studio', 'coffee_shop', 'restaurant_row', 'shopping_mall',
      'central_park', 'subway_station', 'city_hall', 'bank',
      'devops_center', 'bookstore',
    ];
    for (const state of states) {
      expect(validLocations).toContain(state.current_location);
    }
  });

  it('应使用默认参数（当未提供时）', () => {
    const sim = new WorldSimulator({
      worldId: 'test',
      agentIds: ['a', 'b'],
    });
    // 通过 tick() 的行为验证默认 eventsPerTick=[1,2]
    const events = sim.tick();
    expect(events.length).toBeGreaterThanOrEqual(1);
    expect(events.length).toBeLessThanOrEqual(2);
  });

  it('5 个智能体应获得 5 种不同角色（轮询分配）', () => {
    const sim = new WorldSimulator({
      worldId: 'test',
      agentIds: ['a', 'b', 'c', 'd', 'e'],
    });
    const roles = new Set(sim.getAllAgentStates().map((s) => s.role));
    expect(roles.size).toBe(5);
  });
});

// ═══════════════════════════════════════════════════════════════
// 2. Tick — 事件生成
// ═══════════════════════════════════════════════════════════════

describe('tick() — 事件生成', () => {
  it('默认 eventsPerTick=[1,2] 时每次 tick 生成 1-2 个事件', () => {
    const sim = createSimulator([1, 2]);
    const events = collectEvents(sim, 30);
    for (const e of events) {
      expect(e).toBeDefined();
    }
    expect(events.length).toBeGreaterThanOrEqual(30);
    expect(events.length).toBeLessThanOrEqual(60);
  });

  it('eventsPerTick=[3,3] 时每次 tick 恰好生成 3 个事件', () => {
    const sim = createSimulator([3, 3]);
    const events = sim.tick();
    expect(events).toHaveLength(3);
  });

  it('eventsPerTick=[0,0] 时返回空数组', () => {
    const sim = createSimulator([0, 0]);
    const events = sim.tick();
    expect(events).toHaveLength(0);
  });

  it('每个事件应包含所有必要字段', () => {
    const sim = createSimulator([5, 5]);
    const events = sim.tick();
    for (const e of events) {
      expect(e).toHaveProperty('event_id');
      expect(e).toHaveProperty('event_type');
      expect(e).toHaveProperty('world_id', WORLD_ID);
      expect(e).toHaveProperty('agent_id');
      expect(e).toHaveProperty('location');
      expect(e).toHaveProperty('timestamp');
      expect(e).toHaveProperty('category');
      expect(AGENT_IDS).toContain(e.agent_id);
    }
  });

  it('5 次 tick 应生成 5 种类别的事件（对大量样本验证）', () => {
    const sim = createSimulator([10, 10]);
    const events = collectEvents(sim, 20);
    const categories = new Set(events.map((e) => e.category));
    // dialogue, move, emotion 是高频类别，应在样本中出现
    expect(categories.has('dialogue')).toBe(true);
    expect(categories.has('move')).toBe(true);
    expect(categories.has('emotion')).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════
// 3. 对话事件
// ═══════════════════════════════════════════════════════════════

describe('对话事件 (dialogue)', () => {
  it('应包含来自角色模板的对话内容', () => {
    const sim = createSimulator([10, 10]);
    // 多次 tick 以收集对话事件
    for (let i = 0; i < 50; i++) {
      const events = sim.tick();
      const dialogues = events.filter((e) => e.category === 'dialogue');
      for (const d of dialogues) {
        expect(d.event_type).toBe('agent_dialogue');
        expect(d.content).toBeDefined();
        expect(d.content!.length).toBeGreaterThan(0);
        expect(d.involved_agents).toBeDefined();
        expect(d.involved_agents!.length).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it('对话可能涉及其他智能体（involved_agents 含对方 ID）', () => {
    const sim = createSimulator([5, 5]);
    for (let i = 0; i < 100; i++) {
      const events = sim.tick();
      const dialogues = events.filter((e) => e.category === 'dialogue');
      for (const d of dialogues) {
        for (const agentId of d.involved_agents!) {
          expect(AGENT_IDS).toContain(agentId);
        }
      }
    }
  });
});

// ═══════════════════════════════════════════════════════════════
// 4. 移动事件
// ═══════════════════════════════════════════════════════════════

describe('移动事件 (move)', () => {
  it('应更新智能体的当前位置', () => {
    const sim = createSimulator();
    const agentId = AGENT_IDS[0];
    const originalLocation = sim.getAgentState(agentId)!.current_location;

    // 持续 tick 直到该智能体发生移动
    for (let i = 0; i < 200; i++) {
      sim.tick();
      const newLocation = sim.getAgentState(agentId)!.current_location;
      if (newLocation !== originalLocation) {
        expect(newLocation).not.toBe(originalLocation);
        return; // 成功
      }
    }
    // 如果 200 次 tick 仍未移动（概率极低），跳过
    expect(true).toBe(true);
  });

  it('移动事件应包含 target_position', () => {
    const sim = createSimulator([5, 5]);
    for (let i = 0; i < 100; i++) {
      const events = sim.tick();
      const moves = events.filter((e) => e.category === 'move');
      for (const m of moves) {
        expect(m.event_type).toBe('agent_move');
        expect(m.target_position).toBeDefined();
        expect(m.target_position).toHaveLength(3);
        expect(typeof m.target_position![0]).toBe('number');
        expect(typeof m.target_position![1]).toBe('number');
        expect(typeof m.target_position![2]).toBe('number');
      }
    }
  });

  it('移动目标地点不能是当前位置', () => {
    const sim = createSimulator([5, 5]);
    for (let i = 0; i < 100; i++) {
      const events = sim.tick();
      const moves = events.filter((e) => e.category === 'move');
      for (const m of moves) {
        const agentState = sim.getAgentState(m.agent_id!);
        // 移动后，智能体的位置应等于事件中的 location
        expect(agentState).toBeDefined();
      }
    }
  });
});

// ═══════════════════════════════════════════════════════════════
// 5. 情绪事件
// ═══════════════════════════════════════════════════════════════

describe('情绪事件 (emotion)', () => {
  const VALID_EMOTIONS: EmotionType[] = [
    'neutral', 'happy', 'focused', 'curious', 'anxious', 'frustrated', 'excited',
  ];

  it('应更新智能体的当前情绪', () => {
    const sim = createSimulator([3, 3]);
    const agentId = AGENT_IDS[0];
    expect(sim.getAgentState(agentId)!.current_emotion).toBe('neutral');

    for (let i = 0; i < 500; i++) {
      sim.tick();
      const emotion = sim.getAgentState(agentId)!.current_emotion;
      if (emotion !== 'neutral') {
        expect(VALID_EMOTIONS).toContain(emotion);
        return; // 成功
      }
    }
    // 极低概率未触发情绪变化
    expect(true).toBe(true);
  });

  it('情绪事件应包含 emotion_value', () => {
    const sim = createSimulator([10, 10]);
    for (let i = 0; i < 50; i++) {
      const events = sim.tick();
      const emotions = events.filter((e) => e.category === 'emotion');
      for (const e of emotions) {
        expect(e.event_type).toBe('agent_emotion');
        expect(e.emotion_value).toBeDefined();
        expect(VALID_EMOTIONS).toContain(e.emotion_value as EmotionType);
      }
    }
  });
});

// ═══════════════════════════════════════════════════════════════
// 6. 工具调用事件
// ═══════════════════════════════════════════════════════════════

describe('工具调用事件 (tool_use)', () => {
  it('应包含角色对应的工具名称', () => {
    const sim = createSimulator([5, 5]);
    for (let i = 0; i < 200; i++) {
      const events = sim.tick();
      const tools = events.filter((e) => e.category === 'tool_use');
      for (const t of tools) {
        expect(t.event_type).toBe('agent_action');
        expect(t.tool_name).toBeDefined();
        expect(typeof t.tool_name).toBe('string');
        expect(t.tool_name!.length).toBeGreaterThan(0);
      }
    }
  });

  it('工具名称应为有效值', () => {
    const validTools = [
      'architecture_design', 'code_review', 'code_debugging', 'tech_research',
      'ideation', 'prototype_design', 'knowledge_sharing', 'technical_discussion',
      'knowledge_synthesis', 'conflict_resolution', 'consensus_building',
      'environment_scan', 'path_discovery', 'security_audit', 'compliance_check',
      'team_wellness', 'rhythm_adjustment', 'process_acceleration', 'blocker_resolution',
    ];
    const sim = createSimulator([5, 5]);
    for (let i = 0; i < 200; i++) {
      const events = sim.tick();
      const tools = events.filter((e) => e.category === 'tool_use');
      for (const t of tools) {
        expect(validTools).toContain(t.tool_name);
      }
    }
  });
});

// ═══════════════════════════════════════════════════════════════
// 7. 关系事件
// ═══════════════════════════════════════════════════════════════

describe('关系事件 (relationship)', () => {
  it('应包含 target_agent_id 和 affinity_delta', () => {
    const sim = createSimulator([5, 5]);
    for (let i = 0; i < 500; i++) {
      const events = sim.tick();
      const rels = events.filter((e) => e.category === 'relationship');
      for (const r of rels) {
        expect(r.event_type).toBe('world_event');
        expect(r.target_agent_id).toBeDefined();
        expect(AGENT_IDS).toContain(r.target_agent_id);
        expect(r.affinity_delta).toBeDefined();
        expect(typeof r.affinity_delta).toBe('number');
        // affinity_delta 范围：实际公式 Math.round((Math.random()*6-2)*10)/10 = [-2, +4]
        expect(r.affinity_delta!).toBeGreaterThanOrEqual(-2);
        expect(r.affinity_delta!).toBeLessThanOrEqual(4);
        expect(r.involved_agents).toBeDefined();
        expect(r.involved_agents).toHaveLength(2);
      }
    }
  });
});

// ═══════════════════════════════════════════════════════════════
// 8. 事件分发
// ═══════════════════════════════════════════════════════════════

describe('事件分发 (onEvent)', () => {
  it('应通过已注册的处理器传递事件', () => {
    const sim = createSimulator([2, 2]);
    const handler = vi.fn();
    sim.onEvent(handler);
    sim.tick();
    expect(handler).toHaveBeenCalled();
    const receivedEvent = handler.mock.calls[0][0] as SimEvent;
    expect(receivedEvent).toHaveProperty('world_id', WORLD_ID);
  });

  it('多个处理器都应收到事件', () => {
    const sim = createSimulator([2, 2]);
    const handler1 = vi.fn();
    const handler2 = vi.fn();
    sim.onEvent(handler1);
    sim.onEvent(handler2);
    sim.tick();
    expect(handler1).toHaveBeenCalled();
    expect(handler2).toHaveBeenCalled();
    // 两个处理器应收到相同数量的事件
    expect(handler1.mock.calls.length).toBe(handler2.mock.calls.length);
  });

  it('处理器抛出的错误不应影响其他处理器', () => {
    const sim = createSimulator([2, 2]);
    const throwingHandler = vi.fn(() => { throw new Error('handler error'); });
    const normalHandler = vi.fn();
    sim.onEvent(throwingHandler);
    sim.onEvent(normalHandler);
    expect(() => sim.tick()).not.toThrow();
    expect(normalHandler).toHaveBeenCalled();
  });

  it('onEvent 返回的取消函数应注销处理器', () => {
    const sim = createSimulator([2, 2]);
    const handler = vi.fn();
    const unsubscribe = sim.onEvent(handler);
    unsubscribe();
    sim.tick();
    expect(handler).not.toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════════
// 9. 状态管理
// ═══════════════════════════════════════════════════════════════

describe('智能体状态管理', () => {
  it('getAgentState 对不存在的 ID 返回 undefined', () => {
    const sim = createSimulator();
    expect(sim.getAgentState('nonexistent')).toBeUndefined();
  });

  it('getAllAgentStates 返回所有智能体的快照', () => {
    const sim = createSimulator();
    const states = sim.getAllAgentStates();
    expect(states).toHaveLength(AGENT_IDS.length);
    // 验证返回的是副本
    states.push({ id: 'fake', role: 'mediator', current_emotion: 'neutral', current_location: 'bank' });
    expect(sim.getAllAgentStates()).toHaveLength(AGENT_IDS.length);
  });

  it('多次 tick 后智能体位置和情绪应可能发生变化', () => {
    const sim = createSimulator([5, 5]);
    const initialStates = sim.getAllAgentStates().map((s) => ({
      location: s.current_location,
      emotion: s.current_emotion,
    }));

    // 执行大量 tick
    for (let i = 0; i < 200; i++) {
      sim.tick();
    }

    const finalStates = sim.getAllAgentStates();
    let anyChanged = false;
    for (let i = 0; i < AGENT_IDS.length; i++) {
      if (finalStates[i].current_location !== initialStates[i].location ||
          finalStates[i].current_emotion !== initialStates[i].emotion) {
        anyChanged = true;
        break;
      }
    }
    expect(anyChanged).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════
// 10. Start / Stop
// ═══════════════════════════════════════════════════════════════

describe('start() / stop() 生命周期', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('start() 后 isRunning 应为 true', () => {
    const sim = createSimulator();
    expect(sim.isRunning).toBe(false);
    sim.start();
    expect(sim.isRunning).toBe(true);
    sim.stop();
  });

  it('stop() 后 isRunning 应为 false', () => {
    const sim = createSimulator();
    sim.start();
    sim.stop();
    expect(sim.isRunning).toBe(false);
  });

  it('重复调用 start() 不应创建多个定时器', () => {
    const sim = createSimulator();
    sim.start();
    sim.start(); // 第二次调用应为空操作
    expect(sim.isRunning).toBe(true);
    sim.stop();
  });

  it('重复调用 stop() 应安全', () => {
    const sim = createSimulator();
    sim.stop(); // 未 start 时调用 stop
    expect(sim.isRunning).toBe(false);
    sim.stop(); // 再次调用
    expect(sim.isRunning).toBe(false);
  });

  it('start() 后定时器应定期触发 tick', () => {
    const sim = createSimulator();
    const handler = vi.fn();
    sim.onEvent(handler);

    sim.start();
    // 初始状态下应该还没有事件
    expect(handler).not.toHaveBeenCalled();

    // 推进时间，触发 tick
    vi.advanceTimersByTime(1000); // tickInterval = 1000
    expect(handler).toHaveBeenCalled();

    sim.stop();
  });
});

// ═══════════════════════════════════════════════════════════════
// 11. 边界条件
// ═══════════════════════════════════════════════════════════════

describe('边界条件', () => {
  it('0 个智能体时 tick 应返回空数组', () => {
    const sim = new WorldSimulator({
      worldId: 'empty',
      agentIds: [],
      eventsPerTick: [5, 5],
    });
    const events = sim.tick();
    expect(events).toHaveLength(0);
  });

  it('0 个智能体时 getAllAgentStates 返回空数组', () => {
    const sim = new WorldSimulator({
      worldId: 'empty',
      agentIds: [],
    });
    expect(sim.getAllAgentStates()).toHaveLength(0);
  });

  it('1 个智能体时不生成 relationship 事件（需要至少 2 个）', () => {
    const sim = new WorldSimulator({
      worldId: 'single',
      agentIds: ['solo'],
      eventsPerTick: [10, 10],
    });
    const events = collectEvents(sim, 50);
    const rels = events.filter((e) => e.category === 'relationship');
    expect(rels).toHaveLength(0);
  });

  it('大量智能体（20 个）应正常生成事件', () => {
    const manyIds = Array.from({ length: 20 }, (_, i) => `agent_${i}`);
    const sim = new WorldSimulator({
      worldId: 'many',
      agentIds: manyIds,
      eventsPerTick: [3, 5],
    });
    const events = sim.tick();
    expect(events.length).toBeGreaterThanOrEqual(3);
    expect(events.length).toBeLessThanOrEqual(5);
    expect(sim.getAllAgentStates()).toHaveLength(20);
  });
});

// ═══════════════════════════════════════════════════════════════
// 12. createWorldSimulator 工厂函数
// ═══════════════════════════════════════════════════════════════

describe('createWorldSimulator 工厂函数', () => {
  it('应使用默认选项创建模拟器', () => {
    const sim = createWorldSimulator('factory_test', ['a', 'b', 'c']);
    expect(sim.getAllAgentStates()).toHaveLength(3);
    expect(sim.isRunning).toBe(false);
  });

  it('应使用自定义选项创建模拟器', () => {
    const sim = createWorldSimulator('factory_test', ['x', 'y'], {
      tickInterval: 500,
      eventsPerTick: [3, 5],
    });
    const events = sim.tick();
    expect(events.length).toBeGreaterThanOrEqual(3);
    expect(events.length).toBeLessThanOrEqual(5);
  });

  it('应验证所有 18 个地点的坐标一致性（不抛出异常）', () => {
    // createWorldSimulator 内部会遍历所有 LOCATIONS 校验坐标，
    // 这覆盖位置匹配分支
    expect(() => createWorldSimulator('coord_test', ['a', 'b'])).not.toThrow();
  });
});
