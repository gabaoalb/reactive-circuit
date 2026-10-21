import { pointKey, terminal } from "../domain/circuit";
import type { CircuitDocument, Component, ConnectionPointRef, Junction } from "../domain/circuit";
import { terminalPosition } from "./geometry";

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
