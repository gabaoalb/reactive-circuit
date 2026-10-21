import { describe, expect, it } from "vitest";
import { pointKey, terminal } from "../domain/circuit";
import { buildElectricalGraph } from "../simulation/graph";
import { connectionPosition, orthogonalPath, snap, wirePath } from "./geometry";
import { editorReducer, initialState } from "./state";
describe("editor commands", () => {
  it("moves and rotates components without changing electrical connectivity", () => {
    let state = initialState();
    const graph = buildElectricalGraph(state.document);
    state = editorReducer(state, { type: "select", selection: { kind: "component", id: "r1" } });
    state = editorReducer(state, {
      type: "move",
      selection: { kind: "component", id: "r1" },
      position: { x: 260, y: 300 },
    });
    state = editorReducer(state, { type: "rotate" });
    expect(buildElectricalGraph(state.document).pointNodes).toEqual(graph.pointNodes);
    expect(connectionPosition(state.document, terminal("r1", "a"))).toEqual({ x: 260, y: 260 });
    expect(wirePath(state.document, state.document.wires[0]).slice(-2)).toEqual([260, 260]);
    expect(state.revision).toBe(2);
  });
  it("removes incident wires and ground when deleting a component", () => {
    let state = initialState();
    state = editorReducer(state, { type: "select", selection: { kind: "component", id: "v1" } });
    state = editorReducer(state, { type: "delete" });
    expect(state.document.ground).toBeNull();
    expect(state.document.wires).toHaveLength(1);
    expect(state.document.components.some((c) => c.id === "v1")).toBe(false);
  });
  it("creates explicit wires with bends, cancels drafts and replaces ground", () => {
    let state = initialState();
    state = editorReducer(state, { type: "tool", tool: "wire" });
    state = editorReducer(state, { type: "point", ref: terminal("r1", "a"), wireId: "unused" });
    state = editorReducer(state, { type: "bend", position: { x: 100, y: 100 } });
    state = editorReducer(state, { type: "point", ref: terminal("r2", "b"), wireId: "new-wire" });
    expect(state.document.wires.at(-1)?.bends).toEqual([{ x: 100, y: 100 }]);
    expect(state.draft).toBeNull();
    state = editorReducer(state, { type: "tool", tool: "ground" });
    state = editorReducer(state, { type: "point", ref: terminal("r1", "b"), wireId: "unused" });
    expect(state.document.ground && pointKey(state.document.ground)).toBe(
      pointKey(terminal("r1", "b")),
    );
    state = editorReducer(state, { type: "tool", tool: "wire" });
    state = editorReducer(state, { type: "point", ref: terminal("r1", "a"), wireId: "unused" });
    state = editorReducer(state, { type: "cancel" });
    expect(state.draft).toBeNull();
    expect(state.tool).toBe("select");
  });
  it("removes incident wires and reference when deleting a junction", () => {
    let state = initialState();
    state = editorReducer(state, { type: "add-junction", id: "j", position: { x: 100, y: 100 } });
    state = editorReducer(state, { type: "tool", tool: "wire" });
    state = editorReducer(state, { type: "point", ref: terminal("v1", "b"), wireId: "unused" });
    state = editorReducer(state, {
      type: "point",
      ref: { kind: "junction", id: "j" },
      wireId: "wj",
    });
    state = editorReducer(state, { type: "tool", tool: "ground" });
    state = editorReducer(state, {
      type: "point",
      ref: { kind: "junction", id: "j" },
      wireId: "unused",
    });
    state = editorReducer(state, { type: "select", selection: { kind: "junction", id: "j" } });
    state = editorReducer(state, { type: "delete" });
    expect(state.document.ground).toBeNull();
    expect(state.document.wires).toHaveLength(3);
    expect(state.document.junctions).toHaveLength(0);
  });
  it("snaps to the grid and routes orthogonal paths", () => {
    expect(snap({ x: 29, y: 31 })).toEqual({ x: 20, y: 40 });
    expect(
      orthogonalPath([
        { x: 0, y: 0 },
        { x: 40, y: 60 },
      ]),
    ).toEqual([0, 0, 40, 0, 40, 60]);
  });
});
