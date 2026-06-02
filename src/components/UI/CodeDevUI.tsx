import React, { useState } from 'react';

// ── 阶段定义 ──────────────────────────────────────────────
type Stage = 'requirement' | 'architecture' | 'coding' | 'review' | 'testing';

const STAGES: { key: Stage; label: string; icon: string }[] = [
  { key: 'requirement', label: '需求', icon: '📝' },
  { key: 'architecture', label: '架构', icon: '🏗️' },
  { key: 'coding', label: '编码', icon: '💻' },
  { key: 'review', label: '审查', icon: '👀' },
  { key: 'testing', label: '测试', icon: '🧪' },
];

// ── 模拟数据 ──────────────────────────────────────────────
const REQUIREMENT_DATA = {
  feature: '智能体状态查询 API',
  description: '为前端世界可视化面板提供智能体实时状态查询接口，支持按 agent_id 获取情绪、能量、位置及活跃技能等信息。',
  acceptance: [
    'GET /agents/{agent_id}/status 返回 200 及完整状态字段',
    '未找到 agent_id 时返回 404',
    '响应时间 < 50ms（缓存命中）',
    '需通过 Depends(get_current_user) 鉴权',
  ],
  priority: 'P0',
};

const ARCHITECTURE_LAYERS = [
  {
    name: 'API 路由层',
    color: 'border-blue-500',
    bg: 'bg-blue-500/10',
    items: ['router.get("/agents/{agent_id}/status")', 'Depends(get_current_user) 鉴权', 'Pydantic ResponseModel 序列化'],
  },
  {
    name: '服务层',
    color: 'border-purple-500',
    bg: 'bg-purple-500/10',
    items: ['AgentService.get_status(agent_id)', '缓存优先 → 存储 fallback', '状态聚合（mood + energy + location + skills）'],
  },
  {
    name: '存储层',
    color: 'border-green-500',
    bg: 'bg-green-500/10',
    items: ['SQLAlchemy 2.0 async session', 'agents 表 + agent_skills 关联表', 'Redis 语义缓存（TTL 30s）'],
  },
];

const CODE_LINES = [
  'from fastapi import APIRouter, Depends',
  'from ..services.agent import AgentService',
  'from ..auth import get_current_user',
  'from ..models.schemas import AgentStatusResponse',
  '',
  'router = APIRouter(prefix="/agents", tags=["agents"])',
  'agent_service = AgentService()',
  '',
  '',
  '@router.get("/{agent_id}/status", response_model=AgentStatusResponse)',
  'async def get_agent_status(',
  '    agent_id: str,',
  '    user: dict = Depends(get_current_user),',
  '):',
  '    """获取智能体实时状态"""',
  '    status = await agent_service.get_status(agent_id)',
  '    return {',
  '        "agent_id": agent_id,',
  '        "mood": status.mood,',
  '        "energy": status.energy,',
  '        "location": status.location,',
  '        "active_skills": status.active_skills,',
  '    }',
];

const REVIEW_DATA = {
  score: 7.5,
  results: [
    { severity: 'warning' as const, file: 'routers/agent.py', line: 11, message: '缺少 try/except 包裹，agent_id 不存在时将抛出未处理异常' },
    { severity: 'warning' as const, file: 'routers/agent.py', line: 13, message: 'user 参数未使用，建议添加权限校验逻辑或标记 # noqa' },
    { severity: 'info' as const, file: 'services/agent.py', line: 42, message: '缓存 TTL 30s 较短，高频查询场景建议提升至 60s' },
    { severity: 'info' as const, file: 'models/schemas.py', line: 18, message: 'AgentStatusResponse 可补充 example 供 OpenAPI 文档展示' },
  ],
};

const TEST_CODE_LINES = [
  'import pytest',
  'from httpx import AsyncClient',
  'from ida_service.main import app',
  '',
  '',
  '@pytest.mark.asyncio',
  'async def test_get_agent_status():',
  '    async with AsyncClient(app=app, base_url="http://test") as ac:',
  '        resp = await ac.get("/agents/agent_001/status")',
  '    assert resp.status_code == 200',
  '    data = resp.json()',
  '    assert data["agent_id"] == "agent_001"',
  '    assert "mood" in data',
  '    assert "energy" in data',
  '    assert "location" in data',
  '    assert "active_skills" in data',
];

const TEST_RESULT = { passed: 1, failed: 0, coverage: 85 };

// ── Props ─────────────────────────────────────────────────
interface CodeDevUIProps {
  open: boolean;
  onClose: () => void;
}

// ── 组件 ──────────────────────────────────────────────────
export const CodeDevUI: React.FC<CodeDevUIProps> = ({ open, onClose }) => {
  const [stage, setStage] = useState<Stage>('requirement');

  if (!open) return null;

  const stageIndex = STAGES.findIndex((s) => s.key === stage);

  const goNext = () => {
    if (stageIndex < STAGES.length - 1) {
      setStage(STAGES[stageIndex + 1].key);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      {/* 面板主体 */}
      <div className="w-[900px] max-h-[90vh] bg-gray-900/98 text-white rounded-2xl shadow-2xl border border-gray-700 flex flex-col overflow-hidden">
        {/* ── 顶栏 ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
          <h2 className="text-lg font-bold tracking-wide">💻 代码开发面板</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-xl transition-colors"
            aria-label="关闭面板"
          >
            ✕
          </button>
        </div>

        {/* ── 阶段导航 ── */}
        <div className="flex items-center gap-1 px-6 py-3 border-b border-gray-800 bg-gray-900/50">
          {STAGES.map((s, i) => (
            <React.Fragment key={s.key}>
              <button
                onClick={() => setStage(s.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  stage === s.key
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
                    : i < stageIndex
                      ? 'bg-gray-700/60 text-gray-300 hover:bg-gray-700'
                      : 'bg-gray-800/40 text-gray-500 hover:bg-gray-700/50'
                }`}
              >
                <span>{s.icon}</span>
                <span>{s.label}</span>
                {i < stageIndex && <span className="ml-1 text-green-400 text-xs">✓</span>}
              </button>
              {i < STAGES.length - 1 && (
                <span className={`text-xs ${i < stageIndex ? 'text-green-400' : 'text-gray-600'}`}>→</span>
              )}
            </React.Fragment>
          ))}
        </div>

        {/* ── 内容区 ── */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {stage === 'requirement' && <RequirementStage />}
          {stage === 'architecture' && <ArchitectureStage />}
          {stage === 'coding' && <CodingStage />}
          {stage === 'review' && <ReviewStage />}
          {stage === 'testing' && <TestingStage />}
        </div>

        {/* ── 底部操作栏 ── */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-gray-700 bg-gray-800/40">
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <span className="inline-block w-2 h-2 rounded-full bg-purple-500" />
            <span className="font-mono text-gray-300">software_development</span>
            <span className="text-gray-600">|</span>
            <span>阶段 {stageIndex + 1}/{STAGES.length}</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-1.5 text-sm rounded-lg bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors"
            >
              取消
            </button>
            {stageIndex < STAGES.length - 1 ? (
              <button
                onClick={goNext}
                className="px-5 py-1.5 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-500 shadow-md shadow-blue-500/20 transition-colors"
              >
                下一步 →
              </button>
            ) : (
              <button
                onClick={onClose}
                className="px-5 py-1.5 text-sm rounded-lg bg-green-600 text-white hover:bg-green-500 shadow-md shadow-green-500/20 transition-colors"
              >
                ✓ 完成
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ── 需求阶段 ─────────────────────────────────────────────
const RequirementStage: React.FC = () => (
  <div className="space-y-5">
    {/* 功能需求 */}
    <section>
      <h3 className="text-sm font-semibold text-gray-300 mb-2 flex items-center gap-2">
        <span className="w-1 h-4 rounded bg-blue-500" />
        功能需求
      </h3>
      <div className="bg-gray-800/60 rounded-xl p-4 border border-gray-700">
        <h4 className="text-base font-bold text-white mb-1">{REQUIREMENT_DATA.feature}</h4>
        <p className="text-sm text-gray-400 leading-relaxed">{REQUIREMENT_DATA.description}</p>
      </div>
    </section>

    {/* 验收标准 */}
    <section>
      <h3 className="text-sm font-semibold text-gray-300 mb-2 flex items-center gap-2">
        <span className="w-1 h-4 rounded bg-green-500" />
        验收标准
      </h3>
      <ul className="space-y-2">
        {REQUIREMENT_DATA.acceptance.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-gray-300 bg-gray-800/40 rounded-lg px-3 py-2 border border-gray-700/50">
            <span className="text-green-400 mt-0.5 shrink-0">✓</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>

    {/* 优先级 */}
    <section>
      <h3 className="text-sm font-semibold text-gray-300 mb-2 flex items-center gap-2">
        <span className="w-1 h-4 rounded bg-red-500" />
        优先级
      </h3>
      <div className="inline-flex items-center gap-2 bg-red-500/15 border border-red-500/40 rounded-lg px-4 py-2">
        <span className="text-red-400 font-bold text-lg">{REQUIREMENT_DATA.priority}</span>
        <span className="text-sm text-red-300/80">最高优先级 — 核心链路依赖</span>
      </div>
    </section>
  </div>
);

// ── 架构阶段 ─────────────────────────────────────────────
const ArchitectureStage: React.FC = () => (
  <div className="space-y-4">
    <h3 className="text-sm font-semibold text-gray-300 mb-1 flex items-center gap-2">
      <span className="w-1 h-4 rounded bg-purple-500" />
      三层架构设计
    </h3>
    <p className="text-xs text-gray-500 mb-3">遵循 IDA 物理层职责划分：路由→服务→存储，层间通过抽象接口解耦</p>

    <div className="space-y-3">
      {ARCHITECTURE_LAYERS.map((layer, i) => (
        <div
          key={i}
          className={`rounded-xl border-l-4 ${layer.color} ${layer.bg} p-4 border border-gray-700/50`}
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-bold text-white">{layer.name}</span>
            {i < ARCHITECTURE_LAYERS.length - 1 && (
              <span className="text-xs text-gray-500 ml-auto">↓ 调用下层</span>
            )}
          </div>
          <ul className="space-y-1">
            {layer.items.map((item, j) => (
              <li key={j} className="flex items-center gap-2 text-sm text-gray-300">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-500 shrink-0" />
                <span className="font-mono text-xs">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>

    {/* 数据流示意 */}
    <div className="mt-4 bg-gray-800/40 rounded-xl p-4 border border-gray-700/50">
      <h4 className="text-xs font-semibold text-gray-400 mb-2">数据流</h4>
      <div className="flex items-center gap-2 text-xs font-mono text-gray-300">
        <span className="bg-blue-500/20 px-2 py-1 rounded">Client</span>
        <span className="text-gray-600">→</span>
        <span className="bg-blue-500/20 px-2 py-1 rounded">APIRouter</span>
        <span className="text-gray-600">→</span>
        <span className="bg-purple-500/20 px-2 py-1 rounded">AgentService</span>
        <span className="text-gray-600">→</span>
        <span className="bg-green-500/20 px-2 py-1 rounded">AsyncSession</span>
        <span className="text-gray-600">→</span>
        <span className="bg-green-500/20 px-2 py-1 rounded">PostgreSQL</span>
      </div>
    </div>
  </div>
);

// ── 编码阶段 ─────────────────────────────────────────────
const CodingStage: React.FC = () => (
  <div className="space-y-3">
    <div className="flex items-center justify-between">
      <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
        <span className="w-1 h-4 rounded bg-cyan-500" />
        代码编辑器
      </h3>
      <span className="text-xs text-gray-500 font-mono">routers/agent.py</span>
    </div>

    {/* 编辑器容器 */}
    <div className="rounded-xl overflow-hidden border border-gray-700 shadow-lg">
      {/* 编辑器顶栏 */}
      <div className="flex items-center gap-2 px-4 py-2 bg-gray-800 border-b border-gray-700">
        <span className="w-3 h-3 rounded-full bg-red-500/80" />
        <span className="w-3 h-3 rounded-full bg-yellow-500/80" />
        <span className="w-3 h-3 rounded-full bg-green-500/80" />
        <span className="ml-3 text-xs text-gray-400 font-mono">agent.py — FastAPI Route</span>
      </div>

      {/* 代码区 */}
      <div className="bg-[#1e1e2e] p-0 overflow-x-auto">
        <pre className="text-sm leading-6 font-mono">
          <code>
            {CODE_LINES.map((line, i) => (
              <div key={i} className="flex hover:bg-white/5">
                <span className="inline-block w-12 text-right pr-4 text-gray-600 select-none shrink-0">
                  {i + 1}
                </span>
                <span className={getSyntaxClass(line)}>{line || '\n'}</span>
              </div>
            ))}
          </code>
        </pre>
      </div>
    </div>
  </div>
);

/** 简易语法高亮 class 映射 */
function getSyntaxClass(line: string): string {
  const trimmed = line.trimStart();
  if (trimmed.startsWith('#') || trimmed.startsWith('"""')) return 'text-gray-500 italic';
  if (trimmed.startsWith('from ') || trimmed.startsWith('import ')) return 'text-purple-400';
  if (trimmed.startsWith('@')) return 'text-yellow-400';
  if (trimmed.startsWith('class ') || trimmed.startsWith('def ') || trimmed.startsWith('async def '))
    return 'text-blue-400';
  if (trimmed.startsWith('return ')) return 'text-green-400';
  if (trimmed.startsWith('router') || trimmed.startsWith('agent_service')) return 'text-cyan-300';
  return 'text-gray-200';
}

// ── 审查阶段 ─────────────────────────────────────────────
const ReviewStage: React.FC = () => (
  <div className="space-y-5">
    {/* 质量评分 */}
    <section>
      <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
        <span className="w-1 h-4 rounded bg-yellow-500" />
        质量评分
      </h3>
      <div className="flex items-center gap-6 bg-gray-800/60 rounded-xl p-5 border border-gray-700">
        <div className="relative w-24 h-24">
          <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="42" fill="none" stroke="#374151" strokeWidth="8" />
            <circle
              cx="50"
              cy="50"
              r="42"
              fill="none"
              stroke={REVIEW_DATA.score >= 7 ? '#22c55e' : '#eab308'}
              strokeWidth="8"
              strokeDasharray={`${(REVIEW_DATA.score / 10) * 264} 264`}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-2xl font-bold text-white">{REVIEW_DATA.score}</span>
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-sm text-gray-300">
            整体质量 <span className="text-green-400 font-semibold">良好</span>
          </p>
          <p className="text-xs text-gray-500">满分 10.0 · 4 项审查发现</p>
          <div className="flex gap-3 mt-2">
            <span className="text-xs text-yellow-400">⚠ {REVIEW_DATA.results.filter((r) => r.severity === 'warning').length} warnings</span>
            <span className="text-xs text-blue-400">ℹ {REVIEW_DATA.results.filter((r) => r.severity === 'info').length} info</span>
          </div>
        </div>
      </div>
    </section>

    {/* 审查结果 */}
    <section>
      <h3 className="text-sm font-semibold text-gray-300 mb-2 flex items-center gap-2">
        <span className="w-1 h-4 rounded bg-orange-500" />
        审查结果
      </h3>
      <div className="space-y-2">
        {REVIEW_DATA.results.map((r, i) => (
          <div
            key={i}
            className={`rounded-lg px-4 py-3 border ${
              r.severity === 'warning'
                ? 'bg-yellow-500/8 border-yellow-500/30'
                : 'bg-blue-500/8 border-blue-500/30'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className={r.severity === 'warning' ? 'text-yellow-400' : 'text-blue-400'}>
                {r.severity === 'warning' ? '⚠' : 'ℹ'}
              </span>
              <span className="text-xs font-mono text-gray-400">
                {r.file}:{r.line}
              </span>
              <span
                className={`ml-auto text-xs px-2 py-0.5 rounded-full ${
                  r.severity === 'warning'
                    ? 'bg-yellow-500/20 text-yellow-400'
                    : 'bg-blue-500/20 text-blue-400'
                }`}
              >
                {r.severity}
              </span>
            </div>
            <p className="text-sm text-gray-300">{r.message}</p>
          </div>
        ))}
      </div>
    </section>
  </div>
);

// ── 测试阶段 ─────────────────────────────────────────────
const TestingStage: React.FC = () => (
  <div className="space-y-4">
    {/* 测试代码 */}
    <section>
      <h3 className="text-sm font-semibold text-gray-300 mb-2 flex items-center gap-2">
        <span className="w-1 h-4 rounded bg-green-500" />
        测试代码
      </h3>
      <div className="rounded-xl overflow-hidden border border-gray-700">
        <div className="flex items-center gap-2 px-4 py-2 bg-gray-800 border-b border-gray-700">
          <span className="w-3 h-3 rounded-full bg-red-500/80" />
          <span className="w-3 h-3 rounded-full bg-yellow-500/80" />
          <span className="w-3 h-3 rounded-full bg-green-500/80" />
          <span className="ml-3 text-xs text-gray-400 font-mono">test_agent_status.py</span>
        </div>
        <div className="bg-[#1e1e2e] p-0 overflow-x-auto">
          <pre className="text-sm leading-6 font-mono">
            <code>
              {TEST_CODE_LINES.map((line, i) => (
                <div key={i} className="flex hover:bg-white/5">
                  <span className="inline-block w-12 text-right pr-4 text-gray-600 select-none shrink-0">
                    {i + 1}
                  </span>
                  <span className={getSyntaxClass(line)}>{line || '\n'}</span>
                </div>
              ))}
            </code>
          </pre>
        </div>
      </div>
    </section>

    {/* 测试结果 */}
    <section>
      <h3 className="text-sm font-semibold text-gray-300 mb-2 flex items-center gap-2">
        <span className="w-1 h-4 rounded bg-green-500" />
        测试结果
      </h3>
      <div className="bg-gray-800/60 rounded-xl p-4 border border-gray-700 font-mono text-sm space-y-2">
        {/* pytest 输出模拟 */}
        <div className="text-green-400">
          <span className="text-gray-500">$ </span>pytest tests/test_agent_status.py -v
        </div>
        <div className="text-gray-400">
          <span className="text-green-400">PASSED</span> test_agent_status.py::test_get_agent_status
        </div>
        <div className="border-t border-gray-700 pt-2 text-gray-300">
          <span className="text-green-400">{TEST_RESULT.passed} passed</span>
          {TEST_RESULT.failed > 0 && (
            <span className="text-red-400">, {TEST_RESULT.failed} failed</span>
          )}
          <span className="text-gray-500"> in 0.12s</span>
        </div>
        <div className="text-gray-400">
          覆盖率: <span className="text-green-400">{TEST_RESULT.coverage}%</span>
          <div className="mt-1 w-full bg-gray-700 rounded-full h-2">
            <div
              className="h-2 rounded-full bg-green-500"
              style={{ width: `${TEST_RESULT.coverage}%` }}
            />
          </div>
        </div>
      </div>
    </section>
  </div>
);

export default CodeDevUI;