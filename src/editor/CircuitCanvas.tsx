import { useTranslation } from "react-i18next";
import { useTheme } from "@mui/material/styles";
import { circuitColors } from "../theme";
import { useEffect, useRef, useState } from "react";
import type { Dispatch } from "react";
import { Circle, Group, Layer, Line, Stage, Text } from "react-konva";
import type { KonvaEventObject } from "konva/lib/Node";
import { pointKey, terminal } from "../domain/circuit";
import type { ConnectionPointRef, Point } from "../domain/circuit";
import type { SimulationOutcome } from "../simulation/mna";
import {
  connectionPosition,
  GRID,
  orthogonalPath,
  snap,
  resizeComponent,
  terminalPosition,
  wirePath,
} from "./geometry";
import type { EditorAction, EditorState } from "./state";
import { ComponentShape } from "./ComponentShape";

interface Props {
  state: EditorState;
  dispatch: Dispatch<EditorAction>;
  result: SimulationOutcome | null;
}
const id = () => crypto.randomUUID();
const placement = (point: Point): Point => {
  const position = snap(point);
  return { x: Math.max(60, position.x), y: Math.max(60, position.y) };
};
export function CircuitCanvas({ state, dispatch, result }: Props) {
  const colors = circuitColors(useTheme().palette);
  const { t } = useTranslation();
  const container = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 800, height: 560 });
  const [pointer, setPointer] = useState<Point | null>(null);
  const doc = state.document;
  const extents = [
    ...doc.components.flatMap((c) => [terminalPosition(c, "a"), terminalPosition(c, "b")]),
    ...doc.junctions.map((j) => j.position),
    ...doc.wires.flatMap((w) => w.bends),
  ];
  const width = Math.max(640, size.width, ...extents.map((p) => p.x + 100));
  const height = Math.max(size.height, ...extents.map((p) => p.y + 100));
  useEffect(() => {
    const element = container.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) =>
      setSize({ width: entry.contentRect.width, height: entry.contentRect.height }),
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const selected = (kind: string, itemId: string) =>
    state.selection?.kind === kind && state.selection.id === itemId;
  function pointClick(event: KonvaEventObject<PointerEvent>, ref: ConnectionPointRef) {
    event.cancelBubble = true;
    if (state.tool === "wire" || state.tool === "ground")
      dispatch({ type: "point", ref, wireId: id() });
    else if (state.tool === "select")
      dispatch({
        type: "select",
        selection:
          ref.kind === "terminal"
            ? { kind: "component", id: ref.componentId }
            : { kind: "junction", id: ref.id },
      });
  }
  function backgroundClick(event: KonvaEventObject<PointerEvent>) {
    if (event.target !== event.target.getStage()) return;
    const raw = event.target.getStage()?.getPointerPosition();
    if (!raw) return;
    const position = snap(raw);
    if (state.tool === "resistor" || state.tool === "voltage") {
      const kind = state.tool;
      const prefix = kind === "resistor" ? "R" : "V";
      let number = 1;
      while (doc.components.some((c) => c.name === `${prefix}${number}`)) number++;
      dispatch({
        type: "add-component",
        component: {
          id: id(),
          name: `${prefix}${number}`,
          kind,
          value: kind === "resistor" ? 1000 : 5,
          position: placement(position),
          rotation: 0,
        },
      });
    } else if (state.tool === "junction") dispatch({ type: "add-junction", id: id(), position });
    else if (state.tool === "wire") dispatch({ type: "bend", position });
    else dispatch({ type: "select", selection: null });
  }
  function pointMarker(ref: ConnectionPointRef, position: Point, junction = false) {
    const key = pointKey(ref);
    const grounded = doc.ground && pointKey(doc.ground) === key;
    const node = result?.ok ? result.graph.pointNodes[key] : undefined;
    const isSelected = ref.kind === "junction" && selected("junction", ref.id);
    const drag = (event: KonvaEventObject<DragEvent>) => {
      event.cancelBubble = true;
      if (ref.kind === "junction") {
        const position = placement(event.target.position());
        event.target.position(position);
        dispatch({ type: "move", selection: { kind: "junction", id: ref.id }, position });
      } else {
        const component = doc.components.find((c) => c.id === ref.componentId);
        if (!component) return;
        const resized = resizeComponent(component, ref.port, placement(event.target.position()));
        const position = terminalPosition(resized, ref.port);
        event.target.position(position);
        dispatch({ type: "move-terminal", componentId: ref.componentId, port: ref.port, position });
      }
    };
    return (
      <Group
        key={key}
        x={position.x}
        y={position.y}
        draggable={state.tool === "select"}
        onDragStart={() => {
          dispatch({
            type: "select",
            selection:
              ref.kind === "junction"
                ? { kind: "junction", id: ref.id }
                : { kind: "component", id: ref.componentId },
          });
        }}
        onDragMove={drag}
        onDragEnd={drag}
      >
        <Circle
          radius={junction ? 5 : 4}
          fill={isSelected ? colors.selection : grounded ? colors.ground : colors.background}
          stroke={colors.terminal}
          strokeWidth={2}
          hitStrokeWidth={16}
          onPointerClick={(event) => pointClick(event, ref)}
        />
        {ref.kind === "terminal" && (
          <Text x={-14} y={5} text={ref.port} fontSize={9} fill={colors.muted} listening={false} />
        )}
        {grounded && (
          <Group listening={false}>
            <Line points={[0, 7, 0, 16, -10, 16, 10, 16]} stroke={colors.ground} strokeWidth={2} />
            <Line points={[-6, 21, 6, 21]} stroke={colors.ground} strokeWidth={2} />
            <Line points={[-2, 26, 2, 26]} stroke={colors.ground} strokeWidth={2} />
          </Group>
        )}
        {node !== undefined && (
          <Text
            x={8}
            y={-18}
            text={`N${node}`}
            fontSize={11}
            fill={colors.ground}
            listening={false}
          />
        )}
      </Group>
    );
  }
  const draftStart = state.draft && connectionPosition(doc, state.draft.from);
  return (
    <div
      className={`canvas-container tool-${state.tool}`}
      ref={container}
      role="region"
      aria-label={t(
        "Editor de circuito. Use as ferramentas e clique na grade; fios conectam terminais ou junções explícitas.",
      )}
    >
      <Stage
        width={width}
        height={height}
        onPointerClick={backgroundClick}
        onPointerMove={(event) => {
          const p = event.target.getStage()?.getPointerPosition();
          if (p) setPointer(snap(p));
        }}
        onPointerLeave={() => setPointer(null)}
      >
        <Layer listening={false}>
          {Array.from({ length: Math.ceil(width / GRID) }, (_, x) => (
            <Line
              key={`x${x}`}
              points={[x * GRID, 0, x * GRID, height]}
              stroke={colors.grid}
              strokeWidth={0.6}
            />
          ))}
          {Array.from({ length: Math.ceil(height / GRID) }, (_, y) => (
            <Line
              key={`y${y}`}
              points={[0, y * GRID, width, y * GRID]}
              stroke={colors.grid}
              strokeWidth={0.6}
            />
          ))}
        </Layer>
        <Layer>
          {doc.wires.map((w) => (
            <Line
              key={w.id}
              points={wirePath(doc, w)}
              stroke={selected("wire", w.id) ? colors.selection : colors.wire}
              strokeWidth={selected("wire", w.id) ? 4 : 2}
              hitStrokeWidth={12}
              onPointerClick={(event) => {
                event.cancelBubble = true;
                if (state.tool === "select")
                  dispatch({ type: "select", selection: { kind: "wire", id: w.id } });
              }}
            />
          ))}
          {draftStart && state.draft && pointer && (
            <Line
              points={orthogonalPath([draftStart, ...state.draft.bends, pointer])}
              stroke={colors.selection}
              strokeWidth={2}
              dash={[6, 4]}
              listening={false}
            />
          )}
          {doc.components.map((c) => (
            <ComponentShape
              key={c.id}
              component={c}
              selected={selected("component", c.id)}
              draggable={state.tool === "select"}
              onSelect={() =>
                dispatch({ type: "select", selection: { kind: "component", id: c.id } })
              }
              onMove={(position) =>
                dispatch({ type: "move", selection: { kind: "component", id: c.id }, position })
              }
            />
          ))}
        </Layer>
        <Layer>
          {doc.components.flatMap((c) =>
            (["a", "b"] as const).map((port) =>
              pointMarker(terminal(c.id, port), terminalPosition(c, port)),
            ),
          )}
          {doc.junctions.map((j) => pointMarker({ kind: "junction", id: j.id }, j.position, true))}
        </Layer>
      </Stage>
      {!doc.components.length && (
        <div className="canvas-empty">
          {t("Seu circuito começa aqui")}
          <span>{t("Escolha um componente e clique na grade.")}</span>
        </div>
      )}
    </div>
  );
}
