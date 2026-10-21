import { describe, expect, it } from "vitest";
import { pointKey, terminal } from "../domain/circuit";
import { buildElectricalGraph } from "../simulation/graph";
import {
  componentDragPosition,
  componentLength,
  connectionPosition,
  orthogonalPath,
  resizeComponent,
  snap,
  terminalPosition,
  wirePath,
} from "./geometry";
import { simulateDc } from "../simulation/mna";
import { editorReducer, initialState } from "./state";
describe("editor commands", () => {
  it.each(["r1", "v1"])(
    "stretches %s about its fixed terminal without changing connectivity or simulation",
    (id) => {
      let state = initialState();
      const before = state.document.components.find((c) => c.id === id)!;
      const fixed = terminalPosition(before, "b");
      const moved = terminalPosition(before, "a");
      const graph = buildElectricalGraph(state.document);
      state = editorReducer(state, {
        type: "move-terminal",
        componentId: id,
        port: "a",
        position: { x: moved.x - 100, y: moved.y - 60 },
      });
      const after = state.document.components.find((c) => c.id === id)!;
      expect(terminalPosition(after, "b")).toEqual(fixed);
      expect(terminalPosition(after, "a")).toEqual({ x: moved.x - 100, y: moved.y - 60 });
      expect(componentLength(after)).toBeGreaterThan(80);
      expect(buildElectricalGraph(state.document).pointNodes).toEqual(graph.pointNodes);
      expect(simulateDc(state.document)).toMatchObject({ ok: true, voltages: [0, 10, 5] });
    },
  );
  it("keeps a fixed while moving b, snaps to the grid, and rejects overlapping terminals", () => {
    const component = initialState().document.components[1];
    const resized = resizeComponent(component, "b", { x: 501, y: 219 });
    expect(terminalPosition(resized, "a")).toEqual(terminalPosition(component, "a"));
    expect(terminalPosition(resized, "b")).toEqual({ x: 500, y: 220 });
    expect(resizeComponent(component, "b", terminalPosition(component, "a"))).toBe(component);
    expect(resizeComponent(component, "b", { x: 320, y: 160 })).toBe(component);
    expect(resizeComponent(component, "a", terminalPosition(component, "a"))).toBe(component);
  });
  it("preserves geometry when translating a component stretched diagonally", () => {
    const component = resizeComponent(initialState().document.components[1], "b", {
      x: 520,
      y: 220,
    });
    const position = componentDragPosition(component, {
      x: component.position.x + 29,
      y: component.position.y + 31,
    });
    const translated = { ...component, position };
    for (const port of ["a", "b"] as const) {
      const before = terminalPosition(component, port);
      expect(terminalPosition(translated, port)).toEqual({ x: before.x + 20, y: before.y + 40 });
    }
    expect(componentLength(translated)).toBe(componentLength(component));
    expect(componentDragPosition(component, { x: -1000, y: -1000 }).x).toBeGreaterThanOrEqual(
      (componentLength(component) / 2) * Math.abs(Math.cos((component.rotation * Math.PI) / 180)),
    );
  });
  it("detaches body movement while keeping the old wire geometry and shared nodes", () => {
    let state = initialState();
    state.document.wires.push({
      id: "branch",
      from: terminal("r1", "a"),
      to: terminal("r2", "b"),
      bends: [{ x: 100, y: 300 }],
    });
    const oldPaths = state.document.wires.map((w) => wirePath(state.document, w));
    state = editorReducer(state, { type: "move-connections", value: "detach" });
    state = editorReducer(state, {
      type: "move",
      selection: { kind: "component", id: "r1" },
      position: { x: 340, y: 300 },
    });
    expect(state.document.junctions).toHaveLength(2);
    expect(state.document.wires.map((w) => wirePath(state.document, w))).toEqual(oldPaths);
    expect(state.document.wires[0].to).toEqual(state.document.wires[3].from);
    expect(
      state.document.wires.some((w) =>
        [w.from, w.to].some((ref) => ref.kind === "terminal" && ref.componentId === "r1"),
      ),
    ).toBe(false);
    state = editorReducer(state, {
      type: "move",
      selection: { kind: "component", id: "r1" },
      position: { x: 340, y: 400 },
    });
    expect(state.document.junctions).toHaveLength(2);
    expect(state.document.wires.map((w) => wirePath(state.document, w))).toEqual(oldPaths);
    expect(simulateDc(state.document)).toMatchObject({
      ok: false,
      diagnostic: { code: "floating" },
    });
  });
  it("leaves the ground at its original location when detaching a grounded component", () => {
    let state = initialState();
    const position = terminalPosition(state.document.components[0], "b");
    state = editorReducer(state, { type: "move-connections", value: "detach" });
    state = editorReducer(state, {
      type: "move",
      selection: { kind: "component", id: "v1" },
      position: { x: 180, y: 400 },
    });
    expect(state.document.ground?.kind).toBe("junction");
    expect(connectionPosition(state.document, state.document.ground!)).toEqual(position);
    expect(state.document.ground).toEqual(state.document.wires[2].to);
  });
  it("does not detach on click, unchanged or invalid terminal drag, rotation, or junction movement", () => {
    let state = initialState();
    state = editorReducer(state, { type: "move-connections", value: "detach" });
    const wires = state.document.wires;
    const revision = state.revision;
    state = editorReducer(state, {
      type: "move",
      selection: { kind: "component", id: "r1" },
      position: { x: 340, y: 160 },
    });
    expect(state.revision).toBe(revision);
    state = editorReducer(state, {
      type: "move-terminal",
      componentId: "r1",
      port: "b",
      position: { x: 380, y: 160 },
    });
    state = editorReducer(state, {
      type: "move-terminal",
      componentId: "r1",
      port: "b",
      position: { x: 300, y: 160 },
    });
    state = editorReducer(state, { type: "select", selection: { kind: "component", id: "r1" } });
    state = editorReducer(state, { type: "rotate" });
    state = editorReducer(state, { type: "add-junction", id: "j", position: { x: 100, y: 100 } });
    state = editorReducer(state, {
      type: "move",
      selection: { kind: "junction", id: "j" },
      position: { x: 100, y: 200 },
    });
    expect(state.document.wires).toEqual(wires);
    expect(state.document.junctions).toHaveLength(1);
  });
  it.each(["a", "b"] as const)(
    "detaches only moved terminal %s and preserves wire paths and the fixed connection",
    (port) => {
      let state = initialState();
      const component = state.document.components.find((c) => c.id === "r1")!;
      const fixedPort = port === "a" ? "b" : "a";
      const fixedPosition = terminalPosition(component, fixedPort);
      const oldPosition = terminalPosition(component, port);
      state.document.wires.push({
        id: "extra",
        from: terminal("r1", port),
        to: terminal("v1", "a"),
        bends: [],
      });
      const oldPaths = state.document.wires.map((w) => wirePath(state.document, w));
      state = editorReducer(state, { type: "move-connections", value: "detach" });
      const position = { x: oldPosition.x + (port === "a" ? -100 : 100), y: oldPosition.y + 60 };
      state = editorReducer(state, { type: "move-terminal", componentId: "r1", port, position });
      expect(state.document.junctions).toHaveLength(1);
      expect(state.document.junctions[0].position).toEqual(oldPosition);
      expect(state.document.wires.map((w) => wirePath(state.document, w))).toEqual(oldPaths);
      const refs = state.document.wires.flatMap((w) => [w.from, w.to]);
      expect(refs.some((ref) => pointKey(ref) === pointKey(terminal("r1", port)))).toBe(false);
      expect(refs.some((ref) => pointKey(ref) === pointKey(terminal("r1", fixedPort)))).toBe(true);
      const junctionRefs = refs.filter((ref) => ref.kind === "junction");
      expect(junctionRefs).toHaveLength(2);
      expect(junctionRefs[0]).toEqual(junctionRefs[1]);
      expect(
        terminalPosition(
          state.document.components.find((c) => c.id === "r1")!,
          fixedPort,
        ),
      ).toEqual(fixedPosition);
      state = editorReducer(state, {
        type: "move-terminal",
        componentId: "r1",
        port,
        position: { x: position.x, y: position.y + 40 },
      });
      expect(state.document.junctions).toHaveLength(1);
      expect(state.document.wires.map((w) => wirePath(state.document, w))).toEqual(oldPaths);
    },
  );
  it("leaves ground at the old terminal position when that terminal is detached", () => {
    let state = editorReducer(initialState(), { type: "move-connections", value: "detach" });
    const original = state.document.components[0];
    const position = terminalPosition(original, "b");
    state = editorReducer(state, {
      type: "move-terminal",
      componentId: "v1",
      port: "b",
      position: { x: position.x, y: position.y + 80 },
    });
    expect(state.document.ground?.kind).toBe("junction");
    expect(connectionPosition(state.document, state.document.ground!)).toEqual(position);
    expect(state.document.wires[0].from).toEqual(terminal("v1", "a"));
    expect(state.document.ground).toEqual(state.document.wires[2].to);
  });
  it("preserves the user's movement preference when resetting circuits", () => {
    let state = editorReducer(initialState(), { type: "move-connections", value: "detach" });
    expect(state.revision).toBe(0);
    state = editorReducer(state, { type: "reset", example: false });
    expect(state.moveConnections).toBe("detach");
    expect(state.document.components).toHaveLength(0);
  });
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
