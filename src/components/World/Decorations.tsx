/**
 * 环境装饰 — 树木、路灯、长椅
 * 使用 GLB 模型，程序化分布在建筑之间
 */
import React, { useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

// ─── 装饰模型预加载 ─────────────────────────────────────────
const MODELS = {
  tree1: '/models/decorations/tree1.glb',
  tree2: '/models/decorations/tree2.glb',
  lamp: '/models/decorations/lamp.glb',
  bench: '/models/decorations/bench.glb',
};

// 预加载
Object.values(MODELS).forEach((url) => useGLTF.preload(url));

// ─── 工具组件 ───────────────────────────────────────────────

interface InstancedModelProps {
  url: string;
  positions: [number, number, number][];
  scale?: number;
  rotationY?: number;
}

const InstancedModel: React.FC<InstancedModelProps> = ({
  url,
  positions,
  scale = 1,
  rotationY = 0,
}) => {
  const { scene } = useGLTF(url);

  return (
    <group>
      {positions.map((pos, i) => (
        <primitive
          key={i}
          object={scene.clone(true)}
          position={pos}
          scale={scale}
          rotation={[0, rotationY + Math.random() * 0.5, 0]}
        />
      ))}
    </group>
  );
};

// ─── 放置方案 ───────────────────────────────────────────────

/** 生成树木位置 */
function getTreePositions(): [number, number, number][] {
  const positions: [number, number, number][] = [];

  // 中央公园周围
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    const r = 3.5 + Math.random() * 0.5;
    positions.push([
      -12 + Math.cos(angle) * r,
      0,
      15 + Math.sin(angle) * r,
    ]);
  }

  // 建筑之间的空隙（沿街）
  const streetX = [-12, -4, 4, 12];
  const streetZ = [-15, -5, 5, 15, 22];

  // 行之间
  for (let zi = 0; zi < streetZ.length - 1; zi++) {
    const zMid = (streetZ[zi] + streetZ[zi + 1]) / 2;
    for (const x of streetX) {
      const offset = 1.5 + Math.random() * 0.5;
      const side = Math.random() > 0.5 ? 1 : -1;
      positions.push([x + side * offset, 0, zMid + 2.5]);
    }
  }

  // 列之间
  for (let xi = 0; xi < streetX.length - 1; xi++) {
    const xMid = (streetX[xi] + streetX[xi + 1]) / 2;
    for (const z of streetZ) {
      positions.push([xMid, 0, z - 2.5]);
    }
  }

  // 边缘随机点缀
  for (let i = 0; i < 8; i++) {
    const x = (Math.random() - 0.5) * 26;
    const z = (Math.random() - 0.5) * 30;
    // 避免放在建筑位置
    const onBuilding = streetX.some((bx) => Math.abs(x - bx) < 2) &&
                       streetZ.some((bz) => Math.abs(z - bz) < 2);
    if (!onBuilding && Math.abs(x) < 14 && Math.abs(z) < 25) {
      positions.push([x, 0, z]);
    }
  }

  return positions;
}

/** 生成路灯位置（沿路） */
function getLampPositions(): [number, number, number][] {
  const positions: [number, number, number][] = [];

  // 每行道路两侧
  const zRoads = [-17.5, -7.5, 2.5, 12.5, 19.5];
  for (const z of zRoads) {
    for (let x = -14; x <= 14; x += 5) {
      positions.push([x, 0, z]);
      // 稍微偏移避免完全对齐
      if (Math.random() > 0.5) {
        positions.push([x + 2, 0, z - 0.3]);
      }
    }
  }

  return positions;
}

/** 生成长椅位置（公园和街角） */
function getBenchPositions(): [number, number, number][] {
  return [
    // 中央公园
    [-12.5, 0, 14],
    [-11.5, 0, 16.5],
    [-13.5, 0, 17],
    // 街角
    [-13, 0, -6],
    [13, 0, -6],
    [-13, 0, 4],
    [13, 0, 4],
    // 广场
    [-5, 0, 23],
    [5, 0, 23],
  ];
}

// ─── 主组件 ───────────────────────────────────────────────

export const Decorations: React.FC = () => {
  const treePositions = useMemo(() => getTreePositions(), []);
  const tree2Positions = useMemo(() => {
    // 取一部分用第二种树
    return getTreePositions().slice(0, 8);
  }, []);
  const lampPositions = useMemo(() => getLampPositions(), []);
  const benchPositions = useMemo(() => getBenchPositions(), []);

  return (
    <group>
      {/* 锥体树（主树种） */}
      <InstancedModel
        url={MODELS.tree1}
        positions={treePositions}
        scale={0.8 + Math.random() * 0.3}
      />

      {/* 球形树（点缀） */}
      <InstancedModel
        url={MODELS.tree2}
        positions={tree2Positions}
        scale={0.9 + Math.random() * 0.2}
      />

      {/* 路灯 */}
      <InstancedModel
        url={MODELS.lamp}
        positions={lampPositions}
        scale={0.7}
      />

      {/* 长椅 */}
      <InstancedModel
        url={MODELS.bench}
        positions={benchPositions}
        scale={0.8}
      />
    </group>
  );
};
