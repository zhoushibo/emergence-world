// ============================================================
// IDA World 事件可视化组件
// 在 3D 世界中可视化智能体间的事件：对话线、移动轨迹、情绪粒子、工具光环
// ============================================================

import React, { useRef, useState, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { SimEvent } from '../../services/worldSimulator';

// ─── Props ────────────────────────────────────────────────────

interface EventVisualizationProps {
  events: SimEvent[];
  agentPositions: Record<string, [number, number, number]>;
  onEventConsumed: (eventId: string) => void;
}

// ─── 常量 ─────────────────────────────────────────────────────

/** 事件可视化生命周期（毫秒） */
const EVENT_LIFETIME_MS = 3000;
/** 对话线淡出时间（秒） */
const DIALOGUE_FADE_S = 2;
/** 移动轨迹淡出时间（秒） */
const MOVE_FADE_S = 3;
/** 情绪粒子淡出时间（秒） */
const EMOTION_FADE_S = 1.5;
/** 工具光环淡出时间（秒） */
const SKILL_FADE_S = 2;
/** 淡出动画刷新间隔（毫秒），约 20fps */
const FADE_REFRESH_MS = 50;

/** 情绪 → 颜色映射（英文 EmotionType + 中文兼容） */
const EMOTION_COLORS: Record<string, string> = {
  // 英文（与 worldSimulator EmotionType 对应）
  neutral: '#94a3b8',
  happy: '#4ade80',
  focused: '#60a5fa',
  curious: '#fbbf24',
  anxious: '#f59e0b',
  frustrated: '#ef4444',
  excited: '#f472b6',
  // 中文（兼容旧数据）
  '开心': '#4ade80',
  '思考中': '#60a5fa',
  '焦虑': '#f59e0b',
  '愤怒': '#ef4444',
  '悲伤': '#6366f1',
  '平静': '#94a3b8',
  '兴奋': '#f472b6',
  '疲惫': '#78716c',
};

const DEFAULT_EMOTION_COLOR = '#94a3b8';

// ─── 追踪事件（附加本地开始时间） ─────────────────────────────

interface TrackedEvent {
  event: SimEvent;
  startTime: number;
}

// ─── 对话线组件 ───────────────────────────────────────────────
// 两个智能体对话时，在它们之间画一条发光的线（2秒淡出）

function DialogueLine({
  from,
  to,
  age,
}: {
  from: [number, number, number];
  to: [number, number, number];
  age: number;
}) {
  const opacity = Math.max(0, 1 - age / DIALOGUE_FADE_S);
  if (opacity <= 0) return null;

  // 用 useMemo 避免每帧重建几何体（防止内存泄漏）
  const geometry = useMemo(() => {
    const pts = [
      new THREE.Vector3(from[0], from[1] + 1, from[2]),
      new THREE.Vector3(to[0], to[1] + 1, to[2]),
    ];
    return new THREE.BufferGeometry().setFromPoints(pts);
  }, [from[0], from[1], from[2], to[0], to[1], to[2]]);

  // 组件卸载时释放 GPU 资源
  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment -- R3F lowercase <line> maps to THREE.Line
    {/* @ts-expect-error R3F intrinsic element */}
    <line geometry={geometry}>
      <lineBasicMaterial
        color="#fbbf24"
        transparent
        opacity={opacity * 0.8}
        linewidth={2}
      />
    </line>
  );
}

// ─── 移动轨迹组件 ─────────────────────────────────────────────
// 智能体移动时，画一条从旧位置到新位置的虚线（3秒淡出）

function MoveTrail({
  from,
  to,
  age,
}: {
  from: [number, number, number];
  to: [number, number, number];
  age: number;
}) {
  const opacity = Math.max(0, 1 - age / MOVE_FADE_S);
  if (opacity <= 0) return null;

  const geometry = useMemo(() => {
    const pts = [
      new THREE.Vector3(from[0], 0.1, from[2]),
      new THREE.Vector3(to[0], 0.1, to[2]),
    ];
    const geom = new THREE.BufferGeometry().setFromPoints(pts);
    // lineDashedMaterial 需要预计算线段距离
    geom.computeLineDistances();
    return geom;
  }, [from[0], from[2], to[0], to[2]]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment -- R3F lowercase <line> maps to THREE.Line
    {/* @ts-expect-error R3F intrinsic element */}
    <line geometry={geometry}>
      <lineDashedMaterial
        color="#60a5fa"
        transparent
        opacity={opacity * 0.6}
        dashSize={0.3}
        gapSize={0.2}
      />
    </line>
  );
}

// ─── 情绪粒子组件 ─────────────────────────────────────────────
// 情绪变化时，在智能体头顶发射小粒子（颜色对应情绪，向上飘 1.5秒淡出）

function EmotionBurst({
  position,
  color,
  age,
}: {
  position: [number, number, number];
  color: string;
  age: number;
}) {
  const opacity = Math.max(0, 1 - age / EMOTION_FADE_S);
  if (opacity <= 0) return null;
  const yOffset = age * 0.5; // 向上飘

  return (
    <mesh position={[position[0], position[1] + 1.5 + yOffset, position[2]]}>
      <sphereGeometry args={[0.08, 8, 8]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.8}
        transparent
        opacity={opacity}
      />
    </mesh>
  );
}

// ─── 工具调用光环 ─────────────────────────────────────────────
// Skill 执行时，智能体周围出现旋转光环（2秒淡出）

function SkillAura({
  position,
  age,
}: {
  position: [number, number, number];
  age: number;
}) {
  const ref = useRef<THREE.Mesh>(null);
  const opacity = Math.max(0, 1 - age / SKILL_FADE_S);
  if (opacity <= 0) return null;

  // 每帧旋转光环
  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.y = state.clock.getElapsedTime() * 3;
    }
  });

  return (
    <mesh ref={ref} position={[position[0], position[1] + 0.5, position[2]]}>
      <torusGeometry args={[0.5, 0.03, 8, 32]} />
      <meshStandardMaterial
        color="#a78bfa"
        emissive="#a78bfa"
        emissiveIntensity={0.5}
        transparent
        opacity={opacity}
      />
    </mesh>
  );
}

// ─── 主组件 ───────────────────────────────────────────────────

export const EventVisualization: React.FC<EventVisualizationProps> = ({
  events,
  agentPositions,
  onEventConsumed,
}) => {
  const [trackedEvents, setTrackedEvents] = useState<TrackedEvent[]>([]);
  const knownEventIds = useRef<Set<string>>(new Set());
  const frameTime = useRef(Date.now());
  const lastRenderRef = useRef(0);

  // forceRender 用于节流触发重渲染，实现平滑淡出动画
  const [, forceRender] = useState(0);

  // ─── 新事件进入 ───────────────────────────────────────────
  useEffect(() => {
    const now = Date.now();
    const incoming: TrackedEvent[] = [];

    for (const event of events) {
      if (!knownEventIds.current.has(event.event_id)) {
        knownEventIds.current.add(event.event_id);
        incoming.push({ event, startTime: now });
      }
    }

    if (incoming.length > 0) {
      setTrackedEvents((prev) => [...prev, ...incoming]);
    }
  }, [events]);

  // ─── 每帧：更新时间 + 清理过期事件 + 节流重渲染 ──────────
  useFrame(() => {
    const now = Date.now();
    frameTime.current = now;

    // 清理过期事件（仅在有事件过期时才更新 state）
    setTrackedEvents((prev) => {
      const hasExpired = prev.some(
        (te) => now - te.startTime >= EVENT_LIFETIME_MS,
      );
      if (!hasExpired) return prev;

      const alive = prev.filter(
        (te) => now - te.startTime < EVENT_LIFETIME_MS,
      );
      // 通知消费者并清理 ID 追踪
      for (const te of prev) {
        if (now - te.startTime >= EVENT_LIFETIME_MS) {
          knownEventIds.current.delete(te.event.event_id);
          onEventConsumed(te.event.event_id);
        }
      }
      return alive;
    });

    // 节流重渲染：约 20fps，保证淡出动画平滑
    if (now - lastRenderRef.current > FADE_REFRESH_MS) {
      lastRenderRef.current = now;
      forceRender((t) => t + 1);
    }
  });

  // ─── 渲染 ─────────────────────────────────────────────────
  const now = frameTime.current;

  return (
    <group>
      {trackedEvents.map((te) => {
        const { event, startTime } = te;
        const age = (now - startTime) / 1000;
        const agentId = event.agent_id;
        if (!agentId) return null;
        const pos = agentPositions[agentId];
        if (!pos) return null;

        switch (event.category) {
          case 'dialogue': {
            // 对话涉及的其他智能体（involved_agents 中排除自身）
            const involved = event.involved_agents?.filter(
              (id) => id !== agentId,
            );
            const targetId = involved?.[0];
            const targetPos = targetId
              ? agentPositions[targetId]
              : undefined;
            if (!targetPos) return null;
            return (
              <DialogueLine
                key={event.event_id}
                from={pos}
                to={targetPos}
                age={age}
              />
            );
          }

          case 'move': {
            const newPos = event.target_position;
            if (!newPos) return null;
            return (
              <MoveTrail
                key={event.event_id}
                from={pos}
                to={newPos}
                age={age}
              />
            );
          }

          case 'emotion': {
            const mood = event.emotion_value;
            const color = mood
              ? (EMOTION_COLORS[mood] ?? DEFAULT_EMOTION_COLOR)
              : DEFAULT_EMOTION_COLOR;
            return (
              <EmotionBurst
                key={event.event_id}
                position={pos}
                color={color}
                age={age}
              />
            );
          }

          case 'tool_use': {
            return (
              <SkillAura
                key={event.event_id}
                position={pos}
                age={age}
              />
            );
          }

          default:
            return null;
        }
      })}
    </group>
  );
};