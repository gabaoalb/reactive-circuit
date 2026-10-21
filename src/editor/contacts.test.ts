import { describe, expect, it } from "vitest";
import { emptyCircuit, pointKey, terminal } from "../domain/circuit";
import type { Component } from "../domain/circuit";
import { simulateDc } from "../simulation/mna";
import { initializeTransient } from "../simulation/transient";
import { buildElectricalGraph } from "../simulation/graph";
import { connectOverlappingPoints } from "./connections";
import { terminalPosition } from "./geometry";
import { editorReducer, initialState } from "./state";
import type { EditorState } from "./state";

const component = (id: string, x: number, y: number, rotation = 0): Component => ({
  id,
  name: id,
  kind: id === "v" ? "voltage" : "resistor",
  value: id === "v" ? 5 : 1000,
  position: { x, y },
  rotation,
});
function setup(): EditorState {
  return {
    ...initialState(),
    document: {
      ...emptyCircuit(),
      components: [component("v", 160, 160), component("r", 160, 320)],
      ground: terminal("v", "b"),
    },
  };
}
function drop(state: ReturnType<typeof setup>, x = 160, y = 160) {
  state = editorReducer(state, {
    type: "move",
    selection: { kind: "component", id: "r" },
    position: { x, y },
  });
  return editorReducer(state, {
    type: "connect-overlaps",
    refs: [terminal("r", "a"), terminal("r", "b")],
  });
}
function expectLoad(state: ReturnType<typeof setup>) {
  const dc = simulateDc(state.document);
  expect(dc.ok).toBe(true);
  if (!dc.ok) return;
  expect(dc.components.find((c) => c.id === "r")?.current).toBeCloseTo(0.005, 12);
  expect(
    initializeTransient(state.document).snapshot.components.find((c) => c.id === "r")?.current,
  ).toBeCloseTo(0.005, 12);
}

describe("direct grid contacts", () => {
  it("connects both terminals on body drop and solves DC and transient without manual wires", () => {
    const state = drop(setup());
    expect(state.document.wires).toHaveLength(2);
    expectLoad(state);
    const graph = buildElectricalGraph(state.document);
    expect(graph.pointNodes[pointKey(terminal("r", "a"))]).toBe(
      graph.pointNodes[pointKey(terminal("v", "a"))],
    );
  });
  it("connects only the dropped terminal, keeping its opposite end fixed", () => {
    let state = setup();
    state.document.wires.push({
      id: "return",
      from: terminal("v", "b"),
      to: terminal("r", "b"),
      bends: [],
    });
    const fixed = terminalPosition(state.document.components[1], "b");
    state = editorReducer(state, {
      type: "move-terminal",
      componentId: "r",
      port: "a",
      position: { x: 120, y: 160 },
    });
    expect(state.document.wires).toHaveLength(1);
    state = editorReducer(state, { type: "connect-overlaps", refs: [terminal("r", "a")] });
    expect(state.document.wires).toHaveLength(2);
    expect(terminalPosition(state.document.components[1], "b")).toEqual(fixed);
    expectLoad(state);
  });
  it("connects on insertion and rotation, with no duplicate contacts on repeated drops", () => {
    let state = setup();
    state.document.components = [component("v", 160, 160, 90)];
    state = editorReducer(state, { type: "add-component", component: component("r", 160, 160) });
    expect(state.document.wires).toHaveLength(0);
    state = editorReducer(state, { type: "rotate" });
    expectLoad(state);
    const again = editorReducer(state, {
      type: "connect-overlaps",
      refs: [terminal("r", "a"), terminal("r", "b")],
    });
    expect(again).toBe(state);
    const inserted = editorReducer(setup(), {
      type: "add-component",
      component: component("r2", 160, 160),
    });
    expect(inserted.document.wires).toHaveLength(2);
  });
  it("joins three endpoints transitively without creating redundant links", () => {
    const doc = {
      ...emptyCircuit(),
      components: [
        component("v", 160, 160),
        component("r", 240, 160),
        component("r2", 200, 200, 90),
      ],
    };
    const connected = connectOverlappingPoints(doc, [terminal("r", "a"), terminal("r2", "a")]);
    expect(connected.wires).toHaveLength(2);
    expect(connectOverlappingPoints(connected, [terminal("v", "b")])).toBe(connected);
  });
  it("connects a dropped terminal to an explicit junction", () => {
    const doc = {
      ...emptyCircuit(),
      components: [component("r", 160, 160)],
      junctions: [{ id: "j", position: { x: 120, y: 160 } }],
      ground: { kind: "junction" as const, id: "j" },
    };
    const connected = connectOverlappingPoints(doc, [terminal("r", "a")]);
    expect(connected.wires).toHaveLength(1);
    expect(simulateDc(connected)).toMatchObject({ ok: true });
  });
  it("keeps remaining coincident endpoints joined when the middle component is deleted", () => {
    let state = drop(setup());
    state = editorReducer(state, { type: "add-component", component: component("r2", 160, 160) });
    state.document.ground = terminal("r", "b");
    state = editorReducer(state, { type: "select", selection: { kind: "component", id: "v" } });
    state = editorReducer(state, { type: "delete" });
    const graph = buildElectricalGraph(state.document);
    expect(graph.pointNodes[pointKey(terminal("r2", "a"))]).toBe(
      graph.pointNodes[pointKey(terminal("r", "a"))],
    );
    expect(simulateDc(state.document)).toMatchObject({ ok: true });
  });
  it("does not connect nearby points, wire crossings, off-grid endpoints or points passed during dragging", () => {
    let state = setup();
    state = editorReducer(state, {
      type: "move",
      selection: { kind: "component", id: "r" },
      position: { x: 160, y: 160 },
    });
    expect(state.document.wires).toHaveLength(0);
    state = drop(state, 160, 180);
    expect(state.document.wires).toHaveLength(0);
    state.document.components = [component("v", 161, 160), component("r", 161, 160)];
    expect(connectOverlappingPoints(state.document, [terminal("r", "a")])).toBe(state.document);
    state.document.components = [component("v", 160, 160), component("r", 240, 160, 90)];
    state.document.wires = [
      {
        id: "crossing",
        from: terminal("v", "a"),
        to: terminal("v", "b"),
        bends: [{ x: 240, y: 120 }],
      },
    ];
    expect(connectOverlappingPoints(state.document, [terminal("r", "a")])).toBe(state.document);
  });
  it("preserves direct connections by ID when moving away with Keep connections", () => {
    const state = drop(drop(setup()), 160, 240);
    expect(state.document.wires).toHaveLength(2);
    expectLoad(state);
  });
  it("leaves the old network and ground behind when detaching only one endpoint", () => {
    let state = drop(setup());
    state.document.ground = terminal("r", "a");
    state = editorReducer(state, { type: "move-connections", value: "detach" });
    state = editorReducer(state, {
      type: "move-terminal",
      componentId: "r",
      port: "a",
      position: { x: 120, y: 240 },
    });
    state = editorReducer(state, { type: "connect-overlaps", refs: [terminal("r", "a")] });
    expect(state.document.ground).toMatchObject({ kind: "junction" });
    const graph = buildElectricalGraph(state.document);
    expect(graph.pointNodes[pointKey(terminal("r", "a"))]).not.toBe(
      graph.pointNodes[pointKey(terminal("v", "a"))],
    );
    expect(graph.pointNodes[pointKey(terminal("r", "b"))]).toBe(
      graph.pointNodes[pointKey(terminal("v", "b"))],
    );
    expect(state.document.junctions[0].position).toEqual({ x: 120, y: 160 });
  });
});
