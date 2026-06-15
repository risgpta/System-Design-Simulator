import { useState, useCallback } from "react";
import { SimulationParams, useSimulation } from "@/hooks/useSimulation";
import { SystemTopology, NodeType, CapMode } from "@/types/graph";
import { SCENARIOS, DEFAULT_SCENARIO_ID } from "@/data/scenarios";
import { getDefaultPosition, getAutoEdges } from "@/utils/topologyHelpers";
import TopBar from "@/components/simulator/TopBar";
import ScenarioBar from "@/components/simulator/ScenarioBar";
import NodeGraph from "@/components/simulator/NodeGraph";
import ControlPanel from "@/components/simulator/ControlPanel";
import { SlidersHorizontal, X } from "lucide-react";

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
  const [showMobilePanel, setShowMobilePanel] = useState(false);

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

  const controlPanelProps = {
    params, topology, metrics,
    onParamsChange: setParams,
    onAddNode: handleAddNode,
    onRemoveNode: handleRemoveNode,
    onToggleCrash: handleToggleCrash,
    onLoadScenario: handleLoadScenario,
    onSetCapMode: handleSetCapMode,
  };

  return (
    <div className="h-screen flex flex-col bg-background text-foreground overflow-hidden" data-testid="simulator-root">
      <TopBar metrics={metrics} />
      <ScenarioBar
        currentScenarioId={topology.scenarioId}
        onLoadScenario={handleLoadScenario}
        totalRPS={params.totalRPS}
      />

      {/* Main area: graph + desktop control panel */}
      <div className="flex flex-1 overflow-hidden min-h-0">
        <NodeGraph
          topology={topology}
          metrics={metrics}
          params={params}
          onToggleCrash={handleToggleCrash}
        />
        {/* Desktop only */}
        <div className="hidden md:flex">
          <ControlPanel {...controlPanelProps} />
        </div>
      </div>

      {/* Mobile: floating Controls button */}
      <button
        onClick={() => setShowMobilePanel(true)}
        className="md:hidden fixed bottom-10 right-4 z-40 flex items-center gap-2 px-4 py-2.5 rounded-full bg-cyan-500 text-black text-xs font-bold shadow-lg shadow-cyan-500/30"
        aria-label="Open controls"
      >
        <SlidersHorizontal className="w-4 h-4" />
        Controls
      </button>

      {/* Mobile: full-screen control panel overlay */}
      {showMobilePanel && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col bg-black/95 backdrop-blur-sm">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/10 flex-shrink-0">
            <span className="text-xs font-mono text-cyan-400 uppercase tracking-widest">Controls</span>
            <button
              onClick={() => setShowMobilePanel(false)}
              className="w-7 h-7 flex items-center justify-center rounded-full border border-white/10 text-slate-400 hover:text-white"
              aria-label="Close controls"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 overflow-hidden">
            <ControlPanel {...controlPanelProps} />
          </div>
        </div>
      )}

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
