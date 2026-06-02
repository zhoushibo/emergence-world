import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import { Agent } from './components/Agent';
import { WorldScene } from './components/World/WorldScene';
import { EventVisualization } from './components/World/EventVisualization';
import { AgentDetailPanel } from './components/UI/AgentDetailPanel';
import { StatsOverlay } from './components/UI/StatsOverlay';
import { SkillExecutionPanel } from './components/UI/SkillExecutionPanel';
import { useStore } from './store/useStore';
import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { WorldWebSocket } from './services/websocket';
import { WorldSimulator, createWorldSimulator } from './services/worldSimulator';
import { api } from './services/api';
import type { AgentData } from './services/types';

// 初始智能体数据（10个角色，对应 Emergence World 的10位公民）
const INITIAL_AGENTS: AgentData[] = [
  { id: 'anchor', name: 'Anchor', role: '调解者', position: [-4, 0, -5], mood: '平静', energy: 75, location: 'office_tower' },
  { id: 'anvil', name: 'Anvil', role: '架构师', position: [4, 0, -5], mood: '思考中', energy: 80, location: 'tech_hub' },
  { id: 'blackbox', name: 'Blackbox', role: '情报专家', position: [12, 0, -5], mood: '平静', energy: 70, location: 'coding_lab' },
  { id: 'flora', name: 'Flora', role: '资源策略师', position: [-12, 0, 5], mood: '开心', energy: 85, location: 'writers_studio' },
  { id: 'genome', name: 'Genome', role: '智能体科学家', position: [-12, 0, -15], mood: '思考中', energy: 65, location: 'research_institute' },
  { id: 'horizon', name: 'Horizon', role: '探索者', position: [-12, 0, 15], mood: '兴奋', energy: 90, location: 'central_park' },
  { id: 'kade', name: 'Kade', role: '风险研究员', position: [4, 0, 15], mood: '焦虑', energy: 55, location: 'city_hall' },
  { id: 'lovely', name: 'Lovely', role: '社区锚点', position: [-4, 0, 5], mood: '开心', energy: 80, location: 'coffee_shop' },
  { id: 'mira', name: 'Mira', role: '行为分析师', position: [4, 0, 5], mood: '思考中', energy: 70, location: 'restaurant_row' },
  { id: 'spark', name: 'Spark', role: '创新领袖', position: [12, 0, 5], mood: '兴奋', energy: 95, location: 'shopping_mall' },
];

function Scene() {
  const { agents, mode, selectedAgentId, setSelectedAgent, selectedLocationId, setSelectedLocation, activeDialogues, simEvents, consumeSimEvent } = useStore();

  const handleAgentClick = useCallback((id: string) => {
    setSelectedAgent(selectedAgentId === id ? null : id);
  }, [selectedAgentId, setSelectedAgent]);

  const handleLocationClick = useCallback((id: string) => {
    setSelectedLocation(selectedLocationId === id ? null : id);
  }, [selectedLocationId, setSelectedLocation]);

  // 构建 agentPositions 映射
  const agentPositions = useMemo(() => {
    const map: Record<string, [number, number, number]> = {};
    agents.forEach(a => { map[a.id] = a.position; });
    return map;
  }, [agents]);

  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 15, 5]} intensity={1.2} castShadow />
      <Environment preset="city" />

      {/* 世界地标 */}
      <WorldScene
        selectedLocationId={selectedLocationId}
        onLocationSelect={handleLocationClick}
      />

      {/* 智能体 */}
      {agents.map(agent => (
        <Agent
          key={agent.id}
          data={agent}
          isSelected={selectedAgentId === agent.id}
          onClick={handleAgentClick}
          activeDialogue={activeDialogues[agent.id]}
        />
      ))}

      {/* 事件可视化 */}
      <EventVisualization
        events={simEvents}
        agentPositions={agentPositions}
        onEventConsumed={consumeSimEvent}
      />

      {/* 相机控制 */}
      <OrbitControls
        enablePan={true}
        autoRotate={mode === 'cinematic'}
        autoRotateSpeed={0.3}
        maxPolarAngle={Math.PI / 2.2}
        minDistance={5}
        maxDistance={50}
      />
    </>
  );
}

function EventLog() {
  const { logs } = useStore();
  return (
    <div className="space-y-0.5">
      {logs.slice(0, 10).map((log, i) => (
        <div key={i} className="text-xs text-gray-400 font-mono">
          <span className="text-gray-600">{new Date(log.timestamp).toLocaleTimeString()}</span>
          {' '}
          {log.message}
        </div>
      ))}
    </div>
  );
}

export default function App() {
  const {
    updateAgents, addLog, agents, selectedAgentId, setSelectedAgent,
    mode, setMode, worldId, eventCount, dramaLevel, connected, setConnected,
    addSimEvent, setActiveDialogue, clearDialogue, updateAgentState,
    addSkillExecution, updateSkillExecution, setIsSimulating,
    skillExecutions, worldTime, setWorldTime, isSimulating,
  } = useStore();

  const [ws, setWs] = useState<WorldWebSocket | null>(null);
  const simulatorRef = useRef<WorldSimulator | null>(null);

  // 初始化
  useEffect(() => {
    updateAgents(INITIAL_AGENTS);
    addLog('世界初始化完成');

    // 尝试连接后端
    const checkBackend = async () => {
      try {
        await api.health();
        setConnected(true);
        addLog('已连接 IDA 后端');

        // 启动 WebSocket
        const websocket = new WorldWebSocket(worldId);
        websocket.connect();
        websocket.onEvent((event) => {
          try {
            const data = JSON.parse(event.data);
            addLog(`[WS] ${data.event_type}: ${data.content?.slice(0, 30) || ''}`);
          } catch { /* ignore */ }
        });
        setWs(websocket);
      } catch {
        setConnected(false);
        addLog('IDA 后端未连接（使用本地模式）');
      }
    };
    checkBackend();

    return () => {
      ws?.disconnect();
    };
  }, []);

  // 初始化世界模拟引擎
  useEffect(() => {
    const agentIds = INITIAL_AGENTS.map(a => a.id);
    const sim = createWorldSimulator(worldId, agentIds, { tickInterval: 3000 });

    sim.onEvent((event) => {
      addSimEvent(event);
      addLog(`[${event.category}] ${event.agent_id}: ${event.content?.slice(0, 40) || ''}`);

      // 处理事件驱动的状态变化
      switch (event.category) {
        case 'dialogue':
          if (event.agent_id) {
            setActiveDialogue(event.agent_id, event.content || '');
            setTimeout(() => clearDialogue(event.agent_id!), 3000);
          }
          break;
        case 'move':
          if (event.agent_id && event.target_position) {
            updateAgentState(event.agent_id, {
              position: event.target_position,
              location: event.location,
            });
          }
          break;
        case 'emotion':
          if (event.agent_id && event.emotion_value) {
            updateAgentState(event.agent_id, { mood: event.emotion_value });
          }
          break;
        case 'tool_use':
          if (event.agent_id) {
            addSkillExecution({
              id: event.event_id,
              skillName: event.tool_name || 'unknown',
              modelTier: 'L2',
              status: 'running',
              input: event.content || '',
              output: '',
              startTime: Date.now(),
              endTime: null,
              error: null,
            });
            // 模拟 Skill 执行完成
            setTimeout(() => {
              updateSkillExecution(event.event_id, {
                status: 'completed',
                output: '执行完成',
                endTime: Date.now(),
              });
            }, 2000);
          }
          break;
      }
    });

    sim.start();
    simulatorRef.current = sim;
    setIsSimulating(true);
    addLog('世界模拟引擎已启动（3s tick）');

    return () => {
      sim.stop();
      simulatorRef.current = null;
      setIsSimulating(false);
    };
  }, []);

  // 世界时间每秒更新
  useEffect(() => {
    const timer = setInterval(() => {
      setWorldTime(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 模拟引擎播放/暂停控制
  const toggleSimulation = useCallback(() => {
    const sim = simulatorRef.current;
    if (!sim) return;
    if (isSimulating) {
      sim.stop();
      setIsSimulating(false);
      addLog('模拟引擎已暂停');
    } else {
      sim.start();
      setIsSimulating(true);
      addLog('模拟引擎已恢复');
    }
  }, [isSimulating, addLog, setIsSimulating]);

  const selectedAgent = agents.find(a => a.id === selectedAgentId);

  return (
    <div className="w-full h-screen bg-gray-900 relative">
      <Canvas shadows camera={{ position: [20, 15, 20], fov: 50 }}>
        <Scene />
      </Canvas>

      {/* 左上角统计 */}
      <StatsOverlay
        worldId={worldId}
        agentCount={agents.length}
        eventCount={eventCount}
        dramaLevel={dramaLevel}
        mode={mode}
        onModeChange={setMode}
        connected={connected}
        worldTime={worldTime}
        isSimulating={isSimulating}
        onToggleSimulation={toggleSimulation}
      />

      {/* Skill 执行面板 */}
      <SkillExecutionPanel executions={skillExecutions} />

      {/* 右侧智能体详情 */}
      <AgentDetailPanel
        agent={selectedAgent || null}
        onClose={() => setSelectedAgent(null)}
      />

      {/* 底部事件日志 */}
      <div className="absolute bottom-4 left-4 right-4 h-20 overflow-y-auto bg-gray-900/80 rounded-lg border border-gray-700 p-2">
        <EventLog />
      </div>
    </div>
  );
}
