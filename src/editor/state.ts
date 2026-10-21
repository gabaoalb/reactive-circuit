import { emptyCircuit, exampleCircuit, rlcCircuit, pointKey, terminal } from "../domain/circuit";
import type { CircuitDocument, Component, ConnectionPointRef, Point } from "../domain/circuit";
import { connectOverlappingPoints, detachComponent } from "./connections";
import { resizeComponent } from "./geometry";
export type MoveConnections = "keep" | "detach";
export type Tool = "select" | Component["kind"] | "wire" | "junction" | "ground";
export type Selection = { kind: "component" | "wire" | "junction"; id: string };
export interface EditorState {
  document: CircuitDocument;
  tool: Tool;
  selection: Selection | null;
  draft: { from: ConnectionPointRef; bends: Point[] } | null;
  revision: number;
  simulationEpoch: number;
  moveConnections: MoveConnections;
}
export const initialState = (): EditorState => ({
  document: rlcCircuit(),
  tool: "select",
  selection: null,
  draft: null,
  revision: 0,
  simulationEpoch: 0,
  moveConnections: "keep",
});
export type EditorAction =
  | { type: "tool"; tool: Tool }
  | { type: "select"; selection: Selection | null }
  | { type: "cancel" }
  | { type: "add-component"; component: Component }
  | { type: "add-junction"; id: string; position: Point }
  | { type: "move"; selection: Selection; position: Point }
  | { type: "move-terminal"; componentId: string; port: "a" | "b"; position: Point }
  | { type: "move-connections"; value: MoveConnections }
  | { type: "connect-overlaps"; refs: ConnectionPointRef[] }
  | { type: "rotate" }
  | { type: "value"; id: string; value: number }
  | { type: "initial-value"; id: string; value: number }
  | { type: "toggle-switch"; id: string }
  | { type: "point"; ref: ConnectionPointRef; wireId: string }
  | { type: "bend"; position: Point }
  | { type: "delete" }
  | { type: "reset"; example: boolean | "dc" };
export function editorReducer(state: EditorState, action: EditorAction): EditorState {
  const doc = state.document;
  const update = (document: CircuitDocument): EditorState => ({
    ...state,
    document,
    revision: state.revision + 1,
  });
  switch (action.type) {
    case "move-connections":
      return { ...state, moveConnections: action.value };
    case "tool":
      return { ...state, tool: action.tool, draft: null };
    case "select":
      return { ...state, selection: action.selection };
    case "cancel":
      return { ...state, tool: "select", draft: null, selection: null };
    case "reset":
      return {
        ...initialState(),
        document:
          action.example === "dc"
            ? exampleCircuit()
            : action.example
              ? rlcCircuit()
              : emptyCircuit(),
        revision: state.revision + 1,
        simulationEpoch: state.simulationEpoch + 1,
        moveConnections: state.moveConnections,
      };
    case "add-component":
      return {
        ...update(
          connectOverlappingPoints({ ...doc, components: [...doc.components, action.component] }, [
            terminal(action.component.id, "a"),
            terminal(action.component.id, "b"),
          ]),
        ),
        selection: { kind: "component", id: action.component.id },
        tool: "select",
      };
    case "add-junction":
      return {
        ...update(
          connectOverlappingPoints(
            {
              ...doc,
              junctions: [...doc.junctions, { id: action.id, position: action.position }],
            },
            [{ kind: "junction", id: action.id }],
          ),
        ),
        selection: { kind: "junction", id: action.id },
        tool: "select",
      };
    case "move": {
      const component =
        action.selection.kind === "component"
          ? doc.components.find((c) => c.id === action.selection.id)
          : undefined;
      if (
        component &&
        component.position.x === action.position.x &&
        component.position.y === action.position.y
      )
        return state;
      const connectedDoc =
        component && state.moveConnections === "detach" ? detachComponent(doc, component) : doc;
      return update({
        ...connectedDoc,
        components: connectedDoc.components.map((c) =>
          action.selection.kind === "component" && c.id === action.selection.id
            ? { ...c, position: action.position }
            : c,
        ),
        junctions: connectedDoc.junctions.map((j) =>
          action.selection.kind === "junction" && j.id === action.selection.id
            ? { ...j, position: action.position }
            : j,
        ),
      });
    }
    case "move-terminal": {
      const component = doc.components.find((c) => c.id === action.componentId);
      if (!component) return state;
      const resized = resizeComponent(component, action.port, action.position);
      if (resized === component) return state;
      const connectedDoc =
        state.moveConnections === "detach" ? detachComponent(doc, component, [action.port]) : doc;
      return update({
        ...connectedDoc,
        components: connectedDoc.components.map((c) => (c.id === component.id ? resized : c)),
      });
    }
    case "connect-overlaps": {
      const connected = connectOverlappingPoints(doc, action.refs);
      return connected === doc ? state : update(connected);
    }
    case "rotate":
      return state.selection?.kind === "component"
        ? update(
            connectOverlappingPoints(
              {
                ...doc,
                components: doc.components.map((c) =>
                  c.id === state.selection?.id ? { ...c, rotation: (c.rotation + 90) % 360 } : c,
                ),
              },
              [terminal(state.selection.id, "a"), terminal(state.selection.id, "b")],
            ),
          )
        : state;
    case "value":
      return update({
        ...doc,
        components: doc.components.map((c) =>
          c.id === action.id && c.kind !== "switch" ? { ...c, value: action.value } : c,
        ),
      });
    case "initial-value":
      return update({
        ...doc,
        components: doc.components.map((c) =>
          c.id === action.id && (c.kind === "capacitor" || c.kind === "inductor")
            ? { ...c, initialValue: action.value }
            : c,
        ),
      });
    case "toggle-switch":
      return update({
        ...doc,
        components: doc.components.map((c) =>
          c.id === action.id && c.kind === "switch" ? { ...c, closed: !c.closed } : c,
        ),
      });
    case "bend":
      return state.draft
        ? { ...state, draft: { ...state.draft, bends: [...state.draft.bends, action.position] } }
        : state;
    case "point": {
      if (state.tool === "ground")
        return { ...update({ ...doc, ground: action.ref }), tool: "select" };
      if (state.tool !== "wire") return state;
      if (!state.draft) return { ...state, draft: { from: action.ref, bends: [] } };
      if (pointKey(state.draft.from) === pointKey(action.ref)) return state;
      return {
        ...update({
          ...doc,
          wires: [
            ...doc.wires,
            { id: action.wireId, from: state.draft.from, to: action.ref, bends: state.draft.bends },
          ],
        }),
        draft: null,
      };
    }
    case "delete": {
      const selection = state.selection;
      if (!selection) return state;
      const removed = (ref: ConnectionPointRef): boolean =>
        (selection.kind === "component" &&
          ref.kind === "terminal" &&
          ref.componentId === selection.id) ||
        (selection.kind === "junction" && ref.kind === "junction" && ref.id === selection.id);
      return {
        ...update(
          connectOverlappingPoints(
            {
              ...doc,
              components: doc.components.filter(
                (c) => selection.kind !== "component" || c.id !== selection.id,
              ),
              junctions: doc.junctions.filter(
                (j) => selection.kind !== "junction" || j.id !== selection.id,
              ),
              wires: doc.wires.filter(
                (w) =>
                  !(selection.kind === "wire" && w.id === selection.id) &&
                  !removed(w.from) &&
                  !removed(w.to),
              ),
              ground: doc.ground && removed(doc.ground) ? null : doc.ground,
            },
            doc.wires
              .filter((w) => removed(w.from) || removed(w.to))
              .flatMap((w) => [w.from, w.to])
              .filter((ref) => !removed(ref)),
          ),
        ),
        selection: null,
        draft: null,
      };
    }
  }
}
