export interface Point {
  x: number;
  y: number;
}
export type Component = {
  id: string;
  name: string;
  position: Point;
  rotation: number;
  /** Distance between terminals in canvas pixels. Symbol size stays fixed. */
  length?: number;
} & (
  | { kind: "resistor" | "voltage"; value: number }
  | { kind: "capacitor" | "inductor"; value: number; initialValue?: number }
  | { kind: "switch"; closed: boolean; value?: never }
);
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

/** Same topology and saved electrical state as Falstad's lrc.txt. */
export function rlcCircuit(): CircuitDocument {
  const junction = (id: string): ConnectionPointRef => ({ kind: "junction", id });
  const connections: [string, string, string][] = [
    ["r1", "left", "top"],
    ["s1", "top", "positive"],
    ["l1", "top", "bottom"],
    ["c1", "bottom", "left"],
    ["r2", "bottom", "negative"],
    ["v1", "positive", "negative"],
  ];
  return {
    components: [
      {
        id: "r1",
        name: "R1",
        kind: "resistor",
        value: 10,
        position: { x: 240, y: 100 },
        rotation: 0,
        length: 160,
      },
      {
        id: "s1",
        name: "S1",
        kind: "switch",
        closed: false,
        position: { x: 420, y: 100 },
        rotation: 0,
        length: 120,
      },
      {
        id: "l1",
        name: "L1",
        kind: "inductor",
        value: 1,
        initialValue: 0.03,
        position: { x: 340, y: 240 },
        rotation: 90,
        length: 240,
      },
      {
        id: "c1",
        name: "C1",
        kind: "capacitor",
        value: 15e-6,
        initialValue: -9.86,
        position: { x: 240, y: 380 },
        rotation: 180,
        length: 160,
      },
      {
        id: "r2",
        name: "R2",
        kind: "resistor",
        value: 100,
        position: { x: 420, y: 380 },
        rotation: 0,
        length: 120,
      },
      {
        id: "v1",
        name: "V1",
        kind: "voltage",
        value: 5,
        position: { x: 500, y: 240 },
        rotation: 90,
        length: 240,
      },
    ],
    junctions: [
      { id: "left", position: { x: 140, y: 380 } },
      { id: "top", position: { x: 340, y: 100 } },
      { id: "bottom", position: { x: 340, y: 380 } },
      { id: "positive", position: { x: 500, y: 100 } },
      { id: "negative", position: { x: 500, y: 380 } },
    ],
    wires: connections.flatMap(([id, a, b]) => [
      { id: `${id}-a`, from: terminal(id, "a"), to: junction(a), bends: [] },
      { id: `${id}-b`, from: terminal(id, "b"), to: junction(b), bends: [] },
    ]),
    ground: junction("left"),
  };
}

export const componentUnit = (component: Component): string =>
  ({ resistor: "Ω", voltage: "V", capacitor: "F", inductor: "H", switch: "" })[component.kind];

export function formatPhysical(value: number, unit: string, locale?: string): string {
  const absolute = Math.abs(value);
  if (absolute > 0 && (absolute < 1e-12 || absolute >= 1e9))
    return `${new Intl.NumberFormat(locale, { maximumSignificantDigits: 6, notation: "scientific" }).format(value)} ${unit}`;
  const [scale, prefix]: [number, string] =
    absolute === 0
      ? [1, ""]
      : absolute < 1e-9
        ? [1e-12, "p"]
        : absolute < 1e-6
          ? [1e-9, "n"]
          : absolute < 1e-3
            ? [1e-6, "µ"]
            : absolute < 1
              ? [1e-3, "m"]
              : absolute >= 1e6
                ? [1e6, "M"]
                : absolute >= 1e3
                  ? [1e3, "k"]
                  : [1, ""];
  return `${new Intl.NumberFormat(locale, { maximumSignificantDigits: 6 }).format(value / scale)} ${prefix}${unit}`;
}
