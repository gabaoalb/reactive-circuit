import { pointKey, terminal } from "../domain/circuit";
import type { CircuitDocument, Component } from "../domain/circuit";
export interface Diagnostic {
  code: string;
  message: string;
  elementIds: string[];
}
export class CircuitError extends Error {
  diagnostic: Diagnostic;
  constructor(code: string, message: string, elementIds: string[] = []) {
    super(message);
    this.diagnostic = { code, message, elementIds };
  }
}
export interface Branch {
  component: Component;
  a: number;
  b: number;
}
export interface ElectricalGraph {
  nodes: number[];
  pointNodes: Record<string, number>;
  branches: Branch[];
}
export function buildElectricalGraph(doc: CircuitDocument): ElectricalGraph {
  if (!doc.components.length) throw new CircuitError("empty", "Adicione pelo menos um componente.");
  const ids = new Set<string>();
  for (const item of [...doc.components, ...doc.junctions, ...doc.wires]) {
    if (!item.id || ids.has(item.id))
      throw new CircuitError("id", "Identificador ausente ou duplicado.", [item.id]);
    ids.add(item.id);
  }
  const keys = [
    ...doc.components.flatMap((c) => [
      pointKey(terminal(c.id, "a")),
      pointKey(terminal(c.id, "b")),
    ]),
    ...doc.junctions.map((j) => pointKey({ kind: "junction", id: j.id })),
  ].sort();
  const parent = new Map(keys.map((k) => [k, k]));
  function find(k: string): string {
    const p = parent.get(k);
    if (p === undefined)
      throw new CircuitError(
        "reference",
        "Conexão aponta para um terminal ou junção inexistente.",
        [k],
      );
    if (p === k) return k;
    const root = find(p);
    parent.set(k, root);
    return root;
  }
  for (const c of doc.components) {
    if (!Number.isFinite(c.value) || (c.kind === "resistor" && c.value <= 0))
      throw new CircuitError(
        "value",
        `${c.name}: informe ${c.kind === "resistor" ? "resistência positiva" : "tensão"} finita.`,
        [c.id],
      );
  }
  for (const wire of doc.wires) {
    const a = find(pointKey(wire.from)),
      b = find(pointKey(wire.to));
    parent.set(a < b ? b : a, a < b ? a : b);
  }
  if (!doc.ground)
    throw new CircuitError("ground", "Marque um terminal ou junção como terra (0 V).");
  const ground = find(pointKey(doc.ground));
  const active = new Set(
    doc.components.flatMap((c) => [
      find(pointKey(terminal(c.id, "a"))),
      find(pointKey(terminal(c.id, "b"))),
    ]),
  );
  if (!active.has(ground))
    throw new CircuitError("ground", "O terra deve estar conectado a um componente.");
  const roots = [ground, ...[...active].filter((k) => k !== ground).sort()];
  const pointNodes: Record<string, number> = {};
  for (const key of keys) {
    const index = roots.indexOf(find(key));
    if (index >= 0) pointNodes[key] = index;
  }
  const branches = [...doc.components]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((component) => ({
      component,
      a: pointNodes[pointKey(terminal(component.id, "a"))],
      b: pointNodes[pointKey(terminal(component.id, "b"))],
    }));
  const reached = new Set([0]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const { a, b } of branches)
      if (reached.has(a) || reached.has(b)) {
        if (!reached.has(a) || !reached.has(b)) changed = true;
        reached.add(a);
        reached.add(b);
      }
  }
  const floating = branches.filter((b) => !reached.has(b.a) || !reached.has(b.b));
  if (floating.length)
    throw new CircuitError(
      "floating",
      "Há um subcircuito sem ligação ao terra.",
      floating.map((b) => b.component.id),
    );
  return { nodes: roots.map((_, i) => i), pointNodes, branches };
}
