// ============================================================
// useStore (Zustand) — TDD 单元测试
// 覆盖同步 Actions + 异步 Actions + 边界条件
// ============================================================

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useStore } from './useStore';

// ─── Mock 外部依赖 ───────────────────────────────────────────

vi.mock('../services/api', () => ({
  api: {
    getWorldStats: vi.fn(),
    getDirectorState: vi.fn(),
    emitEvent: vi.fn(),
  },
}));

vi.mock('../services/database', () => ({
  agentDB: { put: vi.fn() },
  eventDB: { add: vi.fn() },
}));

// ─── 初始状态快照（用于 beforeEach 重置） ────────────────────

const INITIAL_STATE = {
  agents: [],
  logs: [],
  mode: 'cinematic' as const,
  selectedAgentId: null,
  selectedLocationId: null,
  connected: false,
  eventCount: 0,
  dramaLevel: 0.5,
  activeDialogues: {},
  simEvents: [],
  skillExecutions: [],
  worldTime: Date.now(),
  isSimulating: false,
};

// ═══════════════════════════════════════════════════════════════
// Group A：同步 Actions
// ═══════════════════════════════════════════════════════════════

describe('setMode', () => {
  beforeEach(() => {
    useStore.setState(INITIAL_STATE);
  });

  it('应设置 mode 为 cinematic', () => {
    useStore.getState().setMode('cinematic');
    expect(useStore.getState().mode).toBe('cinematic');
  });

  it('应设置 mode 为 immersive', () => {
    useStore.getState().setMode('immersive');
    expect(useStore.getState().mode).toBe('immersive');
  });
});

describe('setDramaLevel', () => {
  beforeEach(() => {
    useStore.setState(INITIAL_STATE);
  });

  it('应设置 dramaLevel 为指定值', () => {
    useStore.getState().setDramaLevel(0.8);
    expect(useStore.getState().dramaLevel).toBe(0.8);
  });

  it('应允许设置 dramaLevel 为 0', () => {
    useStore.getState().setDramaLevel(0);
    expect(useStore.getState().dramaLevel).toBe(0);
  });

  it('应允许设置 dramaLevel 为 1', () => {
    useStore.getState().setDramaLevel(1);
    expect(useStore.getState().dramaLevel).toBe(1);
  });
});

describe('setConnected', () => {
  beforeEach(() => {
    useStore.setState(INITIAL_STATE);
  });

  it('应设置 connected 为 true', () => {
    useStore.getState().setConnected(true);
    expect(useStore.getState().connected).toBe(true);
  });

  it('应设置 connected 为 false', () => {
    useStore.getState().setConnected(false);
    expect(useStore.getState().connected).toBe(false);
  });
});

describe('setSelectedAgent', () => {
  beforeEach(() => {
    useStore.setState(INITIAL_STATE);
  });

  it('应设置 selectedAgentId', () => {
    useStore.getState().setSelectedAgent('agent_01');
    expect(useStore.getState().selectedAgentId).toBe('agent_01');
  });

  it('应允许设置 selectedAgentId 为 null（取消选择）', () => {
    useStore.getState().setSelectedAgent('agent_01');
    useStore.getState().setSelectedAgent(null);
    expect(useStore.getState().selectedAgentId).toBeNull();
  });
});

describe('setSelectedLocation', () => {
  beforeEach(() => {
    useStore.setState(INITIAL_STATE);
  });

  it('应设置 selectedLocationId', () => {
    useStore.getState().setSelectedLocation('central_park');
    expect(useStore.getState().selectedLocationId).toBe('central_park');
  });

  it('应允许设置 selectedLocationId 为 null', () => {
    useStore.getState().setSelectedLocation(null);
    expect(useStore.getState().selectedLocationId).toBeNull();
  });
});

describe('setActiveDialogue / clearDialogue', () => {
  beforeEach(() => {
    useStore.setState(INITIAL_STATE);
  });

  it('setActiveDialogue 应为指定智能体设置对话文本', () => {
    useStore.getState().setActiveDialogue('agent_a', 'Hello!');
    expect(useStore.getState().activeDialogues['agent_a']).toBe('Hello!');
  });

  it('setActiveDialogue 应保留其他智能体的对话', () => {
    useStore.getState().setActiveDialogue('agent_a', 'Hello!');
    useStore.getState().setActiveDialogue('agent_b', 'Hi!');
    expect(useStore.getState().activeDialogues['agent_a']).toBe('Hello!');
    expect(useStore.getState().activeDialogues['agent_b']).toBe('Hi!');
  });

  it('clearDialogue 应移除指定智能体的对话', () => {
    useStore.getState().setActiveDialogue('agent_a', 'Hello!');
    useStore.getState().clearDialogue('agent_a');
    expect(useStore.getState().activeDialogues['agent_a']).toBeUndefined();
  });

  it('clearDialogue 不应影响其他智能体的对话', () => {
    useStore.getState().setActiveDialogue('agent_a', 'Hello!');
    useStore.getState().setActiveDialogue('agent_b', 'Hi!');
    useStore.getState().clearDialogue('agent_a');
    expect(useStore.getState().activeDialogues['agent_b']).toBe('Hi!');
  });
});

// ═══════════════════════════════════════════════════════════════
// Group B：模拟引擎 Actions
// ═══════════════════════════════════════════════════════════════

describe('addSimEvent', () => {
  beforeEach(() => {
    useStore.setState(INITIAL_STATE);
  });

  const makeEvent = (id: string) => ({
    event_id: id,
    event_type: 'agent_dialogue' as const,
    world_id: 'modern_city_01',
    agent_id: 'agent_a',
    category: 'dialogue' as const,
    timestamp: new Date().toISOString(),
  });

  it('应添加模拟事件到 simEvents', () => {
    const event = makeEvent('evt_001');
    useStore.getState().addSimEvent(event);
    expect(useStore.getState().simEvents).toContainEqual(event);
  });

  it('应保留最近 50 条 simEvents', () => {
    for (let i = 0; i < 55; i++) {
      useStore.getState().addSimEvent(makeEvent('evt_' + i));
    }
    expect(useStore.getState().simEvents.length).toBe(50);
  });

  it('超过 50 条时应丢弃最早的事件', () => {
    for (let i = 0; i < 55; i++) {
      useStore.getState().addSimEvent(makeEvent('evt_' + i));
    }
    const firstId = useStore.getState().simEvents[0].event_id;
    expect(firstId).toBe('evt_5');
  });
});

describe('consumeSimEvent', () => {
  beforeEach(() => {
    useStore.setState(INITIAL_STATE);
  });

  it('应按 event_id 移除模拟事件', () => {
    useStore.getState().addSimEvent({
      event_id: 'evt_001',
      event_type: 'agent_dialogue',
      world_id: 'modern_city_01',
      agent_id: 'agent_a',
      category: 'dialogue',
      timestamp: new Date().toISOString(),
    });
    useStore.getState().consumeSimEvent('evt_001');
    expect(useStore.getState().simEvents.find((e) => e.event_id === 'evt_001')).toBeUndefined();
  });

  it('消费不存在的事件不应抛出错误', () => {
    expect(() => useStore.getState().consumeSimEvent('nonexistent')).not.toThrow();
  });
});

describe('addSkillExecution', () => {
  beforeEach(() => {
    useStore.setState(INITIAL_STATE);
  });

  const makeExec = (id: string) => ({
    id,
    skillName: 'code_review',
    modelTier: 'L2' as const,
    status: 'pending' as const,
    input: 'review this code',
    output: '',
    startTime: Date.now(),
    endTime: null,
    error: null,
  });

  it('应添加技能执行记录', () => {
    useStore.getState().addSkillExecution(makeExec('exec_001'));
    expect(useStore.getState().skillExecutions).toHaveLength(1);
  });

  it('应保留最近 20 条技能执行记录', () => {
    for (let i = 0; i < 25; i++) {
      useStore.getState().addSkillExecution(makeExec('exec_' + i));
    }
    expect(useStore.getState().skillExecutions.length).toBe(20);
  });
});

describe('updateSkillExecution', () => {
  beforeEach(() => {
    useStore.setState(INITIAL_STATE);
  });

  it('应按 id 更新技能执行状态', () => {
    useStore.getState().addSkillExecution({
      id: 'exec_001', skillName: 'code_review', modelTier: 'L2',
      status: 'pending', input: '', output: '', startTime: 0, endTime: null, error: null,
    });
    useStore.getState().updateSkillExecution('exec_001', { status: 'completed', output: 'done' });
    const exec = useStore.getState().skillExecutions.find((e) => e.id === 'exec_001')!;
    expect(exec.status).toBe('completed');
    expect(exec.output).toBe('done');
  });

  it('更新不存在的 id 不应影响任何记录', () => {
    useStore.getState().addSkillExecution({
      id: 'exec_001', skillName: 'code_review', modelTier: 'L2',
      status: 'pending', input: '', output: '', startTime: 0, endTime: null, error: null,
    });
    expect(() => useStore.getState().updateSkillExecution('nonexistent', { status: 'completed' })).not.toThrow();
    expect(useStore.getState().skillExecutions).toHaveLength(1);
  });
});

describe('updateAgentState', () => {
  beforeEach(() => {
    useStore.setState(INITIAL_STATE);
  });

  const agentA = {
    id: 'agent_a', name: 'Alice', role: 'mediator',
    position: [0, 0, 0] as [number, number, number],
    mood: 'neutral', energy: 100,
  };

  it('应按 agentId 更新智能体属性', () => {
    useStore.setState({ agents: [agentA] });
    useStore.getState().updateAgentState('agent_a', { mood: 'happy', energy: 80 });
    const agent = useStore.getState().agents[0];
    expect(agent.mood).toBe('happy');
    expect(agent.energy).toBe(80);
  });

  it('更新不存在的 agentId 不应添加新智能体', () => {
    useStore.setState({ agents: [agentA] });
    useStore.getState().updateAgentState('nonexistent', { mood: 'happy' });
    expect(useStore.getState().agents).toHaveLength(1);
  });

  it('部分更新应保留未修改的属性', () => {
    useStore.setState({ agents: [agentA] });
    useStore.getState().updateAgentState('agent_a', { mood: 'happy' });
    const agent = useStore.getState().agents[0];
    expect(agent.name).toBe('Alice');
    expect(agent.role).toBe('mediator');
    expect(agent.energy).toBe(100);
  });
});

describe('setWorldTime / setIsSimulating', () => {
  beforeEach(() => {
    useStore.setState(INITIAL_STATE);
  });

  it('setWorldTime 应更新世界时间', () => {
    const t = 1700000000000;
    useStore.getState().setWorldTime(t);
    expect(useStore.getState().worldTime).toBe(t);
  });

  it('setIsSimulating 应更新模拟状态', () => {
    useStore.getState().setIsSimulating(true);
    expect(useStore.getState().isSimulating).toBe(true);
  });

  it('setIsSimulating 应允许设为 false', () => {
    useStore.getState().setIsSimulating(false);
    expect(useStore.getState().isSimulating).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════
// Group C：异步 API Actions（边际条件 + 错误路径）
// ═══════════════════════════════════════════════════════════════

describe('addLog', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(1700000000000);
    useStore.setState(INITIAL_STATE);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('应添加日志消息到 logs 数组头部', async () => {
    await useStore.getState().addLog('agent moved');
    const logs = useStore.getState().logs;
    expect(logs[0].message).toBe('agent moved');
  });

  it('应为日志设置正确的时间戳', async () => {
    await useStore.getState().addLog('test');
    expect(useStore.getState().logs[0].timestamp).toBe(1700000000000);
  });

  it('应将日志持久化到 eventDB', async () => {
    const { eventDB } = await import('../services/database');
    await useStore.getState().addLog('persist me');
    expect(eventDB.add).toHaveBeenCalledWith({
      message: 'persist me',
      timestamp: 1700000000000,
    });
  });

  it('新日志应出现在旧日志之前', async () => {
    await useStore.getState().addLog('first');
    await useStore.getState().addLog('second');
    expect(useStore.getState().logs[0].message).toBe('second');
    expect(useStore.getState().logs[1].message).toBe('first');
  });

  it('超过 50 条日志时应丢弃最旧的', async () => {
    for (let i = 0; i < 55; i++) {
      await useStore.getState().addLog('log_' + i);
    }
    expect(useStore.getState().logs.length).toBe(50);
    const lastLog = useStore.getState().logs[49];
    expect(lastLog.message).toBe('log_5');
  });
});

describe('fetchWorldStats', () => {
  beforeEach(() => {
    useStore.setState(INITIAL_STATE);
  });

  it('应从 API 获取世界统计并更新 eventCount', async () => {
    const { api } = await import('../services/api');
    vi.mocked(api.getWorldStats).mockResolvedValueOnce({ total: 42, by_type: {} });
    vi.mocked(api.getDirectorState).mockResolvedValueOnce({
      world_id: 'modern_city_01', drama_level: 0.9, anchors: [],
    });

    await useStore.getState().fetchWorldStats();

    expect(useStore.getState().eventCount).toBe(42);
  });

  it('应从 API 获取导演状态并更新 dramaLevel', async () => {
    const { api } = await import('../services/api');
    vi.mocked(api.getWorldStats).mockResolvedValueOnce({ total: 10, by_type: {} });
    vi.mocked(api.getDirectorState).mockResolvedValueOnce({
      world_id: 'modern_city_01', drama_level: 0.9, anchors: [],
    });

    await useStore.getState().fetchWorldStats();

    expect(useStore.getState().dramaLevel).toBe(0.9);
  });

  it('API 调用失败时不抛出错误并保留原状态', async () => {
    const { api } = await import('../services/api');
    vi.mocked(api.getWorldStats).mockRejectedValueOnce(new Error('Network error'));

    await expect(useStore.getState().fetchWorldStats()).resolves.toBeUndefined();

    expect(useStore.getState().eventCount).toBe(0);
    expect(useStore.getState().dramaLevel).toBe(0.5);
  });

  it('getDirectorState 失败时仍应更新 eventCount', async () => {
    const { api } = await import('../services/api');
    vi.mocked(api.getWorldStats).mockResolvedValueOnce({ total: 99, by_type: {} });
    vi.mocked(api.getDirectorState).mockRejectedValueOnce(new Error('Not found'));

    await useStore.getState().fetchWorldStats();

    expect(useStore.getState().eventCount).toBe(99);
    expect(useStore.getState().dramaLevel).toBe(0.5);
  });
});

describe('emitEvent', () => {
  beforeEach(() => {
    useStore.setState(INITIAL_STATE);
  });

  it('应调用 API 发送事件', async () => {
    const { api } = await import('../services/api');
    vi.mocked(api.emitEvent).mockResolvedValueOnce({ event_id: 'new_001' });

    await useStore.getState().emitEvent({ event_type: 'agent_dialogue', content: 'hello' });

    expect(api.emitEvent).toHaveBeenCalledWith('modern_city_01', {
      event_type: 'agent_dialogue',
      content: 'hello',
    });
  });

  it('发送成功后应递增 eventCount', async () => {
    const { api } = await import('../services/api');
    vi.mocked(api.emitEvent).mockResolvedValueOnce({ event_id: 'new_001' });

    await useStore.getState().emitEvent({ event_type: 'agent_dialogue' });

    expect(useStore.getState().eventCount).toBe(1);
  });

  it('API 调用失败时应静默处理不抛出', async () => {
    const { api } = await import('../services/api');
    vi.mocked(api.emitEvent).mockRejectedValueOnce(new Error('Server down'));

    await expect(useStore.getState().emitEvent({ event_type: 'agent_dialogue' })).resolves.toBeUndefined();
    expect(useStore.getState().eventCount).toBe(0);
  });
});
