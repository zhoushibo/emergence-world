// @ts-nocheck
// ============================================================
// Narrative Director — 叙事导演 / 故事弧线编排 (JS 版)
// ============================================================

import { EventType } from './types.js';
import { llmClient } from './LLMClient.js';

// ─── 故事弧线模板 ───────────────────────────────────────

const DEFAULT_ARC_BEATS = [
  { phase: 'calm', description: '日常平静期，Agent 们各自活动', eventCategories: ['dialogue', 'emotion', 'move'], dramaRange: [0.2, 0.4] },
  { phase: 'calm', description: '微小的异常开始出现', eventCategories: ['dialogue', 'emotion', 'tool_use'], dramaRange: [0.3, 0.45] },
  { phase: 'rising', description: '异常扩大，分歧出现', eventCategories: ['dialogue', 'relationship', 'emotion'], dramaRange: [0.4, 0.6] },
  { phase: 'rising', description: '冲突升级，需调解', eventCategories: ['dialogue', 'relationship', 'tool_use'], dramaRange: [0.5, 0.7] },
  { phase: 'climax', description: '高潮事件爆发', eventCategories: ['dialogue', 'relationship', 'emotion'], dramaRange: [0.7, 0.9] },
  { phase: 'falling', description: '高潮后的余波', eventCategories: ['dialogue', 'emotion', 'move'], dramaRange: [0.5, 0.7] },
  { phase: 'resolution', description: '新的平衡建立', eventCategories: ['dialogue', 'emotion', 'relationship'], dramaRange: [0.3, 0.5] },
  { phase: 'resolution', description: '反思和收获', eventCategories: ['dialogue', 'emotion', 'tool_use'], dramaRange: [0.2, 0.4] },
];

// ─── 场景类型推断 ────────────────────────────────────────

function inferSceneType(events) {
  const hasDrama = events.some(
    (e) => e.event_type === EventType.DRAMA_INJECT || e.event_type === EventType.DRAMA_ANCHOR,
  );
  const hasConflict = events.some(
    (e) => e.affinity_delta !== undefined && e.affinity_delta < 0,
  );
  const hasEmotionPeak = events.some(
    (e) => e.emotion_deltas?.some((ed) => Math.abs(ed.delta) > 0.3),
  );

  if (hasDrama) return 'climax';
  if (hasConflict) return 'rising_action';
  if (hasEmotionPeak) return 'rising_action';

  const dialogueCount = events.filter((e) => e.category === 'dialogue').length;
  if (dialogueCount > events.length * 0.5) return 'exposition';
  return 'transition';
}

// ─── NarrativeDirector ───────────────────────────────────

export class NarrativeDirector {
  constructor(memorySystem) {
    this.activeArc = null;
    this.currentBeatIndex = 0;
    this.dramaLevel = 0.3;
    this.tickCount = 0;
    this.beatTickCounter = 0;
    this.beats = [...DEFAULT_ARC_BEATS];
    this.arcs = [];
    this.anchors = [];
    this.memorySystem = memorySystem;
  }

  /** 每 tick 调用，更新世界状态 */
  async tick(worldId, recentEvents) {
    this.tickCount++;
    this.beatTickCounter++;

    // 每 10 个 tick（~30s）推进一次节拍
    if (this.beatTickCounter >= 10 && this.currentBeatIndex < this.beats.length - 1) {
      this.currentBeatIndex++;
      this.beatTickCounter = 0;
      const beat = this.beats[this.currentBeatIndex];
      this.dramaLevel = (beat.dramaRange[0] + beat.dramaRange[1]) / 2;
    }

    // 随事件波动小幅调整 drama_level
    const highImpactEvents = recentEvents.filter(
      (e) => e.emotion_deltas?.some((ed) => Math.abs(ed.delta) > 0.5),
    );
    if (highImpactEvents.length > 0) {
      this.dramaLevel = Math.min(1, this.dramaLevel + 0.05 * highImpactEvents.length);
    } else {
      this.dramaLevel = Math.max(0.2, this.dramaLevel - 0.01);
    }

    // 每 20 tick 尝试推进故事弧线
    if (this.tickCount % 20 === 0 && recentEvents.length > 0) {
      await this.advanceNarrative(worldId, recentEvents);
    }
  }

  /** 推进叙事 */
  async advanceNarrative(worldId, recentEvents) {
    const sceneType = inferSceneType(recentEvents);
    const location = recentEvents.find((e) => e.location)?.location ?? 'unknown';
    const agentsInvolved = [...new Set(recentEvents.map((e) => e.agent_id).filter(Boolean))];

    const scene = {
      scene_id: `scene_${Date.now().toString(36)}`,
      chapter_id: this.activeArc?.chapters.length
        ? this.activeArc.chapters[this.activeArc.chapters.length - 1].chapter_id
        : '',
      scene_type: sceneType,
      location,
      agents_present: agentsInvolved,
      dialogues: recentEvents
        .filter((e) => e.category === 'dialogue' && e.content)
        .map((e) => ({
          agent_id: e.agent_id,
          content: e.content,
          emotion: e.emotion_value ?? 'neutral',
        })),
      actions: [],
      emotion_atmosphere: {},
      narrative_text: '',
      event_ids: recentEvents.map((e) => e.event_id),
      order: this.tickCount,
    };

    // 如果没有活跃弧线，创建一个
    if (!this.activeArc) {
      this.activeArc = {
        arc_id: `arc_${Date.now().toString(36)}`,
        world_id: worldId,
        title: `第 ${this.arcs.length + 1} 幕：${this.beats[this.currentBeatIndex].description}`,
        premise: '一个 AI 智能体城市的故事',
        chapters: [],
        target_chapters: 10,
        genre: 'literary_fiction',
        style: 'realistic',
        status: 'active',
      };
    }

    // 添加到当前章节
    const currentPhase = this.beats[this.currentBeatIndex].phase;
    const phaseMap = {
      calm: 'setup',
      rising: 'confrontation',
      climax: 'confrontation',
      falling: 'resolution',
      resolution: 'resolution',
    };

    let currentChapter = this.activeArc.chapters[this.activeArc.chapters.length - 1];
    if (!currentChapter || currentChapter.scenes.length >= 3) {
      currentChapter = {
        chapter_id: `ch_${this.activeArc.chapters.length + 1}_${Date.now().toString(36).slice(-6)}`,
        world_id: worldId,
        title: `章节 ${this.activeArc.chapters.length + 1}`,
        theme: this.beats[this.currentBeatIndex].description,
        phase: phaseMap[currentPhase] ?? 'setup',
        scenes: [],
        conflict: '',
        climax_description: '',
        resolution: '',
        drama_level: this.dramaLevel,
        word_count_target: 3000,
        narrative_text: '',
      };
      this.activeArc.chapters.push(currentChapter);
    }

    currentChapter.scenes.push(scene);
  }

  /** 获取导演状态 */
  getDirectorState() {
    return {
      world_id: 'modern_city_01',
      drama_level: this.dramaLevel,
      anchors: this.anchors,
      current_phase: this.beats[this.currentBeatIndex].phase,
    };
  }

  /** 获取当前故事节拍信息 */
  getCurrentBeat() {
    return this.beats[this.currentBeatIndex];
  }

  /** 获取所有叙事弧 */
  getArcs() {
    if (this.activeArc) {
      return [this.activeArc, ...this.arcs];
    }
    return [...this.arcs];
  }

  /** 获取当前活跃弧线 */
  getActiveArc() {
    return this.activeArc;
  }

  /** 设置导演锚点 */
  setAnchor(anchorId, description, targetAgents) {
    const anchor = { anchor_id: anchorId, description, target_agents: targetAgents };
    this.anchors.push(anchor);
    return anchor;
  }

  /** 注入事件 */
  injectDrama(description, targetAgent) {
    const event = {
      event_id: `drama_${Date.now().toString(36)}`,
      category: 'dialogue',
      event_type: EventType.DRAMA_INJECT,
      world_id: 'modern_city_01',
      agent_id: targetAgent ?? 'narrator',
      location: 'city_center',
      content: description,
      involved_agents: targetAgent ? [targetAgent] : [],
      timestamp: new Date().toISOString(),
      emotion_deltas: [{ emotion: 'surprise', delta: 0.5, residue_intensity: 0.3 }],
    };
    this.dramaLevel = Math.min(1, this.dramaLevel + 0.1);
    return event;
  }

  /** 当前推荐的事件类别（供 CognitiveSimulator 使用） */
  getRecommendedEventCategories() {
    return this.beats[this.currentBeatIndex].eventCategories;
  }
}

