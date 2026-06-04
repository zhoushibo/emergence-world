// @ts-nocheck
// ============================================================
// Cognitive Engine Types (JS 版)
// 对齐后端 IDA Service 数据结构 (events/models, memory/service, narrative/models)
// ============================================================

// ─── 事件类型（对齐 events/models.py EventType） ─────────────

export const EventType = Object.freeze({
  AGENT_ACTION: 'agent_action',
  AGENT_DIALOGUE: 'agent_dialogue',
  AGENT_MOVE: 'agent_move',
  AGENT_EMOTION: 'agent_emotion',
  AGENT_NEED: 'agent_need',
  AGENT_THINK: 'agent_think',
  WORLD_TICK: 'world_tick',
  WORLD_EVENT: 'world_event',
  WORLD_WEATHER: 'world_weather',
  RELATIONSHIP_CHANGE: 'relationship_change',
  ECONOMIC_TRANSACTION: 'economic_transaction',
  DRAMA_INJECT: 'drama_inject',
  DRAMA_ANCHOR: 'drama_anchor',
  DRAMA_LEVEL_CHANGE: 'drama_level_change',
  TOOL_USE: 'tool_use',
  CODE_EXECUTE: 'code_execute',
});

// ─── 情绪类型（对齐 EmotionType） ──────────────────────────

export const EmotionType = Object.freeze({
  NEUTRAL: 'neutral',
  ANGER: 'anger',
  FEAR: 'fear',
  SADNESS: 'sadness',
  DESPAIR: 'despair',
  HOPE: 'hope',
  JOY: 'joy',
});

// ─── 叙事系统 ─────────────────────────────────────────────

export const SceneType = Object.freeze({
  EXPOSITION: 'exposition',
  RISING_ACTION: 'rising_action',
  CLIMAX: 'climax',
  FALLING_ACTION: 'falling_action',
  RESOLUTION: 'resolution',
  TRANSITION: 'transition',
});

export const ChapterPhase = Object.freeze({
  SETUP: 'setup',
  CONFRONTATION: 'confrontation',
  RESOLUTION: 'resolution',
});

