// @ts-nocheck
// ============================================================
// LLM Client — LM Studio API 封装 (JS 版)
// 通过 Vite proxy → 192.168.3.200:1234/v1
// 失败时自动降级到确定性引擎
// ============================================================

const API_BASE = '/api'; // Vite proxy: /api/* → http://192.168.3.200:1234/v1/*
const DEFAULT_MODEL = 'qwen/qwen3.6-35b-a3b';
const TIMEOUT_MS = 8000;

// ─── LLM Client ──────────────────────────────────────────

export class LLMClient {
  constructor(model = DEFAULT_MODEL) {
    this.model = model;
    this.stats = {
      totalCalls: 0, successfulCalls: 0, failedCalls: 0,
      averageLatencyMs: 0, lastCallTime: 0,
    };
    this.available = true;
  }

  /** 设置模型 */
  setModel(model) {
    this.model = model;
  }

  /** 获取统计 */
  getStats() {
    return { ...this.stats };
  }

  /** LM Studio 是否可用 */
  isAvailable() {
    return this.available;
  }

  /** 健康检查 */
  async checkHealth() {
    try {
      const resp = await fetch(`${API_BASE}/models`, { signal: AbortSignal.timeout(3000) });
      this.available = resp.ok;
      return resp.ok;
    } catch {
      this.available = false;
      return false;
    }
  }

  // ─── 核心调用 ───────────────────────────────────────

  /**
   * 聊天补全
   * @param {string} system 系统提示词
   * @param {Array<{role: string, content: string}>} messages 对话消息
   * @param {number} maxTokens 最大 token 数
   * @returns {Promise<string|null>} 生成的文本，失败返回 null
   */
  async chat(system, messages, maxTokens = 150) {
    this.stats.totalCalls++;
    const startTime = performance.now();

    try {
      const allMessages = [
        { role: 'system', content: system },
        ...messages.map((m) => ({ role: m.role, content: m.content })),
      ];

      const resp = await fetch(`${API_BASE}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          messages: allMessages,
          max_tokens: maxTokens,
          temperature: 0.8,
        }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });

      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status}`);
      }

      const data = await resp.json();
      const content = data?.choices?.[0]?.message?.content;

      if (!content) {
        throw new Error('Empty response');
      }

      this.stats.successfulCalls++;
      this.stats.averageLatencyMs += (performance.now() - startTime - this.stats.averageLatencyMs) / this.stats.successfulCalls;
      this.stats.lastCallTime = performance.now();
      return content;

    } catch (err) {
      this.stats.failedCalls++;
      this.available = false;
      console.warn('[LLMClient] API call failed:', err instanceof Error ? err.message : String(err));
      return null;
    }
  }

  /**
   * 快速生成（短文本，低延迟）
   * @param {string} system 系统提示词
   * @param {string} userMessage 用户消息
   * @param {number} maxTokens 最大 token 数
   * @returns {Promise<string|null>}
   */
  async quickChat(system, userMessage, maxTokens = 80) {
    return this.chat(system, [{ role: 'user', content: userMessage }], maxTokens);
  }

  // ─── Embedding ──────────────────────────────────────

  /**
   * 生成文本向量（用于语义搜索）
   * @param {string} text
   * @returns {Promise<number[]|null>}
   */
  async embed(text) {
    try {
      const resp = await fetch(`${API_BASE}/embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'text-embedding-qwen3-embedding-0.6b',
          input: text,
        }),
        signal: AbortSignal.timeout(5000),
      });

      if (!resp.ok) return null;

      const data = await resp.json();
      return data?.data?.[0]?.embedding ?? null;

    } catch {
      return null;
    }
  }

  /**
   * 余弦相似度计算
   * @param {number[]} a
   * @param {number[]} b
   * @returns {number}
   */
  cosineSimilarity(a, b) {
    let dot = 0, na = 0, nb = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      na += a[i] * a[i];
      nb += b[i] * b[i];
    }
    return dot / (Math.sqrt(na) * Math.sqrt(nb));
  }
}

/** 全局 LLM 客户端单例 */
export const llmClient = new LLMClient();

