import { describe, expect, it } from "vitest";
import { exampleCircuit, pointKey, terminal } from "../domain/circuit";
import type { CircuitDocument, Component } from "../domain/circuit";
import { buildElectricalGraph } from "./graph";
import { simulateDc } from "./mna";
import { solveLinearSystem } from "./solver";

function circuit(elements: [string, Component["kind"], number, string, string][]): CircuitDocument {
  const names = [...new Set(elements.flatMap((e) => [e[3], e[4]]))];
  const doc: CircuitDocument = {
    components: [],
    junctions: names.map((id) => ({ id, position: { x: 0, y: 0 } })),
    wires: [],
    ground: { kind: "junction", id: "0" },
  };
  for (const [id, kind, value, a, b] of elements) {
    doc.components.push({ id, name: id, kind, value, position: { x: 0, y: 0 }, rotation: 0 });
    doc.wires.push(
      { id: `${id}-a`, from: terminal(id, "a"), to: { kind: "junction", id: a }, bends: [] },
      { id: `${id}-b`, from: terminal(id, "b"), to: { kind: "junction", id: b }, bends: [] },
    );
  }
  return doc;
}
function success(doc: CircuitDocument) {
  const result = simulateDc(doc);
  if (!result.ok) throw new Error(result.diagnostic.message);
  return result;
}
function code(doc: CircuitDocument) {
  const result = simulateDc(doc);
  if (result.ok) throw new Error("Expected failure");
  return result.diagnostic.code;
}
describe("DC analysis", () => {
  it("solves a 10 V source with a 1 kΩ load and passive current signs", () => {
    const result = success(
      circuit([
        ["V1", "voltage", 10, "1", "0"],
        ["R1", "resistor", 1000, "1", "0"],
      ]),
    );
    expect(result.components.find((c) => c.id === "R1")?.current).toBeCloseTo(0.01, 12);
    expect(result.components.find((c) => c.id === "V1")?.current).toBeCloseTo(-0.01, 12);
    expect(result.residual).toBeLessThan(1e-9);
  });
  it("solves the example divider at 5 V and exposes labeled MNA equations", () => {
    const result = success(exampleCircuit());
    const middle = result.graph.pointNodes[pointKey(terminal("r1", "b"))];
    expect(result.voltages[middle]).toBeCloseTo(5, 12);
    expect(result.system.unknowns).toContain("I(V1)");
    expect(result.system.A).toHaveLength(3);
  });
  it("solves parallel resistors", () => {
    const result = success(
      circuit([
        ["V", "voltage", 10, "1", "0"],
        ["R1", "resistor", 1000, "1", "0"],
        ["R2", "resistor", 2000, "1", "0"],
      ]),
    );
    expect(result.components.find((c) => c.id === "V")?.current).toBeCloseTo(-0.015, 12);
  });
  it("solves a voltage source between two non-ground nodes", () => {
    const result = success(
      circuit([
        ["V", "voltage", 10, "1", "2"],
        ["R1", "resistor", 1000, "1", "0"],
        ["R2", "resistor", 1000, "2", "0"],
      ]),
    );
    expect(result.components.find((c) => c.id === "R1")?.voltage).toBeCloseTo(5, 12);
    expect(result.components.find((c) => c.id === "R2")?.voltage).toBeCloseTo(-5, 12);
  });
  it.each([0, -10])("accepts a finite source voltage of %s V", (value) => {
    const result = success(
      circuit([
        ["V", "voltage", value, "1", "0"],
        ["R", "resistor", 1000, "1", "0"],
      ]),
    );
    expect(result.components.find((c) => c.id === "R")?.voltage).toBeCloseTo(value, 12);
  });
  it("gives zero current in a shorted resistor", () => {
    const result = success(
      circuit([
        ["V", "voltage", 10, "1", "0"],
        ["R", "resistor", 1000, "0", "0"],
      ]),
    );
    expect(result.components.find((c) => c.id === "R")?.current).toBe(0);
  });
  it("rejects missing ground and empty circuits", () => {
    expect(code({ ...exampleCircuit(), ground: null })).toBe("ground");
    expect(code({ ...exampleCircuit(), components: [] })).toBe("empty");
  });
  it.each([0, -1, NaN, Infinity])("rejects invalid resistance %s", (value) => {
    const doc = exampleCircuit();
    doc.components[1].value = value;
    expect(code(doc)).toBe("value");
  });
  it("rejects a disconnected island", () => {
    const doc = circuit([
      ["V", "voltage", 10, "1", "0"],
      ["R", "resistor", 1000, "2", "3"],
    ]);
    expect(code(doc)).toBe("floating");
  });
  it("rejects dangling references and duplicate IDs", () => {
    const doc = exampleCircuit();
    doc.wires[0].to = terminal("missing", "a");
    expect(code(doc)).toBe("reference");
    expect(code({ ...exampleCircuit(), junctions: [{ id: "r1", position: { x: 0, y: 0 } }] })).toBe(
      "id",
    );
  });
  it("classifies contradictory sources and shorted voltage sources", () => {
    expect(
      code(
        circuit([
          ["V1", "voltage", 10, "1", "0"],
          ["V2", "voltage", 5, "1", "0"],
        ]),
      ),
    ).toBe("inconsistent");
    expect(code(circuit([["V", "voltage", 10, "0", "0"]]))).toBe("inconsistent");
  });
  it("classifies redundant sources as non-unique", () => {
    expect(
      code(
        circuit([
          ["V1", "voltage", 10, "1", "0"],
          ["V2", "voltage", 10, "1", "0"],
        ]),
      ),
    ).toBe("singular");
    expect(code(circuit([["V", "voltage", 0, "0", "0"]]))).toBe("singular");
  });
});
describe("electrical graph", () => {
  it("contracts wires transitively through explicit junctions", () => {
    const doc = exampleCircuit();
    doc.junctions.push({ id: "j", position: { x: 0, y: 0 } });
    const to = doc.wires[0].to;
    doc.wires[0].to = { kind: "junction", id: "j" };
    doc.wires.push({ id: "extra", from: { kind: "junction", id: "j" }, to, bends: [] });
    const graph = buildElectricalGraph(doc);
    expect(graph.pointNodes[pointKey(terminal("v1", "a"))]).toBe(graph.pointNodes[pointKey(to)]);
    expect(graph.nodes).toHaveLength(3);
  });
  it("ignores geometry and isolated junctions, preserving deterministic numbering", () => {
    const doc = exampleCircuit(),
      before = buildElectricalGraph(doc);
    doc.components.forEach((c) => {
      c.position = { x: 0, y: 0 };
      c.rotation = 270;
    });
    doc.wires.forEach((w) => {
      w.bends = [{ x: 0, y: 0 }];
    });
    doc.junctions.push({ id: "unused", position: { x: 0, y: 0 } });
    doc.components.reverse();
    doc.wires.reverse();
    expect(buildElectricalGraph(doc)).toEqual({
      ...before,
      branches: before.branches.map((b) => ({
        ...b,
        component: doc.components.find((c) => c.id === b.component.id)!,
      })),
    });
    expect(buildElectricalGraph(doc).pointNodes["j:unused"]).toBeUndefined();
  });
});
describe("linear solver", () => {
  it("pivots rows without mutating inputs", () => {
    const A = [
        [0, 2],
        [1, 3],
      ],
      b = [4, 7];
    const { x } = solveLinearSystem(A, b);
    expect(x[0]).toBeCloseTo(1, 12);
    expect(x[1]).toBeCloseTo(2, 12);
    expect(A).toEqual([
      [0, 2],
      [1, 3],
    ]);
    expect(b).toEqual([4, 7]);
  });
  it("uses relative row scaling", () => {
    expect(
      solveLinearSystem(
        [
          [1e-15, 0],
          [0, 1e15],
        ],
        [2e-15, 3e15],
      ).x,
    ).toEqual([2, 3]);
  });
  it("rejects singular, incompatible and non-finite matrices", () => {
    expect(() =>
      solveLinearSystem(
        [
          [1, 1],
          [2, 2],
        ],
        [1, 2],
      ),
    ).toThrow("solução única");
    expect(() =>
      solveLinearSystem(
        [
          [1, 1],
          [2, 2],
        ],
        [1, 3],
      ),
    ).toThrow("incompatíveis");
    expect(() => solveLinearSystem([[Infinity]], [1])).toThrow("inválido");
  });
});
