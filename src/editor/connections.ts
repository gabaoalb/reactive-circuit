import { pointKey, terminal } from "../domain/circuit";
import type { CircuitDocument, Component, ConnectionPointRef, Junction } from "../domain/circuit";
import { connectionPosition, GRID, terminalPosition } from "./geometry";

/** Materialize a drop contact using stable endpoint IDs. The solver never infers wiring from pixels. */
export function connectOverlappingPoints(
  doc: CircuitDocument,
  moved: readonly ConnectionPointRef[],
): CircuitDocument {
  const refs: ConnectionPointRef[] = [
    ...doc.components.flatMap((c) => [terminal(c.id, "a"), terminal(c.id, "b")]),
    ...doc.junctions.map((j) => ({ kind: "junction" as const, id: j.id })),
  ];
  const parent = new Map(refs.map((ref) => [pointKey(ref), pointKey(ref)]));
  const find = (key: string): string => {
    const next = parent.get(key);
    if (!next || next === key) return key;
    const root = find(next);
    parent.set(key, root);
    return root;
  };
  const join = (a: ConnectionPointRef, b: ConnectionPointRef) =>
    parent.set(find(pointKey(a)), find(pointKey(b)));
  for (const wire of doc.wires) join(wire.from, wire.to);
  const wires = [...doc.wires];
  const ids = new Set([...doc.components, ...doc.junctions, ...doc.wires].map((item) => item.id));
  for (const from of moved) {
    const position = connectionPosition(doc, from);
    if (
      !position ||
      !Number.isFinite(position.x) ||
      !Number.isFinite(position.y) ||
      position.x % GRID !== 0 ||
      position.y % GRID !== 0
    )
      continue;
    for (const to of refs) {
      if (from.kind === "junction" && to.kind === "junction") continue;
      const other = connectionPosition(doc, to);
      if (
        !other ||
        other.x !== position.x ||
        other.y !== position.y ||
        find(pointKey(from)) === find(pointKey(to))
      )
        continue;
      let suffix = 1;
      const prefix = `contact-${pointKey(from)}`;
      let id = `${prefix}-${suffix}`;
      while (ids.has(id)) id = `${prefix}-${++suffix}`;
      ids.add(id);
      wires.push({ id, from, to, bends: [] });
      join(from, to);
    }
  }
  return wires.length === doc.wires.length ? doc : { ...doc, wires };
}

/** Leave the existing network at its original coordinates when lifting out a component. */
export function detachComponent(
  doc: CircuitDocument,
  component: Component,
  ports: readonly ("a" | "b")[] = ["a", "b"],
): CircuitDocument {
  const replacements = new Map<string, ConnectionPointRef>();
  const junctions: Junction[] = [];
  const ids = new Set([...doc.components, ...doc.junctions, ...doc.wires].map((item) => item.id));
  for (const port of ports) {
    const key = pointKey(terminal(component.id, port));
    const referenced =
      doc.wires.some((w) => pointKey(w.from) === key || pointKey(w.to) === key) ||
      (doc.ground && pointKey(doc.ground) === key);
    if (!referenced) continue;
    let suffix = 1;
    let id = `detached-${component.id}-${port}-${suffix}`;
    while (ids.has(id)) id = `detached-${component.id}-${port}-${++suffix}`;
    ids.add(id);
    replacements.set(key, { kind: "junction", id });
    junctions.push({ id, position: terminalPosition(component, port) });
  }
  if (!junctions.length) return doc;
  const replace = (ref: ConnectionPointRef) => replacements.get(pointKey(ref)) ?? ref;
  return {
    ...doc,
    junctions: [...doc.junctions, ...junctions],
    wires: doc.wires.map((w) => ({ ...w, from: replace(w.from), to: replace(w.to) })),
    ground: doc.ground ? replace(doc.ground) : null,
  };
}
