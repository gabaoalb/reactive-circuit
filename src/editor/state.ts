import { emptyCircuit, exampleCircuit, pointKey } from "../domain/circuit";
import type { CircuitDocument, Component, ConnectionPointRef, Point } from "../domain/circuit";
export type Tool = "select" | "resistor" | "voltage" | "wire" | "junction" | "ground";
export type Selection = { kind: "component" | "wire" | "junction"; id: string };
export interface EditorState {
  document: CircuitDocument;
  tool: Tool;
  selection: Selection | null;
  draft: { from: ConnectionPointRef; bends: Point[] } | null;
  revision: number;
}
export const initialState = (): EditorState => ({
  document: exampleCircuit(),
  tool: "select",
  selection: null,
  draft: null,
  revision: 0,
});
export type EditorAction =
  | { type: "tool"; tool: Tool }
  | { type: "select"; selection: Selection | null }
  | { type: "cancel" }
  | { type: "add-component"; component: Component }
  | { type: "add-junction"; id: string; position: Point }
  | { type: "move"; selection: Selection; position: Point }
  | { type: "rotate" }
  | { type: "value"; id: string; value: number }
  | { type: "point"; ref: ConnectionPointRef; wireId: string }
  | { type: "bend"; position: Point }
  | { type: "delete" }
  | { type: "reset"; example: boolean };
export function editorReducer(state: EditorState, action: EditorAction): EditorState {
  const doc = state.document;
  const update = (document: CircuitDocument): EditorState => ({
    ...state,
    document,
    revision: state.revision + 1,
  });
  switch (action.type) {
    case "tool":
      return { ...state, tool: action.tool, draft: null };
    case "select":
      return { ...state, selection: action.selection };
    case "cancel":
      return { ...state, tool: "select", draft: null, selection: null };
    case "reset":
      return {
        ...initialState(),
        document: action.example ? exampleCircuit() : emptyCircuit(),
        revision: state.revision + 1,
      };
    case "add-component":
      return {
        ...update({ ...doc, components: [...doc.components, action.component] }),
        selection: { kind: "component", id: action.component.id },
        tool: "select",
      };
    case "add-junction":
      return {
        ...update({
          ...doc,
          junctions: [...doc.junctions, { id: action.id, position: action.position }],
        }),
        selection: { kind: "junction", id: action.id },
        tool: "select",
      };
    case "move":
      return update({
        ...doc,
        components: doc.components.map((c) =>
          action.selection.kind === "component" && c.id === action.selection.id
            ? { ...c, position: action.position }
            : c,
        ),
        junctions: doc.junctions.map((j) =>
          action.selection.kind === "junction" && j.id === action.selection.id
            ? { ...j, position: action.position }
            : j,
        ),
      });
    case "rotate":
      return state.selection?.kind === "component"
        ? update({
            ...doc,
            components: doc.components.map((c) =>
              c.id === state.selection?.id ? { ...c, rotation: (c.rotation + 90) % 360 } : c,
            ),
          })
        : state;
    case "value":
      return update({
        ...doc,
        components: doc.components.map((c) =>
          c.id === action.id ? { ...c, value: action.value } : c,
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
        ...update({
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
        }),
        selection: null,
        draft: null,
      };
    }
  }
}
