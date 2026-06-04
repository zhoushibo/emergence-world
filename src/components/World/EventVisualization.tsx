/**
 * 事件可视化 — 对话弧线、移动轨迹、情绪爆发、技能光环
 * 使用 drei 的 Line 组件替代原生 THREE.Line extend hack
 */
import React, { useRef, useState, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import * as THREE from 'three';
import type { SimEvent } from '../../services/worldSimulator';

interface EventVisualizationProps {
  events: SimEvent[];
  agentPositions: Record<string, [number, number, number]>;
  onEventConsumed: (eventId: string) => void;
}

const EVENT_LIFETIME_MS = 3000;
const DIALOGUE_FADE_S = 2;
const MOVE_FADE_S = 3;
const EMOTION_FADE_S = 1.5;
const SKILL_FADE_S = 2;
const FADE_REFRESH_MS = 50;

const EMOTION_COLORS: Record<string, string> = {
  neutral: '#94a3b8',
  happy: '#4ade80',
  focused: '#60a5fa',
  curious: '#fbbf24',
  anxious: '#f59e0b',
  frustrated: '#ef4444',
  excited: '#f472b6',
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

interface TrackedEvent {
  event: SimEvent;
  startTime: number;
}

/**
 * 对话弧线 — 从说话者到目标的三次贝塞尔曲线
 */
const DialogueLine: React.FC<{
  from: [number, number, number];
  to: [number, number, number];
  age: number;
}> = ({ from, to, age }) => {
  const opacity = Math.max(0, 1 - age / DIALOGUE_FADE_S);
  const isHidden = opacity <= 0;

  const points = useMemo(() => {
    if (isHidden) return [];
    const midY = Math.max(from[1], to[1]) + 1.5;
    const pts = [
      new THREE.Vector3(from[0], from[1] + 1, from[2]),
      new THREE.Vector3((from[0] + to[0]) / 2, midY, (from[2] + to[2]) / 2),
      new THREE.Vector3(to[0], to[1] + 1, to[2]),
    ];
    const curve = new THREE.QuadraticBezierCurve3(pts[0], pts[1], pts[2]);
    return curve.getPoints(20);
  }, [from[0], from[1], from[2], to[0], to[1], to[2], isHidden]);

  if (isHidden || points.length === 0) return null;

  return (
    <Line
      points={points}
      color="#ffcc44"
      lineWidth={1.5}
      transparent
      opacity={opacity * 0.9}
    />
  );
};

/**
 * 移动轨迹 — 从起始到目标位置的直线
 */
const MoveTrail: React.FC<{
  from: [number, number, number];
  to: [number, number, number];
  age: number;
}> = ({ from, to, age }) => {
  const opacity = Math.max(0, 1 - age / MOVE_FADE_S);
  const isHidden = opacity <= 0;

  const points = useMemo(() => {
    if (isHidden) return [];
    return [
      new THREE.Vector3(from[0], 0.1, from[2]),
      new THREE.Vector3(to[0], 0.1, to[2]),
    ];
  }, [from[0], from[2], to[0], to[2], isHidden]);

  if (isHidden || points.length === 0) return null;

  return (
    <Line
      points={points}
      color="#44aaff"
      lineWidth={1}
      transparent
      opacity={opacity * 0.7}
      dashed
      dashSize={0.2}
      gapSize={0.15}
    />
  );
};

/**
 * 情绪爆发 — 旋转的发光几何体
 */
const EmotionBurst: React.FC<{
  position: [number, number, number];
  color: string;
  age: number;
}> = ({ position, color, age }) => {
  const ref = useRef<THREE.Group>(null);
  const opacity = Math.max(0, 1 - age / EMOTION_FADE_S);
  const yOffset = age * 0.8;

  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.y = state.clock.getElapsedTime() * 2;
    }
  });

  if (opacity <= 0) return null;

  return (
    <group ref={ref} position={[position[0], position[1] + 1.5 + yOffset, position[2]]}>
      <mesh>
        <icosahedronGeometry args={[0.1, 1]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={1.2}
          transparent
          opacity={opacity}
          roughness={0.2}
          metalness={0.8}
          toneMapped={false}
        />
      </mesh>
      <mesh>
        <octahedronGeometry args={[0.18, 0]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.5}
          transparent
          opacity={opacity * 0.3}
          wireframe
          toneMapped={false}
        />
      </mesh>
    </group>
  );
};

/**
 * 技能光环 — 旋转的双环发光效果
 */
const SkillAura: React.FC<{
  position: [number, number, number];
  age: number;
}> = ({ position, age }) => {
  const ref = useRef<THREE.Group>(null);
  const opacity = Math.max(0, 1 - age / SKILL_FADE_S);

  useFrame((state) => {
    if (ref.current) {
      const t = state.clock.getElapsedTime();
      ref.current.rotation.y = t * 3;
      ref.current.rotation.x = t * 0.5;
    }
  });

  if (opacity <= 0) return null;

  return (
    <group ref={ref} position={[position[0], position[1] + 0.5, position[2]]}>
      <mesh>
        <torusGeometry args={[0.5, 0.02, 8, 32]} />
        <meshStandardMaterial
          color="#aa66ff"
          emissive="#aa66ff"
          emissiveIntensity={1.0}
          transparent
          opacity={opacity}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.4, 0.015, 8, 32]} />
        <meshStandardMaterial
          color="#ff44aa"
          emissive="#ff44aa"
          emissiveIntensity={0.8}
          transparent
          opacity={opacity * 0.7}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
      <pointLight
        intensity={opacity * 0.5}
        color="#aa66ff"
        distance={3}
        decay={2}
      />
    </group>
  );
};

export const EventVisualization: React.FC<EventVisualizationProps> = ({
  events,
  agentPositions,
  onEventConsumed,
}) => {
  const [trackedEvents, setTrackedEvents] = useState<TrackedEvent[]>([]);
  const knownEventIds = useRef<Set<string>>(new Set());
  const clockRef = useRef(Date.now());
  const eventsRef = useRef(events);
  const onConsumedRef = useRef(onEventConsumed);
  eventsRef.current = events;
  onConsumedRef.current = onEventConsumed;

  useEffect(() => {
    const id = setInterval(() => {
      const now = Date.now();
      clockRef.current = now;

      setTrackedEvents((prev) => {
        const incoming: TrackedEvent[] = [];
        for (const event of eventsRef.current) {
          if (!knownEventIds.current.has(event.event_id)) {
            knownEventIds.current.add(event.event_id);
            incoming.push({ event, startTime: now });
          }
        }

        const expired: string[] = [];
        const alive = prev.filter((te) => {
          if (now - te.startTime >= EVENT_LIFETIME_MS) {
            expired.push(te.event.event_id);
            return false;
          }
          return true;
        });

        if (expired.length > 0) {
          queueMicrotask(() => {
            expired.forEach((id) => {
              knownEventIds.current.delete(id);
              onConsumedRef.current(id);
            });
          });
        }

        if (incoming.length === 0 && alive.length === prev.length) return prev;
        return [...alive, ...incoming];
      });
    }, FADE_REFRESH_MS);

    return () => clearInterval(id);
  }, []);

  const now = clockRef.current;

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

          case 'relationship': {
            // 关系事件暂无视觉反馈
            return null;
          }

          default:
            return null;
        }
      })}
    </group>
  );
};
