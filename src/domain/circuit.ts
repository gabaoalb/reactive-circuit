export interface Point {
  x: number;
  y: number;
}
export type Component = {
  id: string;
  name: string;
  value: number;
  position: Point;
  rotation: number;
  /** Distance between terminals in canvas pixels. Symbol size stays fixed. */
  length?: number;
} & ({ kind: "resistor" } | { kind: "voltage" });
export type ConnectionPointRef =
  | { kind: "terminal"; componentId: string; port: "a" | "b" }
  | { kind: "junction"; id: string };
export interface Junction {
  id: string;
  position: Point;
}
export interface Wire {
  id: string;
  from: ConnectionPointRef;
  to: ConnectionPointRef;
  bends: Point[];
}
export interface CircuitDocument {
  components: Component[];
  junctions: Junction[];
  wires: Wire[];
  ground: ConnectionPointRef | null;
}
export const pointKey = (ref: ConnectionPointRef): string =>
  ref.kind === "junction" ? `j:${ref.id}` : `t:${ref.componentId}:${ref.port}`;
export const terminal = (componentId: string, port: "a" | "b"): ConnectionPointRef => ({
  kind: "terminal",
  componentId,
  port,
});
export const emptyCircuit = (): CircuitDocument => ({
  components: [],
  junctions: [],
  wires: [],
  ground: null,
});
export function exampleCircuit(): CircuitDocument {
  return {
    components: [
      {
        id: "v1",
        name: "V1",
        kind: "voltage",
        value: 10,
        position: { x: 180, y: 200 },
        rotation: 90,
      },
      {
        id: "r1",
        name: "R1",
        kind: "resistor",
        value: 1000,
        position: { x: 340, y: 160 },
        rotation: 0,
      },
      {
        id: "r2",
        name: "R2",
        kind: "resistor",
        value: 1000,
        position: { x: 500, y: 200 },
        rotation: 90,
      },
    ],
    junctions: [],
    ground: terminal("v1", "b"),
    wires: [
      { id: "w1", from: terminal("v1", "a"), to: terminal("r1", "a"), bends: [] },
      { id: "w2", from: terminal("r1", "b"), to: terminal("r2", "a"), bends: [] },
      { id: "w3", from: terminal("r2", "b"), to: terminal("v1", "b"), bends: [] },
    ],
  };
}
