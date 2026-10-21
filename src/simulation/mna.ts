import type { CircuitDocument } from "../domain/circuit";
import { buildElectricalGraph, CircuitError } from "./graph";
import type { Diagnostic, ElectricalGraph } from "./graph";
import { solveLinearSystem } from "./solver";
export interface MnaSystem {
  A: number[][];
  b: number[];
  unknowns: string[];
}
export function assembleMna(graph: ElectricalGraph): MnaSystem {
  const unsupported = graph.branches.filter(
    ({ component: c }) => c.kind !== "resistor" && c.kind !== "voltage",
  );
  if (unsupported.length)
    throw new CircuitError(
      "dcUnsupported",
      "A análise DC suporta apenas resistores e fontes de tensão.",
      unsupported.map(({ component: c }) => c.id),
    );
  const count = graph.nodes.length - 1;
  const sources = graph.branches.filter((b) => b.component.kind === "voltage");
  const size = count + sources.length;
  const A = Array.from({ length: size }, () => Array<number>(size).fill(0));
  const b = Array<number>(size).fill(0);
  const add = (r: number, c: number, value: number) => {
    if (r >= 0 && c >= 0) A[r][c] += value;
  };
  for (const branch of graph.branches) {
    const a = branch.a - 1,
      end = branch.b - 1;
    if (branch.component.kind === "resistor") {
      const g = 1 / branch.component.value;
      add(a, a, g);
      add(end, end, g);
      add(a, end, -g);
      add(end, a, -g);
    } else if (branch.component.kind === "voltage") {
      const index = count + sources.indexOf(branch);
      add(a, index, 1);
      add(end, index, -1);
      add(index, a, 1);
      add(index, end, -1);
      b[index] = branch.component.value;
    }
  }
  return {
    A,
    b,
    unknowns: [
      ...graph.nodes.slice(1).map((n) => `V(N${n})`),
      ...sources.map((s) => `I(${s.component.name})`),
    ],
  };
}
export interface ComponentResult {
  id: string;
  name: string;
  voltage: number;
  current: number;
}
export type SimulationOutcome =
  | {
      ok: true;
      graph: ElectricalGraph;
      system: MnaSystem;
      x: number[];
      residual: number;
      time?: number;
      voltages: number[];
      components: ComponentResult[];
    }
  | { ok: false; diagnostic: Diagnostic };
export function simulateDc(doc: CircuitDocument): SimulationOutcome {
  try {
    const graph = buildElectricalGraph(doc),
      system = assembleMna(graph);
    const { x, residual } = solveLinearSystem(system.A, system.b);
    const voltages = [0, ...x.slice(0, graph.nodes.length - 1)];
    let sourceIndex = graph.nodes.length - 1;
    const components = graph.branches.map(({ component, a, b }) => {
      const voltage = voltages[a] - voltages[b];
      return {
        id: component.id,
        name: component.name,
        voltage,
        current: component.kind === "resistor" ? voltage / component.value : x[sourceIndex++],
      };
    });
    return { ok: true, graph, system, x, residual, voltages, components };
  } catch (error) {
    if (error instanceof CircuitError) {
      const diagnostic = error.diagnostic;
      const ids = diagnostic.elementIds.length
        ? diagnostic.elementIds
        : ["inconsistent", "singular"].includes(diagnostic.code)
          ? doc.components.filter((c) => c.kind === "voltage").map((c) => c.id)
          : [];
      return { ok: false, diagnostic: { ...diagnostic, elementIds: ids } };
    }
    throw error;
  }
}
