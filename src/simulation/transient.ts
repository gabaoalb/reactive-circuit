import type { CircuitDocument } from "../domain/circuit";
import { buildElectricalGraph, CircuitError } from "./graph";
import type { ElectricalGraph } from "./graph";
import type { MnaSystem, SimulationOutcome } from "./mna";
import { solveLinearSystem } from "./solver";

export const DEFAULT_TIME_STEP = 5e-6;
export type TransientSnapshot = Extract<SimulationOutcome, { ok: true }> & { time: number };
interface Memory {
  voltage: number;
  current: number;
}
export interface TransientSession {
  document: CircuitDocument;
  graph: ElectricalGraph;
  timeStep: number;
  steps: number;
  memory: Record<string, Memory>;
  snapshot: TransientSnapshot;
  useEuler: boolean;
}

function solve(
  graph: ElectricalGraph,
  memory: Record<string, Memory>,
  dt: number,
  time: number,
  initialize: boolean,
  euler: boolean,
): TransientSnapshot {
  const nodes = graph.nodes.length - 1;
  const constraints = graph.branches.filter(
    ({ component: c }) =>
      c.kind === "voltage" ||
      (c.kind === "switch" && c.closed) ||
      (initialize && c.kind === "capacitor"),
  );
  const indices = new Map(constraints.map((branch, i) => [branch.component.id, nodes + i]));
  const size = nodes + constraints.length;
  const A = Array.from({ length: size }, () => Array<number>(size).fill(0));
  const b = Array<number>(size).fill(0);
  const add = (row: number, col: number, v: number) => {
    if (row >= 0 && col >= 0) A[row][col] += v;
  };
  const sources = new Map<string, { g: number; current: number }>();
  for (const { component: c, a, b: end } of graph.branches) {
    const x = a - 1,
      y = end - 1;
    const index = indices.get(c.id);
    if (index !== undefined) {
      add(x, index, 1);
      add(y, index, -1);
      add(index, x, 1);
      add(index, y, -1);
      b[index] = c.kind === "voltage" ? c.value : c.kind === "capacitor" ? memory[c.id].voltage : 0;
      continue;
    }
    let g = 0,
      current = 0;
    if (c.kind === "resistor") g = 1 / c.value;
    if (c.kind === "capacitor") {
      g = ((euler ? 1 : 2) * c.value) / dt;
      current = -g * memory[c.id].voltage - (euler ? 0 : memory[c.id].current);
    }
    if (c.kind === "inductor") {
      g = initialize ? 0 : dt / ((euler ? 1 : 2) * c.value);
      current = memory[c.id].current + (euler || initialize ? 0 : g * memory[c.id].voltage);
    }
    add(x, x, g);
    add(y, y, g);
    add(x, y, -g);
    add(y, x, -g);
    if (x >= 0) b[x] -= current;
    if (y >= 0) b[y] += current;
    sources.set(c.id, { g, current });
  }
  const system: MnaSystem = {
    A,
    b,
    unknowns: [
      ...graph.nodes.slice(1).map((n) => `V(N${n})`),
      ...constraints.map(({ component: c }) => `I(${c.name})`),
    ],
  };
  const { x, residual } = solveLinearSystem(A, b);
  const voltages = [0, ...x.slice(0, nodes)];
  const components = graph.branches.map(({ component: c, a, b: end }) => {
    const voltage = voltages[a] - voltages[end];
    const index = indices.get(c.id);
    const source = sources.get(c.id);
    const current =
      index !== undefined ? x[index] : source ? source.g * voltage + source.current : 0;
    if (!Number.isFinite(voltage) || !Number.isFinite(current))
      throw new CircuitError(
        "numerical",
        "Não foi possível obter uma solução numericamente confiável.",
        [c.id],
      );
    return { id: c.id, name: c.name, voltage, current };
  });
  return { ok: true, graph, system, x, residual, voltages, components, time };
}

function memoryOf(snapshot: TransientSnapshot): Record<string, Memory> {
  return Object.fromEntries(
    snapshot.components.map((c) => [c.id, { voltage: c.voltage, current: c.current }]),
  );
}

export function initializeTransient(
  document: CircuitDocument,
  timeStep = DEFAULT_TIME_STEP,
): TransientSession {
  if (!Number.isFinite(timeStep) || timeStep <= 0)
    throw new CircuitError("timeStep", "O passo de tempo deve ser positivo e finito.");
  const graph = buildElectricalGraph(document);
  const memory = Object.fromEntries(
    graph.branches.map(({ component: c }) => [
      c.id,
      {
        voltage: c.kind === "capacitor" ? (c.initialValue ?? 0) : 0,
        current: c.kind === "inductor" ? (c.initialValue ?? 0) : 0,
      },
    ]),
  );
  const snapshot = solve(graph, memory, timeStep, 0, true, false);
  return {
    document,
    graph,
    timeStep,
    steps: 0,
    memory: memoryOf(snapshot),
    snapshot,
    useEuler: false,
  };
}

/** Returns a new session; failures never advance time or partially commit history. */
export function stepTransient(session: TransientSession): TransientSession {
  const steps = session.steps + 1;
  const snapshot = solve(
    session.graph,
    session.memory,
    session.timeStep,
    steps * session.timeStep,
    false,
    session.useEuler,
  );
  return { ...session, steps, snapshot, memory: memoryOf(snapshot), useEuler: false };
}

/** Recompute algebraic quantities while preserving capacitor voltage and inductor current. */
export function setTransientSwitch(
  session: TransientSession,
  id: string,
  closed: boolean,
): TransientSession {
  const component = session.document.components.find((c) => c.id === id);
  if (component?.kind !== "switch") throw new CircuitError("reference", "Chave inexistente.", [id]);
  if (component.closed === closed) return session;
  const document = {
    ...session.document,
    components: session.document.components.map((c) =>
      c.id === id && c.kind === "switch" ? { ...c, closed } : c,
    ),
  };
  const graph = buildElectricalGraph(document);
  const snapshot = solve(
    graph,
    session.memory,
    session.timeStep,
    session.snapshot.time,
    true,
    true,
  );
  return { ...session, document, graph, snapshot, memory: memoryOf(snapshot), useEuler: true };
}

/** Geometry, names and document revisions do not identify an electrical state. */
export function electricalKey(document: CircuitDocument): string {
  return JSON.stringify({
    components: document.components
      .map((c) => ({
        id: c.id,
        kind: c.kind,
        value: c.value,
        initialValue: "initialValue" in c ? (c.initialValue ?? 0) : undefined,
      }))
      .sort((a, b) => a.id.localeCompare(b.id)),
    junctions: document.junctions.map((j) => j.id).sort(),
    wires: document.wires
      .map((w) => ({ id: w.id, from: w.from, to: w.to }))
      .sort((a, b) => a.id.localeCompare(b.id)),
    ground: document.ground,
  });
}
