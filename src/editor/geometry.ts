import type {
  CircuitDocument,
  Component,
  ConnectionPointRef,
  Point,
  Wire,
} from "../domain/circuit";
export const GRID = 20;
export const MIN_COMPONENT_LENGTH = 80;
export const componentLength = (c: Component): number => c.length ?? MIN_COMPONENT_LENGTH;
export const snap = (p: Point): Point => ({
  x: Math.round(p.x / GRID) * GRID,
  y: Math.round(p.y / GRID) * GRID,
});
export function terminalPosition(c: Component, port: "a" | "b"): Point {
  const offset = ((port === "a" ? -1 : 1) * componentLength(c)) / 2;
  const angle = (c.rotation * Math.PI) / 180;
  return {
    x: c.position.x + Math.round(Math.cos(angle) * offset),
    y: c.position.y + Math.round(Math.sin(angle) * offset),
  };
}
/** Resize about the opposite terminal. Reject positions that would overlap the symbol. */
export function resizeComponent(c: Component, port: "a" | "b", desired: Point): Component {
  const fixed = terminalPosition(c, port === "a" ? "b" : "a");
  const moved = snap(desired);
  const a = port === "a" ? moved : fixed;
  const b = port === "b" ? moved : fixed;
  const length = Math.hypot(b.x - a.x, b.y - a.y);
  if (length < MIN_COMPONENT_LENGTH || !Number.isFinite(length)) return c;
  if (moved.x === terminalPosition(c, port).x && moved.y === terminalPosition(c, port).y) return c;
  return {
    ...c,
    position: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
    length,
    rotation: ((Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI + 360) % 360,
  };
}
/** Snap the translation rather than the midpoint, preserving endpoint offsets. */
export function componentDragPosition(c: Component, desired: Point): Point {
  const delta = snap({ x: desired.x - c.position.x, y: desired.y - c.position.y });
  const a = terminalPosition(c, "a"),
    b = terminalPosition(c, "b");
  return {
    x: c.position.x + Math.max(delta.x, Math.ceil((GRID - Math.min(a.x, b.x)) / GRID) * GRID),
    y: c.position.y + Math.max(delta.y, Math.ceil((GRID - Math.min(a.y, b.y)) / GRID) * GRID),
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
