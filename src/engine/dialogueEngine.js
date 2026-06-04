// @ts-nocheck
// ============================================================
// Dialogue Engine — 对话生成引擎 (JS 版)
// L1: LM Studio 35B 实时生成（主路径）
// L2: 模板组合引擎（降级）
// L3: 现有固定模板（极端降级）
// ============================================================

import { llmClient } from './LLMClient.js';
import { AGENT_DEFINITIONS } from './personalityEngine.js';

// ─── L2 降级引擎：模板组合 ──────────────────────────────

const GREETINGS = {
  passionate: ['嘿！', '喂喂喂！', '哇！', '你看你看！', '快来！'],
  warm: ['你好呀，', '嗨，', '嘿，', '亲爱的，'],
  analytical: ['请注意，', '数据显示，', '我发现，', '从分析来看，'],
  cautious: ['我建议先，', '在确认之前，', '需要谨慎：', '风险提示：'],
  metaphorical: ['你看这个，', '这就像，', '它让我想起，', '换个角度看，'],
  direct: ['听着，', '直接说吧：', '我的看法是：', '简单来说：'],
};

const TOPIC_TEMPLATES = {
  explorer: [
    '我刚才在{sector}发现了一个{adjective}的信号！',
    '{sector}那边有奇怪的数据波动，要不要去看看？',
    '我发现了新东西！在{sector}！',
  ],
  architect: [
    '系统在{sector}的模块耦合度太高了，需要重构。',
    '我建议对{sector}的基础设施做一次全面审计。',
    '架构层面看，{sector}的设计存在隐患。',
  ],
  risk_researcher: [
    '我对{sector}的{adjective}情况做了评估，风险等级为{level}。',
    '{sector}的最新数据让我很担心。',
    '在{sector}发现了一个潜在的安全隐患。',
  ],
  mediator: [
    '我注意到大家最近在{sector}问题上有些分歧。',
    '关于{sector}的事情，让我来协调一下吧。',
    '我们是不是该坐下来聊聊{sector}的问题了？',
  ],
};

const ADJECTIVES = ['异常', '不稳定', '可疑', '有趣的', '出乎意料的', '令人担忧的'];
const SECTORS = ['传感器网络', '数据核心', '边缘节点', '城市中枢', '通信基站', '第七扇区', '北部区域'];

// ─── DialogueEngine ─────────────────────────────────────

export class DialogueEngine {
  constructor(memorySystem) {
    this.memorySystem = memorySystem;
    this.lastTopics = new Map();
  }

  /**
   * 生成 Agent 对话
   * L1 → L2 三级降级
   * @param {Object} agent - AgentDefinition
   * @param {Object} context - { targetAgent, recentEvents, locationName, currentEmotion }
   * @returns {Promise<string>}
   */
  async generateDialogue(agent, context) {
    // L1: 尝试 LM Studio
    const llmResult = await this.tryL1(agent, context);
    if (llmResult) return llmResult;

    // L2: 模板组合
    return this.tryL2(agent, context);
  }

  /**
   * L1: LM Studio 35B 调用
   */
  async tryL1(agent, context) {
    // 构建场景描述
    let sceneContext = `你在${context.locationName}。你现在的情绪是${context.currentEmotion}。`;

    if (context.recentEvents.length > 0) {
      const recent = context.recentEvents.slice(0, 3).map((e) => e.content).join('；');
      sceneContext += `\n最近发生的事：${recent}`;
    }

    if (context.targetAgent) {
      sceneContext += `\n你正在和${context.targetAgent.name}（${context.targetAgent.role}）说话。`;
    }

    const userMessage = context.targetAgent
      ? `${sceneContext}\n你对${context.targetAgent.name}说什么？请用2-3句话。`
      : `${sceneContext}\n你说什么？请用2-3句话。`;

    return llmClient.quickChat(agent.systemPrompt, userMessage, 120);
  }

  /**
   * L2: 模板组合引擎
   */
  tryL2(agent, context) {
    // 获取语气风格对应的问候语
    const pattern = agent.personality.speechPattern;
    const greetings = GREETINGS[pattern] ?? GREETINGS.direct;
    const greeting = greetings[Math.floor(Math.random() * greetings.length)];

    // 根据角色生成主题
    const roleKey = agent.role_en;
    const topicTemplates = TOPIC_TEMPLATES[roleKey] ?? TOPIC_TEMPLATES.mediator;
    const template = topicTemplates[Math.floor(Math.random() * topicTemplates.length)];

    const topic = template
      .replace('{sector}', SECTORS[Math.floor(Math.random() * SECTORS.length)])
      .replace('{adjective}', ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)])
      .replace('{level}', Math.random() > 0.5 ? '中等' : '较高');

    // 添加情绪后缀
    const emotionSuffix = {
      excited: ['太令人兴奋了！', '我们不能错过！', '快来看！'],
      anxious: ['这让我有点担心。', '我们需要重视。', '得尽快处理。'],
      happy: ['感觉不错！', '真好！', '分享给你。'],
      neutral: ['你觉得呢？', '你怎么看？', '有空聊聊？'],
      fear: ['希望不是坏事。', '让人不安。', '得小心。'],
    };

    const suffixes = emotionSuffix[context.currentEmotion] ?? emotionSuffix.neutral;
    const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];

    return `${greeting}${topic} ${suffix}`;
  }
}

