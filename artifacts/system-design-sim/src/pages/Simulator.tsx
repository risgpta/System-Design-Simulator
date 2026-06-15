import { useState, useCallback } from "react";
import { SimulationParams, useSimulation } from "@/hooks/useSimulation";
import { SystemTopology, NodeType, CapMode } from "@/types/graph";
import { SCENARIOS, DEFAULT_SCENARIO_ID } from "@/data/scenarios";
import { getDefaultPosition, getAutoEdges } from "@/utils/topologyHelpers";
import TopBar from "@/components/simulator/TopBar";
import ScenarioBar from "@/components/simulator/ScenarioBar";
import NodeGraph from "@/components/simulator/NodeGraph";
import ControlPanel from "@/components/simulator/ControlPanel";

const defaultScenario = SCENARIOS.find(s => s.id === DEFAULT_SCENARIO_ID)!;

const DEFAULT_PARAMS: SimulationParams = {
  totalRPS: defaultScenario.defaultRPS,
  readRatio: defaultScenario.defaultReadRatio,
  cacheHitRate: defaultScenario.defaultCacheHitRate,
  dbPoolSize: defaultScenario.defaultDbPool,
  lockingMode: "row",
};

export default function Simulator() {
  const [params, setParams] = useState<SimulationParams>(DEFAULT_PARAMS);
  const [topology, setTopology] = useState<SystemTopology>(defaultScenario.topology);

  const metrics = useSimulation(params, topology);

  const handleLoadScenario = useCallback((scenarioId: string) => {
    const scenario = SCENARIOS.find(s => s.id === scenarioId);
    if (!scenario) return;
    setTopology({ ...scenario.topology });
    setParams(prev => ({
      ...prev,
      totalRPS: scenario.defaultRPS,
      readRatio: scenario.defaultReadRatio,
      cacheHitRate: scenario.defaultCacheHitRate,
      dbPoolSize: scenario.defaultDbPool,
    }));
  }, []);

  const handleAddNode = useCallback((type: NodeType) => {
    setTopology(prev => {
      const pos = getDefaultPosition(type, prev.nodes);
      const newNode = {
        id: `n${Date.now()}`,
        type,
        ...pos,
        crashed: false,
      };
      const newEdges = getAutoEdges(newNode, prev.nodes);
      return {
        ...prev,
        nodes: [...prev.nodes, newNode],
        edges: [...prev.edges, ...newEdges],
        scenarioId: 'custom',
      };
    });
  }, []);

  const handleRemoveNode = useCallback((nodeId: string) => {
    setTopology(prev => ({
      ...prev,
      nodes: prev.nodes.filter(n => n.id !== nodeId),
      edges: prev.edges.filter(e => e.from !== nodeId && e.to !== nodeId),
      scenarioId: prev.scenarioId === nodeId ? 'custom' : prev.scenarioId,
    }));
  }, []);

  const handleToggleCrash = useCallback((nodeId: string) => {
    setTopology(prev => ({
      ...prev,
      nodes: prev.nodes.map(n =>
        n.id === nodeId ? { ...n, crashed: !n.crashed } : n
      ),
    }));
  }, []);

  const handleSetCapMode = useCallback((mode: CapMode) => {
    setTopology(prev => ({ ...prev, capMode: mode }));
  }, []);

  return (
    <div className="h-screen flex flex-col bg-background text-foreground overflow-hidden" data-testid="simulator-root">
      <TopBar metrics={metrics} />
      <ScenarioBar
        currentScenarioId={topology.scenarioId}
        onLoadScenario={handleLoadScenario}
        totalRPS={params.totalRPS}
      />
      <div className="flex flex-1 overflow-hidden">
        <NodeGraph
          topology={topology}
          metrics={metrics}
          params={params}
          onToggleCrash={handleToggleCrash}
        />
        <ControlPanel
          params={params}
          topology={topology}
          metrics={metrics}
          onParamsChange={setParams}
          onAddNode={handleAddNode}
          onRemoveNode={handleRemoveNode}
          onToggleCrash={handleToggleCrash}
          onLoadScenario={handleLoadScenario}
          onSetCapMode={handleSetCapMode}
        />
      </div>
      <footer className="shrink-0 flex items-center justify-center py-1.5 text-xs text-muted-foreground border-t border-border/40 bg-background">
        Made by AI &amp;&nbsp;
        <a
          href="https://www.linkedin.com/in/risgpta/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline font-medium"
        >
          @risgpta
        </a>
      </footer>
    </div>
  );
}
