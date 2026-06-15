import { useState } from "react";
import { SimulationParams, useSimulation } from "@/hooks/useSimulation";
import TopBar from "@/components/simulator/TopBar";
import NodeGraph from "@/components/simulator/NodeGraph";
import ControlPanel from "@/components/simulator/ControlPanel";

const DEFAULT_PARAMS: SimulationParams = {
  totalRPS: 3000,
  readRatio: 0.8,
  cacheHitRate: 0.7,
  dbPoolSize: 80,
  lockingMode: "row",
};

export default function Simulator() {
  const [params, setParams] = useState<SimulationParams>(DEFAULT_PARAMS);
  const metrics = useSimulation(params);

  return (
    <div className="h-screen flex flex-col bg-background text-foreground overflow-hidden" data-testid="simulator-root">
      <TopBar metrics={metrics} />
      <div className="flex flex-1 overflow-hidden">
        <NodeGraph metrics={metrics} params={params} />
        <ControlPanel params={params} onParamsChange={setParams} />
      </div>
    </div>
  );
}
