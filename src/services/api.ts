// ============================================================
// IDA World REST API 客户端
// 对接 IDA Service (FastAPI) 后端
// ============================================================

import type {
  WorldEvent,
  WorldStats,
  DirectorState,
  WorkflowInstance,
  NarrativeArc,
  Scene,
  MemoryEntry,
  Relationship,
  ToolInfo,
} from './types';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8080';

class IDAApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string = API_BASE) {
    this.baseUrl = baseUrl;
  }

  /** 设置认证 token */
  setToken(token: string) {
    this.token = token;
  }

  /** 清除认证 token */
  clearToken() {
    this.token = null;
  }

  /** 通用请求方法 */
  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
      ...((options.headers as Record<string, string>) || {}),
    };
    const res = await fetch(`${this.baseUrl}${path}`, { ...options, headers });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`API error ${res.status}: ${res.statusText}${body ? ` — ${body}` : ''}`);
    }
    return res.json() as Promise<T>;
  }

  // ─── 健康检查 ─────────────────────────────────────────────

  async health() {
    return this.request<{ status: string; version: string }>('/health');
  }

  // ─── 世界事件 ─────────────────────────────────────────────

  async emitEvent(worldId: string, event: Partial<WorldEvent>) {
    return this.request<{ event_id: string }>(`/v1/worlds/${worldId}/events`, {
      method: 'POST',
      body: JSON.stringify(event),
    });
  }

  async queryEvents(
    worldId: string,
    params?: {
      event_type?: string;
      agent_id?: string;
      location?: string;
      limit?: number;
    },
  ) {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined) query.set(k, String(v));
      });
    }
    return this.request<{ events: WorldEvent[]; count: number }>(
      `/v1/worlds/${worldId}/events?${query}`,
    );
  }

  async getWorldStats(worldId: string) {
    return this.request<WorldStats>(`/v1/worlds/${worldId}/stats`);
  }

  // ─── 导演控制 ─────────────────────────────────────────────

  async getDirectorState(worldId: string) {
    return this.request<DirectorState>(`/v1/worlds/${worldId}/director/state`);
  }

  async setDramaLevel(worldId: string, level: number) {
    return this.request<{ world_id: string; drama_level: number }>(
      `/v1/worlds/${worldId}/director/drama_level`,
      {
        method: 'POST',
        body: JSON.stringify({ level }),
      },
    );
  }

  async setAnchor(
    worldId: string,
    anchorId: string,
    description: string,
    targetAgents?: string[],
  ) {
    return this.request<void>(`/v1/worlds/${worldId}/director/anchor`, {
      method: 'POST',
      body: JSON.stringify({
        anchor_id: anchorId,
        description,
        target_agents: targetAgents,
      }),
    });
  }

  async injectEvent(
    worldId: string,
    eventType: string,
    content: string,
    options?: { agent_id?: string; location?: string; involved_agents?: string[] },
  ) {
    return this.request<{ event_id: string }>(
      `/v1/worlds/${worldId}/director/inject`,
      {
        method: 'POST',
        body: JSON.stringify({ event_type: eventType, content, ...options }),
      },
    );
  }

  // ─── 叙事弧 ───────────────────────────────────────────────

  async createArc(
    worldId: string,
    title: string,
    premise: string,
    chapterThemes: string[],
  ) {
    return this.request<NarrativeArc>(`/v1/narrative/${worldId}/arcs`, {
      method: 'POST',
      body: JSON.stringify({ title, premise, chapter_themes: chapterThemes }),
    });
  }

  async listArcs(worldId: string) {
    return this.request<{ arcs: NarrativeArc[] }>(`/v1/narrative/${worldId}/arcs`);
  }

  async extractScenes(worldId: string, agentId?: string) {
    const query = agentId ? `?agent_id=${agentId}` : '';
    return this.request<{ scenes: Scene[]; count: number }>(
      `/v1/narrative/${worldId}/scenes${query}`,
    );
  }

  // ─── Workflow ─────────────────────────────────────────────

  async startWorkflow(workflowName: string, input?: Record<string, unknown>) {
    return this.request<WorkflowInstance>('/v1/workflows/instances', {
      method: 'POST',
      body: JSON.stringify({ workflow_name: workflowName, input }),
    });
  }

  async getWorkflowInstance(instanceId: string) {
    return this.request<WorkflowInstance>(`/v1/workflows/instances/${instanceId}`);
  }

  async listWorkflowInstances(workflowName?: string) {
    const query = workflowName ? `?workflow_name=${workflowName}` : '';
    return this.request<{ instances: WorkflowInstance[] }>(
      `/v1/workflows/instances${query}`,
    );
  }

  async approveWorkflow(instanceId: string, decision: boolean, reason?: string) {
    return this.request<WorkflowInstance>(
      `/v1/workflows/instances/${instanceId}/approve`,
      {
        method: 'POST',
        body: JSON.stringify({ decision, reason }),
      },
    );
  }

  // ─── 工具 ─────────────────────────────────────────────────

  async listTools(location?: string, role?: string) {
    const query = new URLSearchParams();
    if (location) query.set('location', location);
    if (role) query.set('role', role);
    return this.request<{ tools: ToolInfo[] }>(`/v1/tools/list?${query}`);
  }

  async executeTool(
    agentId: string,
    toolName: string,
    params: Record<string, unknown> = {},
  ) {
    return this.request<{ status: string; tool: string; agent: string; message: string }>(
      '/v1/tools/execute',
      {
        method: 'POST',
        body: JSON.stringify({ agent_id: agentId, tool_name: toolName, params }),
      },
    );
  }

  // ─── 记忆 ─────────────────────────────────────────────────

  async searchMemories(agentId: string, query: string, limit: number = 10) {
    return this.request<{ results: MemoryEntry[] }>('/v1/memory/search', {
      method: 'POST',
      body: JSON.stringify({ agent_id: agentId, query, limit }),
    });
  }

  async addMemory(agentId: string, content: string, importance: number = 0.5) {
    return this.request<{ memory_id: string }>('/v1/memory/add', {
      method: 'POST',
      body: JSON.stringify({ agent_id: agentId, content, importance }),
    });
  }

  async getRelationship(agentA: string, agentB: string) {
    return this.request<{ relationship: Relationship | null }>(
      `/v1/memory/relationship/${agentA}/${agentB}`,
    );
  }

  // ─── 代码沙箱 ─────────────────────────────────────────────

  async executeCode(agentId: string, code: string, language: string = 'python') {
    return this.request<{ output: string; error?: string }>('/v1/sandbox/execute', {
      method: 'POST',
      body: JSON.stringify({ agent_id: agentId, code, language }),
    });
  }

  // ─── 语义缓存 ─────────────────────────────────────────────

  async cacheGet(key: string) {
    return this.request<{ hit: boolean; value?: unknown }>(
      `/v1/cache/${encodeURIComponent(key)}`,
    );
  }

  async cacheSet(key: string, value: unknown, ttl?: number) {
    return this.request<void>('/v1/cache/set', {
      method: 'POST',
      body: JSON.stringify({ key, value, ttl }),
    });
  }

  // ─── 全链路追踪 ───────────────────────────────────────────

  async getTrace(traceId: string) {
    return this.request<Record<string, unknown>>(`/v1/trace/${traceId}`);
  }
}

/** 全局 API 客户端单例 */
export const api = new IDAApiClient();
export default api;