// @ts-nocheck
// ============================================================
// Memory System — 记忆存储、检索、衰减、关系图谱 (JS 版)
// ============================================================

// ─── 记忆服务 ──────────────────────────────────────────────

export class MemorySystem {
  constructor() {
    this.memories = new Map();        // agentId → LongTermMemory[]
    this.eventLog = [];              // MemoryEvent[]
    this.relationships = new Map();  // "a:b" → AgentRelationship
    this.decayRate = 0.02;
    this.minClarity = 0.3;
  }

  // ─── 长期记忆 ─────────────────────────────────────────

  /** 添加一条记忆 */
  addMemory(agentId, content, importance = 0.5) {
    const memory = {
      memory_id: `mem_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      agent_id: agentId,
      content,
      importance,
      chapter_age: 0,
      clarity: 1.0,
    };
    const list = this.memories.get(agentId) ?? [];
    list.push(memory);
    this.memories.set(agentId, list);
  }

  /** 搜索记忆（keyword 匹配） */
  searchMemories(agentId, query, limit = 5) {
    const list = this.memories.get(agentId) ?? [];
    const scored = list
      .filter((m) => m.content.toLowerCase().includes(query.toLowerCase()))
      .map((m) => ({ memory: m, score: m.importance * m.clarity }));
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit).map((s) => s.memory);
  }

  /** 获取 Agent 最近 N 条记忆 */
  getRecentMemories(agentId, limit = 5) {
    const list = this.memories.get(agentId) ?? [];
    return list
      .sort((a, b) => b.importance * b.clarity - a.importance * a.clarity)
      .slice(0, limit)
      .map((m) => m.content);
  }

  /** 应用记忆衰减 */
  applyDecay(agentId) {
    const list = this.memories.get(agentId);
    if (!list) return;
    for (const m of list) {
      m.chapter_age += 1;
      m.clarity = Math.max(
        this.minClarity,
        m.importance * Math.exp(-this.decayRate * m.chapter_age),
      );
    }
  }

  // ─── 事件日志 ─────────────────────────────────────────

  /** 记录事件到日志 */
  logEvent(event) {
    this.eventLog.push(event);
    if (this.eventLog.length > 200) {
      this.eventLog = this.eventLog.slice(-100);
    }
    // 高重要性事件自动进入记忆
    if (event.importance > 0.6) {
      this.addMemory(event.agent_id, event.content, event.importance);
    }
  }

  /** 获取最近 N 条事件 */
  getRecentEvents(limit = 20) {
    return this.eventLog.slice(-limit).reverse();
  }

  /** 获取某 Agent 最近事件 */
  getAgentEvents(agentId, limit = 10) {
    return this.eventLog
      .filter((e) => e.agent_id === agentId || e.target_id === agentId)
      .slice(-limit)
      .reverse();
  }

  // ─── 关系图谱 ───────────────────────────────────────────

  relationKey(a, b) {
    return [a, b].sort().join(':');
  }

  /** 获取两位 Agent 的关系 */
  getRelationship(agentA, agentB) {
    return this.relationships.get(this.relationKey(agentA, agentB)) ?? null;
  }

  /** 获取某 Agent 的所有关系 */
  getAllRelationships(agentId) {
    return Array.from(this.relationships.values()).filter(
      (r) => r.agent_a === agentId || r.agent_b === agentId,
    );
  }

  /** 处理关系变化事件 */
  applyRelationshipDelta(agentA, agentB, affinityDelta, tone = 'neutral') {
    const key = this.relationKey(agentA, agentB);
    let rel = this.relationships.get(key);
    if (!rel) {
      rel = {
        agent_a: [agentA, agentB].sort()[0],
        agent_b: [agentA, agentB].sort()[1],
        relation_type: 'neutral',
        affinity_score: 50,
        emotional_tone: 'neutral',
        interaction_count: 0,
      };
      this.relationships.set(key, rel);
    }
    rel.affinity_score = Math.max(-100, Math.min(100, rel.affinity_score + affinityDelta));
    if (tone) rel.emotional_tone = tone;
    rel.interaction_count += 1;

    // 根据亲密度自动调整关系类型
    if (rel.affinity_score >= 70) rel.relation_type = 'friend';
    else if (rel.affinity_score >= 40) rel.relation_type = 'acquaintance';
    else if (rel.affinity_score >= -20) rel.relation_type = 'neutral';
    else if (rel.affinity_score >= -50) rel.relation_type = 'rival';
    else rel.relation_type = 'conflict';

    return rel;
  }

  /** 人格兼容性计算 */
  calculateCompatibility(personalityA, personalityB) {
    const diff =
      Math.abs(personalityA.bigFive.openness - personalityB.bigFive.openness) * 0.2 +
      Math.abs(personalityA.bigFive.conscientiousness - personalityB.bigFive.conscientiousness) * 0.15 +
      Math.abs(personalityA.bigFive.extraversion - personalityB.bigFive.extraversion) * 0.15 +
      Math.abs(personalityA.bigFive.agreeableness - personalityB.bigFive.agreeableness) * 0.3 +
      Math.abs(personalityA.bigFive.neuroticism - personalityB.bigFive.neuroticism) * 0.2;
    // 差异越小初始关系越好
    return Math.round((1 - diff) * 50 + 25);
  }

  /** 关系衰减 */
  decayRelationships() {
    for (const [, rel] of this.relationships) {
      if (rel.affinity_score > 50) rel.affinity_score -= 0.1;
      else if (rel.affinity_score < 50) rel.affinity_score += 0.05;
    }
  }

  // ─── 工厂方法 ──────────────────────────────────────────

  createEmotionDelta(emotion, delta, residueIntensity = 0) {
    return { emotion, delta, residue_intensity: residueIntensity };
  }

  createRelationshipDelta(targetAgent, affinityDelta, tone = '') {
    return { target_agent: targetAgent, affinity_delta: affinityDelta, tone };
  }
}

