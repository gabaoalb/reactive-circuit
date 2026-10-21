import type {
  CircuitDocument,
  Component,
  ConnectionPointRef,
  Point,
  Wire,
} from "../domain/circuit";
export const GRID = 20;
export const snap = (p: Point): Point => ({
  x: Math.round(p.x / GRID) * GRID,
  y: Math.round(p.y / GRID) * GRID,
});
export function terminalPosition(c: Component, port: "a" | "b"): Point {
  const offset = port === "a" ? -40 : 40;
  const angle = (c.rotation * Math.PI) / 180;
  return {
    x: c.position.x + Math.round(Math.cos(angle) * offset),
    y: c.position.y + Math.round(Math.sin(angle) * offset),
  };
}
export function connectionPosition(doc: CircuitDocument, ref: ConnectionPointRef): Point | null {
  if (ref.kind === "junction") return doc.junctions.find((j) => j.id === ref.id)?.position ?? null;
  const component = doc.components.find((c) => c.id === ref.componentId);
  return component ? terminalPosition(component, ref.port) : null;
}
export function orthogonalPath(anchors: Point[]): number[] {
  if (!anchors.length) return [];
  const points = [anchors[0].x, anchors[0].y];
  for (let i = 1; i < anchors.length; i++) {
    const previous = anchors[i - 1],
      next = anchors[i];
    if (previous.x !== next.x && previous.y !== next.y) points.push(next.x, previous.y);
    points.push(next.x, next.y);
  }
  return points;
}
export function wirePath(doc: CircuitDocument, wire: Wire): number[] {
  const start = connectionPosition(doc, wire.from),
    end = connectionPosition(doc, wire.to);
  return start && end ? orthogonalPath([start, ...wire.bends, end]) : [];
}
