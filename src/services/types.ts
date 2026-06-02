// ============================================================
// IDA World API 类型定义
// 对接 IDA Service (FastAPI) 后端 16 个路由组
// ============================================================

// --- 世界事件 ---

export type EventType =
  | 'agent_dialogue'
  | 'agent_move'
  | 'agent_emotion'
  | 'agent_action'
  | 'world_event';

// --- 智能体 ---

export interface AgentData {
  id: string;
  name: string;
  role: string;
  position: [number, number, number];
  mood: string;
  energy: number;
  location?: string;
  emotion?: string;
  color?: string;
}

// --- 世界事件 ---

export interface WorldEvent {
  event_id: string;
  event_type: EventType;
  world_id: string;
  agent_id?: string;
  location?: string;
  content?: string;
  involved_agents?: string[];
  timestamp?: string;
}

// --- 世界统计 ---

export interface WorldStats {
  total: number;
  by_type: Record<string, number>;
}

// --- 地标 / 位置 ---

export interface LocationData {
  id: string;
  name: string;
  type: string;
  capacity: number;
  position: [number, number, number];
}

// --- 导演 ---

export interface DirectorAnchor {
  anchor_id: string;
  description: string;
  target_agents?: string[];
}

export interface DirectorState {
  world_id: string;
  drama_level: number;
  anchors: DirectorAnchor[];
}

// --- Workflow ---

export interface WorkflowInstance {
  instance_id: string;
  workflow_name: string;
  status: string;
  current_node: string;
  completed_nodes: string[];
  results: Record<string, unknown>;
}

// --- 叙事弧 ---

export interface NarrativeChapter {
  chapter_id: string;
  theme: string;
  phase: string;
}

export interface NarrativeArc {
  arc_id: string;
  title: string;
  chapters: NarrativeChapter[];
}

// --- 场景 ---

export interface Scene {
  scene_id: string;
  location: string;
  agents_present: string[];
  scene_type: string;
  dialogue_count: number;
  emotion_atmosphere: Record<string, number>;
}

// --- 记忆 ---

export interface MemoryEntry {
  id: string;
  content: string;
  importance: number;
  clarity: number;
}

// --- 关系 ---

export interface Relationship {
  type: string;
  affinity: number;
  tone: string;
  interactions: number;
}

// --- 工具 ---

export interface ToolInfo {
  name: string;
  tier: string;
  model_tier: string;
}

// --- Skill 执行 ---

export type ModelTier = 'L0' | 'L1' | 'L2' | 'L3';

export type SkillExecutionStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface SkillExecution {
  id: string;
  skillName: string;
  modelTier: ModelTier;
  status: SkillExecutionStatus;
  input: string;
  output: string;
  startTime: number;
  endTime: number | null;
  error: string | null;
}

// --- API 响应包装 ---

export interface ApiResponse<T> {
  status: 'ok' | 'error';
  data?: T;
  message?: string;
}