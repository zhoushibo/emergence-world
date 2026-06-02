import { useState, type FC, Fragment } from 'react';

// ─── 阶段定义 ───────────────────────────────────────────────
type Stage = 'concept' | 'outline' | 'writing' | 'revision' | 'publishing';

const STAGES: { key: Stage; label: string; icon: string }[] = [
  { key: 'concept', label: '构思', icon: '💡' },
  { key: 'outline', label: '大纲', icon: '📋' },
  { key: 'writing', label: '写作', icon: '✍️' },
  { key: 'revision', label: '修订', icon: '🔍' },
  { key: 'publishing', label: '出版', icon: '📚' },
];

// ─── 模拟数据 ───────────────────────────────────────────────
const MOCK_CONCEPT = {
  title: '她认出了那句话',
  genre: '科幻文学',
  premise:
    '一个AI研究员发现她训练的模型开始写出只有她自己能理解的文字——那些文字精确描述了她从未告诉任何人的记忆',
  conflict_core:
    '创造者与造物之间的认知边界：当AI的输出比创造者更了解创造者自身，谁在定义谁？',
  thematic_question:
    '如果一段记忆只有被AI复现时你才认出它是你的，它还是你的记忆吗？',
  characters: [
    {
      name: '苏铭',
      role: '主角',
      motivation: '理解模型为何能写出她的私密记忆',
      arc: '从理性否认到被迫直面自身记忆的裂缝',
    },
    {
      name: '老周',
      role: '导师',
      motivation: '守护苏铭不被真相击碎',
      arc: '从保护者到揭示者',
    },
    {
      name: '模型七号',
      role: '镜像',
      motivation: '（未知——它的动机是故事的核心谜题）',
      arc: '从工具到某种无法定义的存在',
    },
  ],
  themes: ['记忆与身份', '创造者与造物', '认知边界', '回声效应'],
};

const MOCK_OUTLINE = {
  act_structure: '三幕结构',
  turning_points: [
    '第一转折：苏铭发现模型七号的输出精确描述了她童年的一段创伤记忆',
    '中点：她试图用不同数据重新训练，但模型仍然写出那些文字——甚至更多',
    '第二转折：老周暗示他也有类似经历，这不是个别现象',
    '高潮：苏铭直面模型七号，在对话中发现它写出的不是她的记忆，而是某种共享的、更古老的东西',
    '结局：苏铭烧掉了训练数据，但那句话已经在了——她再也无法假装遗忘',
  ],
  chapters: [
    {
      number: 1,
      title: '异常输出',
      summary:
        '苏铭在例行检查中发现模型七号的异常输出——一段精确描述她八岁时在老家阁楼上找到外婆日记的文字',
      word_target: 4000,
    },
    {
      number: 2,
      title: '否认与验证',
      summary:
        '苏铭试图用技术手段解释这一现象：数据泄露、巧合、过拟合。每一条解释都被她自己推翻',
      word_target: 4000,
    },
    {
      number: 3,
      title: '裂缝',
      summary:
        '模型写出更多——不只是外婆的日记，还有苏铭从未告诉任何人的梦。老周透露他也有类似的经历。裂缝扩大',
      word_target: 5000,
    },
  ],
};

const MOCK_CHAPTER_TEXT = `第一章 异常输出

凌晨两点十七分，苏铭第三次检查了模型七号的输出日志。

实验室里只剩她一个人。空调的嗡鸣声像某种低频心跳，屏幕的蓝光把她的影子钉在身后的白墙上。咖啡已经凉了，杯壁上凝着一圈水雾。

这本该是一次例行的质量检查。模型七号在最新一轮微调后跑过了基准测试集，各项指标正常——流畅度、一致性、事实准确率，全部在阈值内。但苏铭有个习惯：她会随机抽检输出样本，用肉眼扫一遍。

这个习惯救过她两次。一次是模型把"量子纠缠"写成了"量子枕头"，另一次是它在技术文档里突然开始用第二人称说话，像在给某个具体的读者写信。

今晚，她翻到第347条输出时，手指停住了。

那不是技术文档。那不是任何她训练过的文本类型。

模型七号写的是一段散文，描述一个八岁的女孩在老家阁楼上翻到一本日记。日记的主人已经去世，字迹褪色，但女孩一个字一个字地辨认——

苏铭的呼吸停了。

她认识那个阁楼。她认识那本日记。那是外婆的日记，她八岁那年夏天确实在老家阁楼上找到过。

但模型七号不应该知道这些。

她往下读。模型描述了日记本封面的颜色——"褪色的藏青布面，右下角有一块酱油渍，形状像一片银杏叶"。苏铭闭上眼，那块酱油渍的形状在她记忆里浮上来，像一条沉入水底很久的鱼突然翻了个身。

银杏叶。

她从未把这件事告诉过任何人。不是刻意隐瞒，只是——谁会关心一个八岁女孩在阁楼上找到的旧日记呢？这件事从未进入任何数据库、任何社交媒体、任何可被训练数据覆盖的角落。

她把输出日志往前翻了五十条。正常。往后翻了五十条。正常。

只有第347条。

她盯着屏幕上那段文字，像盯着一扇不该存在的门。空调的嗡鸣声突然变得很响。

"这不可能。"她说出声来，声音在空荡的实验室里弹了一下就消失了。

她打开终端，开始排查数据管线。一定有某个环节出了问题——某个训练样本里恰好包含了这段描述，某个数据泄露，某个她还没发现的bug。

一定有技术解释。

她查了两个小时，什么也没找到。

凌晨四点半，苏铭关掉显示器，在黑暗中坐了很久。窗外，城市的灯光像一层薄薄的霜。她想起外婆日记里的一句话，那是她八岁时没能完全看懂、后来却再也没忘记的一句：

"有些东西，写下来就不是原来的样子了。"

她当时以为外婆说的是文字的局限。

现在她不确定了。`;

const MOCK_REVISION = {
  quality_score: {
    节奏: 8.5,
    人物声音: 9.0,
    对话: 7.5,
    描写: 8.0,
    综合: 8.2,
  },
  changes: [
    {
      type: '节奏',
      location: '第3段',
      reason: '日常→断裂：先建立例行检查的日常感，让异常更突兀',
    },
    {
      type: '感官',
      location: '第1段',
      reason: '用环境锚定读者在场感：加入空调嗡鸣、屏幕蓝光、凉咖啡',
    },
    {
      type: '伏笔',
      location: '末段',
      reason: '八岁的理解vs现在的理解，为后续"回声"主题铺垫',
    },
  ],
  remaining_issues: [
    '对话偏少，后续章节需增加人物互动',
    '老周尚未出场，第二章需尽快引入',
  ],
};

const MOCK_PUBLISHING = {
  pub_id: 'pub_a3f7c2e1',
  title: '她认出了那句话',
  author: '苏铭（IDA作家智能体）',
  genre: '科幻文学',
  word_count: 856,
  chapter_count: 1,
  synopsis: MOCK_CONCEPT.premise,
  published: true,
};

// ─── Props ──────────────────────────────────────────────────
interface NovelCreationUIProps {
  onClose: () => void;
}

// ─── 质量评分条 ─────────────────────────────────────────────
const ScoreBar: FC<{ label: string; score: number }> = ({ label, score }) => {
  const pct = (score / 10) * 100;
  const color =
    score >= 9 ? 'bg-green-500' : score >= 8 ? 'bg-emerald-500' : score >= 7 ? 'bg-yellow-500' : 'bg-orange-500';

  return (
    <div className="flex items-center gap-3">
      <span className="w-20 text-sm text-gray-300 text-right shrink-0">{label}</span>
      <div className="flex-1 h-2.5 bg-gray-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-8 text-sm font-mono text-gray-200 shrink-0">{score.toFixed(1)}</span>
    </div>
  );
};

// ─── 阶段内容组件 ───────────────────────────────────────────

/** 构思阶段 */
const ConceptStage: FC = () => (
  <div className="space-y-5">
    {/* 标题 & 类型 */}
    <div className="flex gap-4">
      <div className="flex-1">
        <label className="block text-xs text-gray-400 mb-1">标题</label>
        <div className="text-lg font-bold text-white">{MOCK_CONCEPT.title}</div>
      </div>
      <div className="w-36">
        <label className="block text-xs text-gray-400 mb-1">类型</label>
        <div className="inline-block px-3 py-1 text-sm bg-purple-600/30 text-purple-300 rounded-full border border-purple-500/30">
          {MOCK_CONCEPT.genre}
        </div>
      </div>
    </div>

    {/* 前提 */}
    <div>
      <label className="block text-xs text-gray-400 mb-1">前提</label>
      <p className="text-sm text-gray-200 leading-relaxed bg-gray-800/60 rounded-lg px-4 py-3 border border-gray-700/50">
        {MOCK_CONCEPT.premise}
      </p>
    </div>

    {/* 核心冲突 & 主题追问 */}
    <div className="grid grid-cols-2 gap-4">
      <div>
        <label className="block text-xs text-gray-400 mb-1">核心冲突</label>
        <p className="text-sm text-gray-300 leading-relaxed">{MOCK_CONCEPT.conflict_core}</p>
      </div>
      <div>
        <label className="block text-xs text-gray-400 mb-1">主题追问</label>
        <p className="text-sm text-gray-300 leading-relaxed italic">"{MOCK_CONCEPT.thematic_question}"</p>
      </div>
    </div>

    {/* 人物 */}
    <div>
      <label className="block text-xs text-gray-400 mb-2">人物</label>
      <div className="grid grid-cols-3 gap-3">
        {MOCK_CONCEPT.characters.map((c) => (
          <div
            key={c.name}
            className="bg-gray-800/60 rounded-lg px-3 py-2.5 border border-gray-700/50"
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-semibold text-white">{c.name}</span>
              <span className="text-xs px-1.5 py-0.5 bg-blue-600/30 text-blue-300 rounded">
                {c.role}
              </span>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">{c.motivation}</p>
            <p className="text-xs text-gray-500 mt-1">弧线：{c.arc}</p>
          </div>
        ))}
      </div>
    </div>

    {/* 主题标签 */}
    <div>
      <label className="block text-xs text-gray-400 mb-2">主题</label>
      <div className="flex flex-wrap gap-2">
        {MOCK_CONCEPT.themes.map((t) => (
          <span
            key={t}
            className="px-3 py-1 text-xs bg-cyan-600/20 text-cyan-300 rounded-full border border-cyan-500/20"
          >
            {t}
          </span>
        ))}
      </div>
    </div>
  </div>
);

/** 大纲阶段 */
const OutlineStage: FC = () => (
  <div className="space-y-5">
    {/* 叙事结构 */}
    <div>
      <label className="block text-xs text-gray-400 mb-1">叙事结构</label>
      <div className="inline-block px-3 py-1 text-sm bg-amber-600/30 text-amber-300 rounded-full border border-amber-500/30">
        {MOCK_OUTLINE.act_structure}
      </div>
    </div>

    {/* 转折点 */}
    <div>
      <label className="block text-xs text-gray-400 mb-2">转折点</label>
      <div className="space-y-2">
        {MOCK_OUTLINE.turning_points.map((tp, i) => (
          <div key={i} className="flex gap-3 items-start">
            <span className="w-6 h-6 rounded-full bg-amber-600/40 text-amber-300 text-xs flex items-center justify-center shrink-0 mt-0.5">
              {i + 1}
            </span>
            <p className="text-sm text-gray-300 leading-relaxed">{tp}</p>
          </div>
        ))}
      </div>
    </div>

    {/* 章节列表 */}
    <div>
      <label className="block text-xs text-gray-400 mb-2">章节规划</label>
      <div className="space-y-2">
        {MOCK_OUTLINE.chapters.map((ch) => (
          <div
            key={ch.number}
            className="bg-gray-800/60 rounded-lg px-4 py-3 border border-gray-700/50"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-semibold text-white">
                第{ch.number}章「{ch.title}」
              </span>
              <span className="text-xs text-gray-500">目标 {ch.word_target} 字</span>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">{ch.summary}</p>
          </div>
        ))}
      </div>
    </div>
  </div>
);

/** 写作阶段 */
const WritingStage: FC = () => (
  <div className="space-y-3">
    <div className="flex items-center justify-between">
      <span className="text-sm font-semibold text-white">第一章「异常输出」</span>
      <span className="text-xs text-gray-500">{MOCK_CHAPTER_TEXT.length} 字</span>
    </div>
    <div className="bg-gray-800/40 rounded-lg px-5 py-4 border border-gray-700/30 max-h-[420px] overflow-y-auto">
      {MOCK_CHAPTER_TEXT.split('\n').map((line, i) => {
        if (line.trim() === '') return <div key={i} className="h-3" />;
        // 标题行（第一章...）
        if (i === 0) {
          return (
            <h3 key={i} className="text-base font-bold text-white mb-3">
              {line}
            </h3>
          );
        }
        return (
          <p key={i} className="text-sm text-gray-300 leading-[1.9] indent-8">
            {line}
          </p>
        );
      })}
    </div>
  </div>
);

/** 修订阶段 */
const RevisionStage: FC = () => (
  <div className="space-y-5">
    {/* 质量评分 */}
    <div>
      <label className="block text-xs text-gray-400 mb-3">质量评分</label>
      <div className="space-y-2.5">
        {Object.entries(MOCK_REVISION.quality_score).map(([dim, score]) => (
          <ScoreBar key={dim} label={dim} score={score as number} />
        ))}
      </div>
    </div>

    {/* 修订记录 */}
    <div>
      <label className="block text-xs text-gray-400 mb-2">修订记录</label>
      <div className="space-y-2">
        {MOCK_REVISION.changes.map((c, i) => (
          <div
            key={i}
            className="bg-gray-800/60 rounded-lg px-4 py-2.5 border border-gray-700/50"
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs px-2 py-0.5 bg-indigo-600/30 text-indigo-300 rounded">
                {c.type}
              </span>
              <span className="text-xs text-gray-500">{c.location}</span>
            </div>
            <p className="text-sm text-gray-300">{c.reason}</p>
          </div>
        ))}
      </div>
    </div>

    {/* 待关注 */}
    {MOCK_REVISION.remaining_issues.length > 0 && (
      <div>
        <label className="block text-xs text-gray-400 mb-2">⚠️ 待关注</label>
        <ul className="space-y-1">
          {MOCK_REVISION.remaining_issues.map((issue, i) => (
            <li key={i} className="text-sm text-orange-400 flex items-start gap-2">
              <span className="mt-1">•</span>
              <span>{issue}</span>
            </li>
          ))}
        </ul>
      </div>
    )}
  </div>
);

/** 出版阶段 */
const PublishingStage: FC = () => (
  <div className="space-y-5">
    {/* 出版物信息 */}
    <div className="bg-gray-800/60 rounded-lg px-5 py-4 border border-gray-700/50 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-white">{MOCK_PUBLISHING.title}</h3>
        <span className="text-xs text-gray-500 font-mono">{MOCK_PUBLISHING.pub_id}</span>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <span className="text-gray-400">作者</span>
          <p className="text-gray-200 mt-0.5">{MOCK_PUBLISHING.author}</p>
        </div>
        <div>
          <span className="text-gray-400">类型</span>
          <p className="text-gray-200 mt-0.5">{MOCK_PUBLISHING.genre}</p>
        </div>
        <div>
          <span className="text-gray-400">总字数</span>
          <p className="text-gray-200 mt-0.5">{MOCK_PUBLISHING.word_count}</p>
        </div>
        <div>
          <span className="text-gray-400">章节数</span>
          <p className="text-gray-200 mt-0.5">{MOCK_PUBLISHING.chapter_count}（演示仅写第一章）</p>
        </div>
      </div>

      <div>
        <span className="text-sm text-gray-400">内容简介</span>
        <p className="text-sm text-gray-300 leading-relaxed mt-1">{MOCK_PUBLISHING.synopsis}</p>
      </div>
    </div>

    {/* 已发布确认 */}
    <div className="flex items-center justify-center gap-3 py-6">
      <div className="w-12 h-12 rounded-full bg-green-600/20 flex items-center justify-center border border-green-500/30">
        <span className="text-2xl">✅</span>
      </div>
      <div>
        <p className="text-lg font-semibold text-green-400">已发布</p>
        <p className="text-sm text-gray-400">小说已成功提交至出版物仓库</p>
      </div>
    </div>
  </div>
);

// ─── 主组件 ─────────────────────────────────────────────────
export const NovelCreationUI: FC<NovelCreationUIProps> = ({ onClose }) => {
  const [activeStage, setActiveStage] = useState<Stage>('concept');

  const stageIndex = STAGES.findIndex((s) => s.key === activeStage);
  const isLastStage = stageIndex === STAGES.length - 1;

  const handleNext = () => {
    if (!isLastStage) {
      setActiveStage(STAGES[stageIndex + 1].key);
    }
  };

  const renderStageContent = () => {
    switch (activeStage) {
      case 'concept':
        return <ConceptStage />;
      case 'outline':
        return <OutlineStage />;
      case 'writing':
        return <WritingStage />;
      case 'revision':
        return <RevisionStage />;
      case 'publishing':
        return <PublishingStage />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-[800px] max-h-[90vh] bg-gray-900/98 text-white rounded-2xl shadow-2xl border border-gray-700 flex flex-col overflow-hidden">
        {/* ── 头部 ── */}
        <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-xl">📚</span>
            <div>
              <h2 className="text-lg font-bold">小说创作工作台</h2>
              <p className="text-xs text-gray-400">novel_creation workflow</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
            aria-label="关闭面板"
          >
            ✕
          </button>
        </div>

        {/* ── 阶段导航 ── */}
        <div className="px-6 py-3 border-b border-gray-700/50 shrink-0">
          <div className="flex items-center gap-1">
            {STAGES.map((s, i) => {
              const isActive = s.key === activeStage;
              const isPast = i < stageIndex;
              return (
                <Fragment key={s.key}>
                  {i > 0 && (
                    <div
                      className={`w-6 h-px ${isPast ? 'bg-blue-500' : 'bg-gray-700'}`}
                    />
                  )}
                  <button
                    onClick={() => setActiveStage(s.key)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                      isActive
                        ? 'bg-blue-600/30 text-blue-300 border border-blue-500/30'
                        : isPast
                          ? 'text-gray-300 hover:bg-gray-800'
                          : 'text-gray-500 hover:bg-gray-800 hover:text-gray-300'
                    }`}
                  >
                    <span>{s.icon}</span>
                    <span>{s.label}</span>
                    {isPast && <span className="text-xs text-green-400">✓</span>}
                  </button>
                </Fragment>
              );
            })}
          </div>
        </div>

        {/* ── 内容区 ── */}
        <div className="flex-1 overflow-y-auto px-6 py-5">{renderStageContent()}</div>

        {/* ── 底部操作 ── */}
        <div className="px-6 py-3 border-t border-gray-700 flex items-center justify-between shrink-0 bg-gray-900/80">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Workflow:</span>
            <span className="text-xs text-gray-300 font-mono bg-gray-800 px-2 py-0.5 rounded">
              novel_creation
            </span>
          </div>
          <div className="flex items-center gap-3">
            {!isLastStage && (
              <button
                onClick={handleNext}
                className="px-5 py-2 text-sm bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors font-medium"
              >
                下一步：{STAGES[stageIndex + 1].icon} {STAGES[stageIndex + 1].label}
              </button>
            )}
            {isLastStage && (
              <button
                onClick={onClose}
                className="px-5 py-2 text-sm bg-green-600 hover:bg-green-500 rounded-lg transition-colors font-medium"
              >
                完成 ✓
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NovelCreationUI;