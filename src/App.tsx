import * as THREE from 'three';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, ToneMapping, SSAO, DepthOfField, SMAA } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import { Agent } from './components/Agent';
import { WorldScene } from './components/World/WorldScene';
import { EventVisualization } from './components/World/EventVisualization';
import { UESkyAndAtmosphere } from './components/World/Environment';
import { AgentDetailPanel } from './components/UI/AgentDetailPanel';
import { StatsOverlay } from './components/UI/StatsOverlay';
import { SkillExecutionPanel } from './components/UI/SkillExecutionPanel';
import { useStore } from './store/useStore';
import { SceneErrorBoundary } from './components/SceneErrorBoundary';
import { LoaderOverlay } from './components/LoaderOverlay';
import { useEffect, useCallback, useRef, useMemo, useState } from 'react';
import { WorldWebSocket } from './services/websocket';
import { createCognitiveWorldSimulator } from './services/cognitiveWorldSimulator';
import type { AgentRuntimeSnapshot } from './services/cognitiveWorldSimulator';
import { api } from './services/api';
import type { AgentData } from './services/types';
import { LOCATIONS } from './data/locations';

const STAND_OFFSET: [number, number, number] = [2.2, 0, 2.2];

function standPositionFor(locationId: string): [number, number, number] {
  const loc = LOCATIONS.find((l) => l.id === locationId);
  if (!loc) return [0, 0, 0];
  return [
    loc.position[0] + STAND_OFFSET[0],
    loc.position[1] + STAND_OFFSET[1],
    loc.position[2] + STAND_OFFSET[2],
  ];
}

const INITIAL_AGENTS: AgentData[] = [
  { id: 'anchor', name: 'Anchor', role: '调解者', position: standPositionFor('office_tower'), mood: '平静', energy: 75, location: 'office_tower' },
  { id: 'anvil', name: 'Anvil', role: '架构师', position: standPositionFor('tech_hub'), mood: '思考中', energy: 80, location: 'tech_hub' },
  { id: 'blackbox', name: 'Blackbox', role: '情报专家', position: standPositionFor('coding_lab'), mood: '平静', energy: 70, location: 'coding_lab' },
  { id: 'flora', name: 'Flora', role: '资源策略师', position: standPositionFor('writers_studio'), mood: '开心', energy: 85, location: 'writers_studio' },
  { id: 'genome', name: 'Genome', role: '智能体科学家', position: standPositionFor('research_institute'), mood: '思考中', energy: 65, location: 'research_institute' },
  { id: 'horizon', name: 'Horizon', role: '探索者', position: standPositionFor('central_park'), mood: '兴奋', energy: 90, location: 'central_park' },
  { id: 'kade', name: 'Kade', role: '风险研究员', position: standPositionFor('city_hall'), mood: '焦虑', energy: 55, location: 'city_hall' },
  { id: 'lovely', name: 'Lovely', role: '社区锚点', position: standPositionFor('coffee_shop'), mood: '开心', energy: 80, location: 'coffee_shop' },
  { id: 'mira', name: 'Mira', role: '行为分析师', position: standPositionFor('restaurant_row'), mood: '思考中', energy: 70, location: 'restaurant_row' },
  { id: 'spark', name: 'Spark', role: '创新领袖', position: standPositionFor('shopping_mall'), mood: '兴奋', energy: 95, location: 'shopping_mall' },
  // ── 补充 Agent 覆盖剩余 8 个建筑 ──
  { id: 'doc', name: 'Doc', role: '医生', position: standPositionFor('hospital'), mood: '平静', energy: 70, location: 'hospital' },
  { id: 'sage', name: 'Sage', role: '教师', position: standPositionFor('school'), mood: '平静', energy: 80, location: 'school' },
  { id: 'badge', name: 'Badge', role: '警官', position: standPositionFor('police_station'), mood: '平静', energy: 75, location: 'police_station' },
  { id: 'nest', name: 'Nest', role: '规划师', position: standPositionFor('apartment_complex'), mood: '思考中', energy: 65, location: 'apartment_complex' },
  { id: 'transit', name: 'Transit', role: '调度员', position: standPositionFor('subway_station'), mood: '平静', energy: 85, location: 'subway_station' },
  { id: 'vault', name: 'Vault', role: '财务官', position: standPositionFor('bank'), mood: '平静', energy: 70, location: 'bank' },
  { id: 'ops', name: 'Ops', role: '运维工程师', position: standPositionFor('devops_center'), mood: '平静', energy: 75, location: 'devops_center' },
  { id: 'page', name: 'Page', role: '作家', position: standPositionFor('bookstore'), mood: '平静', energy: 80, location: 'bookstore' },
];

function PostProcessing() {
  return (
    <EffectComposer multisampling={0} enableNormalPass={true}>
      {/* SMAA — 更高质量的抗锯齿 */}
      <SMAA />
      {/* SSAO — 环境光遮蔽增强立体感 */}
      <SSAO
        radius={0.15}
        intensity={30}
        luminanceInfluence={0.6}
        color={new THREE.Color('#0a0a2a')}
      />
      {/* Bloom — 发光效果 */}
      <Bloom
        intensity={1.5}
        luminanceThreshold={0.2}
        luminanceSmoothing={0.9}
        mipmapBlur
      />
      {/* ACES Filmic 色调映射 */}
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      {/* 暗角 */}
      <Vignette eskil={false} offset={0.1} darkness={0.8} />
    </EffectComposer>
  );
}

function Scene({ mapMode }: { mapMode: 'fantasy' | 'real' }) {
  const { agents, mode, selectedAgentId, setSelectedAgent, selectedLocationId, setSelectedLocation, activeDialogues, simEvents, consumeSimEvent } = useStore();
  const refs = useRef({ cameraMove: false });

  // On mapMode change, adjust camera
  useEffect(() => {
    if (mapMode === 'real') {
      refs.current.cameraMove = true;
    }
  }, [mapMode]);

  const handleAgentClick = useCallback((id: string) => {
    setSelectedAgent(selectedAgentId === id ? null : id);
  }, [selectedAgentId, setSelectedAgent]);

  const handleLocationClick = useCallback((id: string) => {
    setSelectedLocation(selectedLocationId === id ? null : id);
  }, [selectedLocationId, setSelectedLocation]);

  const agentPositions = useMemo(() => {
    const map: Record<string, [number, number, number]> = {};
    agents.forEach(a => { map[a.id] = a.position; });
    return map;
  }, [agents]);

  return (
    <>
      <UESkyAndAtmosphere />

      <WorldScene
        selectedLocationId={selectedLocationId}
        onLocationSelect={handleLocationClick}
        mapMode={mapMode}
      />

      {agents.map(agent => (
        <Agent
          key={agent.id}
          data={agent}
          isSelected={selectedAgentId === agent.id}
          onClick={handleAgentClick}
          activeDialogue={activeDialogues[agent.id]}
        />
      ))}

      <EventVisualization
        events={simEvents}
        agentPositions={agentPositions}
        onEventConsumed={consumeSimEvent}
      />

      {mapMode === 'real' && <HangzhouCamera />}

      <OrbitControls
        enablePan={true}
        autoRotate={false}
        autoRotateSpeed={0.3}
        maxPolarAngle={mapMode === 'real' ? Math.PI / 3 : Math.PI / 2.2}
        minDistance={mapMode === 'real' ? 50 : 5}
        maxDistance={mapMode === 'real' ? 800 : 80}
        target={mapMode === 'real' ? [0, 0, 0] : [0, 4, 0]}
        enableDamping
        dampingFactor={0.05}
      />

      <PostProcessing />
    </>
  );
}

function EventLog() {
  const { logs } = useStore();
  return (
    <div className="space-y-0.5">
      {logs.slice(0, 10).map((log, i) => (
        <div key={i} className="text-xs text-cyan-300/60 font-mono">
          <span className="text-cyan-500/40">{new Date(log.timestamp).toLocaleTimeString()}</span>
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
    timeOfDay, setTimeOfDay, weather, setWeather,
  } = useStore();

  const wsRef = useRef<WorldWebSocket | null>(null);
  const simulatorRef = useRef<ReturnType<typeof createCognitiveWorldSimulator> | null>(null);

  const [mapMode, setMapMode] = useState<'fantasy' | 'real'>('fantasy');

  useEffect(() => {
    updateAgents(INITIAL_AGENTS);
    addLog('世界初始化完成');

    const checkBackend = async () => {
      try {
        await api.health();
        setConnected(true);
        addLog('已连接 IDA 后端');

        const websocket = new WorldWebSocket(worldId);
        websocket.connect();
        websocket.onEvent((event) => {
          try {
            const data = JSON.parse(event.data);
            addLog(`[WS] ${data.event_type}: ${data.content?.slice(0, 30) || ''}`);
          } catch { /* ignore */ }
        });

        wsRef.current = websocket;
      } catch {
        setConnected(false);
        addLog('IDA 后端未连接（使用本地模式）');
      }
    };
    checkBackend();

    return () => {
      wsRef.current?.disconnect();
    };
  }, []);

  useEffect(() => {
    const agentIds = INITIAL_AGENTS.map(a => a.id);
    const sim = createCognitiveWorldSimulator(worldId, agentIds, { tickInterval: 3500 });

    sim.onEvent((event) => {
      addSimEvent(event);
      addLog(`[${event.category}] ${event.agent_id}: ${event.content?.slice(0, 40) || ''}`);

      switch (event.category) {
        case 'dialogue':
          if (event.agent_id) {
            setActiveDialogue(event.agent_id, event.content || '');
            setTimeout(() => clearDialogue(event.agent_id!), 3000);
          }
          break;
        case 'move':
          if (event.agent_id && event.target_position) {
            const [tx, ty, tz] = event.target_position;
            updateAgentState(event.agent_id, {
              position: [tx + STAND_OFFSET[0], ty + STAND_OFFSET[1], tz + STAND_OFFSET[2]],
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

    // CognitiveSimulator 同步状态（不覆盖位置，让 Agent lerp 平滑移动）
    sim.onStateUpdate((states: AgentRuntimeSnapshot[]) => {
      for (const s of states) {
        updateAgentState(s.id, {
          mood: s.emotion,
          energy: s.energy,
          location: s.location,
        });
      }
    });

    sim.start();
    simulatorRef.current = sim;
    setIsSimulating(true);

    // 初始同步：确保 Agent 位置与引擎一致
    const initialStates = sim.getAgentRuntimeStates();
    for (const s of initialStates) {
      updateAgentState(s.id, {
        position: s.position as [number, number, number],
        mood: s.emotion,
        energy: s.energy,
        location: s.location,
      });
    }

    addLog('认知引擎已启动（深度人格 + 叙事弧线 + LLM）');

    return () => {
      sim.stop();
      simulatorRef.current = null;
      setIsSimulating(false);
    };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setWorldTime(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

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
    <div className="w-full h-screen bg-[#050510] relative overflow-hidden">
      <LoaderOverlay />
      <SceneErrorBoundary>
        <Canvas
        shadows={{ type: THREE.PCFShadowMap }}
        camera={{ position: [25, 18, 25], fov: 45 }}
        gl={{
          antialias: true,
          toneMapping: THREE.NoToneMapping,
          toneMappingExposure: 1.0,
          powerPreference: 'high-performance',
        }}
        dpr={[1, 2]}
      >
        <Scene mapMode={mapMode} />
      </Canvas>
      </SceneErrorBoundary>

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
        timeOfDay={timeOfDay}
        weather={weather}
        onTimeChange={setTimeOfDay}
        onWeatherChange={setWeather}
      />

      <SkillExecutionPanel executions={skillExecutions} />

      <AgentDetailPanel
        agent={selectedAgent || null}
        onClose={() => setSelectedAgent(null)}
      />

      {/* Map mode toggle */}
      <button
        onClick={() => setMapMode(m => m === 'fantasy' ? 'real' : 'fantasy')}
        className="absolute top-4 right-4 px-4 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-xs border border-cyan-500/30 rounded-lg transition-all font-mono tracking-wider backdrop-blur-sm"
      >
        {mapMode === 'real' ? '🗺️ 杭州' : '🏙️ 幻想'}
      </button>

      <div className="absolute bottom-4 left-4 right-4 h-20 overflow-y-auto bg-[#050510]/80 backdrop-blur-md rounded-lg border border-cyan-500/20 p-2 shadow-[0_0_15px_rgba(0,255,255,0.1)]">
        <EventLog />
      </div>
    </div>
  );
}

/** Snap camera to bird's-eye for Hangzhou */
function HangzhouCamera() {
  const { camera } = useThree();
  useEffect(() => {
    camera.position.set(0, 120, 0);
    camera.lookAt(0, 0, 0);
  }, [camera]);
  return null;
}
