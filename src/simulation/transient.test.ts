import { describe, expect, it } from "vitest";
import { exampleCircuit, formatPhysical, rlcCircuit, terminal } from "../domain/circuit";
import type { CircuitDocument, Component } from "../domain/circuit";
import { simulateDc } from "./mna";
import { electricalKey, initializeTransient, setTransientSwitch, stepTransient } from "./transient";
import type { TransientSession } from "./transient";

function circuit(elements: { component: Component; a: string; b: string }[]): CircuitDocument {
  const ids = [...new Set(elements.flatMap((e) => [e.a, e.b]))];
  return {
    components: elements.map((e) => e.component),
    junctions: ids.map((id) => ({ id, position: { x: 0, y: 0 } })),
    wires: elements.flatMap(({ component: c, a, b }) => [
      {
        id: `${c.id}-a`,
        from: terminal(c.id, "a"),
        to: { kind: "junction" as const, id: a },
        bends: [],
      },
      {
        id: `${c.id}-b`,
        from: terminal(c.id, "b"),
        to: { kind: "junction" as const, id: b },
        bends: [],
      },
    ]),
    ground: { kind: "junction", id: "0" },
  };
}
const base = (id: string) => ({ id, name: id, position: { x: 0, y: 0 }, rotation: 0 });
function advance(session: TransientSession, steps: number) {
  for (let i = 0; i < steps; i++) session = stepTransient(session);
  return session;
}
function result(session: TransientSession, id: string) {
  return session.snapshot.components.find((c) => c.id === id)!;
}
function series(reactive: Component): CircuitDocument {
  return circuit([
    { component: { ...base("v"), kind: "voltage", value: 5 }, a: "1", b: "0" },
    { component: { ...base("r"), kind: "resistor", value: 100 }, a: "1", b: "2" },
    { component: reactive, a: "2", b: "0" },
  ]);
}

describe("transient analysis", () => {
  it("matches the analytical RC charge within 0.1%, including initial current", () => {
    const doc = series({ ...base("c"), kind: "capacitor", value: 1e-3, initialValue: 0 });
    let session = initializeTransient(doc, 1e-4);
    expect(result(session, "c").voltage).toBeCloseTo(0, 12);
    expect(result(session, "c").current).toBeCloseTo(0.05, 12);
    session = advance(session, 1000);
    expect(Math.abs(result(session, "c").voltage / (5 * (1 - Math.exp(-1))) - 1)).toBeLessThan(
      0.001,
    );
    expect(session.snapshot.residual).toBeLessThan(1e-9);
  });
  it("matches the analytical RL current within 0.1%", () => {
    let session = initializeTransient(series({ ...base("l"), kind: "inductor", value: 1 }), 1e-5);
    expect(result(session, "l").current).toBe(0);
    expect(result(session, "l").voltage).toBeCloseTo(5, 12);
    session = advance(session, 1000);
    expect(Math.abs(result(session, "l").current / (0.05 * (1 - Math.exp(-1))) - 1)).toBeLessThan(
      0.001,
    );
  });
  it("reproduces ten damped RLC periods and amplitudes", () => {
    let session = initializeTransient(rlcCircuit());
    expect(result(session, "c1").voltage).toBeCloseTo(-9.86, 12);
    expect(result(session, "l1").current).toBeCloseTo(0.03, 12);
    const w = Math.sqrt(1 / 15e-6 - 25);
    const period = (2 * Math.PI) / w;
    expect(period).toBeCloseTo(0.02434, 5);
    let maxAmplitudeError = 0;
    const crossings: number[] = [];
    let lastV = result(session, "c1").voltage;
    let lastT = 0;
    const steps = Math.ceil((10 * period) / session.timeStep);
    for (let i = 0; i < steps; i++) {
      session = stepTransient(session);
      const t = session.snapshot.time;
      const v = result(session, "c1").voltage;
      const expected =
        Math.exp(-5 * t) * (-9.86 * Math.cos(w * t) + ((2000 - 49.3) / w) * Math.sin(w * t));
      maxAmplitudeError = Math.max(
        maxAmplitudeError,
        Math.abs(v - expected) / (10 * Math.exp(-5 * t)),
      );
      if (lastV < 0 && v >= 0) crossings.push(lastT + ((t - lastT) * -lastV) / (v - lastV));
      expect(result(session, "s1").current).toBe(0);
      lastV = v;
      lastT = t;
    }
    expect(maxAmplitudeError).toBeLessThan(0.005);
    expect(crossings.length).toBe(10);
    for (let i = 1; i < crossings.length; i++)
      expect(Math.abs((crossings[i] - crossings[i - 1]) / period - 1)).toBeLessThan(0.001);
  });
  it("preserves stored energy on both switch transitions and reaches the closed DC limit", () => {
    let session = advance(initializeTransient(rlcCircuit()), 1200);
    for (const closed of [true, false, true]) {
      const previous = session;
      session = setTransientSwitch(session, "s1", closed);
      expect(session.snapshot.time).toBe(previous.snapshot.time);
      expect(result(session, "c1").voltage).toBeCloseTo(result(previous, "c1").voltage, 10);
      expect(result(session, "l1").current).toBeCloseTo(result(previous, "l1").current, 10);
      expect(session.useEuler).toBe(true);
      if (closed) expect(result(session, "s1").voltage).toBeCloseTo(0, 10);
      else expect(result(session, "s1").current).toBe(0);
      session = stepTransient(session);
      expect(session.useEuler).toBe(false);
    }
    session = advance(session, 50000);
    expect(Math.abs(result(session, "c1").voltage)).toBeLessThan(1e-4);
    expect(result(session, "l1").current).toBeCloseTo(0.05, 6);
  });
  it("preserves energy in an ideal LC loop without artificial damping", () => {
    const doc = circuit([
      {
        component: { ...base("c"), kind: "capacitor", value: 1e-3, initialValue: 1 },
        a: "1",
        b: "0",
      },
      { component: { ...base("l"), kind: "inductor", value: 1 }, a: "1", b: "0" },
    ]);
    const session = advance(initializeTransient(doc, 1e-4), 2000);
    const energy =
      0.5e-3 * result(session, "c").voltage ** 2 + 0.5 * result(session, "l").current ** 2;
    expect(Math.abs(energy / 0.0005 - 1)).toBeLessThan(1e-9);
  });
  it("restarts deterministically without mutating documents or old sessions", () => {
    const doc = rlcCircuit();
    const original = structuredClone(doc);
    const initial = initializeTransient(doc);
    const a = advance(initial, 100);
    const b = advance(initializeTransient(doc), 100);
    expect(a.snapshot).toEqual(b.snapshot);
    expect(initial.snapshot.time).toBe(0);
    setTransientSwitch(a, "s1", true);
    expect(doc).toEqual(original);
    expect(a.document.components.find((c) => c.id === "s1")).toMatchObject({ closed: false });
  });
  it("preserves DC solutions in the transient engine", () => {
    const dc = simulateDc(exampleCircuit());
    expect(dc.ok).toBe(true);
    if (!dc.ok) return;
    expect(stepTransient(initializeTransient(exampleCircuit())).snapshot.voltages).toEqual(
      dc.voltages,
    );
    expect(simulateDc(rlcCircuit())).toMatchObject({
      ok: false,
      diagnostic: { code: "dcUnsupported" },
    });
  });
  it.each([0, -1, Infinity, NaN])("rejects invalid time step %s", (dt) => {
    expect(() => initializeTransient(rlcCircuit(), dt)).toThrow();
  });
  it.each(["capacitor", "inductor"] as const)("rejects invalid %s parameters", (kind) => {
    for (const value of [0, -1, Infinity, NaN])
      expect(() => initializeTransient(series({ ...base("x"), kind, value }))).toThrow();
    expect(() =>
      initializeTransient(series({ ...base("x"), kind, value: 1, initialValue: Infinity })),
    ).toThrow();
  });
  it("rejects floating nodes through open switches and incompatible initial conditions", () => {
    const doc = circuit([
      { component: { ...base("r"), kind: "resistor", value: 100 }, a: "1", b: "0" },
      { component: { ...base("s"), kind: "switch", closed: false }, a: "1", b: "2" },
    ]);
    expect(() => initializeTransient(doc)).toThrow(/terra/);
    const incompatible = circuit([
      { component: { ...base("v"), kind: "voltage", value: 5 }, a: "1", b: "0" },
      {
        component: { ...base("c"), kind: "capacitor", value: 1e-3, initialValue: 0 },
        a: "1",
        b: "0",
      },
    ]);
    expect(() => initializeTransient(incompatible)).toThrow(/incompatíveis/);
    expect(() => setTransientSwitch(initializeTransient(rlcCircuit()), "missing", true)).toThrow();
  });
  it("distinguishes electrical edits from geometry and switch operation", () => {
    const doc = rlcCircuit(),
      original = electricalKey(doc);
    doc.components[0].position.x += 20;
    doc.components[0].rotation = 90;
    doc.wires[0].bends = [{ x: 5, y: 10 }];
    const s = doc.components.find((c) => c.kind === "switch")!;
    if (s.kind === "switch") s.closed = true;
    expect(electricalKey(doc)).toBe(original);
    doc.components[0].value = 20;
    expect(electricalKey(doc)).not.toBe(original);
  });
  it("does not commit a switch transition incompatible with stored capacitor voltage", () => {
    const doc = circuit([
      {
        component: { ...base("c"), kind: "capacitor", value: 1e-3, initialValue: 1 },
        a: "1",
        b: "0",
      },
      { component: { ...base("r"), kind: "resistor", value: 100 }, a: "1", b: "0" },
      { component: { ...base("s"), kind: "switch", closed: false }, a: "1", b: "0" },
    ]);
    const session = initializeTransient(doc);
    const before = structuredClone(session);
    expect(() => setTransientSwitch(session, "s", true)).toThrow(/incompatíveis/);
    expect(session).toEqual(before);
    expect(stepTransient(session).snapshot.time).toBe(5e-6);
  });
  it("formats physical quantities with engineering prefixes", () => {
    expect(formatPhysical(15e-6, "F", "en")).toBe("15 µF");
    expect(formatPhysical(0.05, "A", "en")).toBe("50 mA");
    expect(formatPhysical(0, "s", "en")).toBe("0 s");
  });
});
