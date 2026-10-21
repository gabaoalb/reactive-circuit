import { useTranslation } from "react-i18next";
import { useTheme } from "@mui/material/styles";
import { circuitColors } from "../theme";
import { Circle, Group, Line, Rect, Text } from "react-konva";
import type { KonvaEventObject } from "konva/lib/Node";
import type { Component, Point } from "../domain/circuit";
import { componentUnit, formatPhysical } from "../domain/circuit";
import { componentDragPosition, componentLength } from "./geometry";

interface Props {
  component: Component;
  selected: boolean;
  draggable: boolean;
  onSelect: () => void;
  onMove: (position: Point) => void;
  onToggle: () => void;
}

/** Fixed-size symbol centered between two terminals, with variable-length leads. */
export function ComponentShape({
  component,
  selected,
  draggable,
  onSelect,
  onMove,
  onToggle,
}: Props) {
  const colors = circuitColors(useTheme().palette);
  const { t, i18n } = useTranslation();
  const value =
    component.kind === "switch"
      ? t(component.closed ? "closed" : "open")
      : formatPhysical(component.value, componentUnit(component), i18n.resolvedLanguage);
  const halfLength = componentLength(component) / 2;
  const move = (event: KonvaEventObject<DragEvent>) => {
    event.cancelBubble = true;
    const position = componentDragPosition(component, event.target.position());
    event.target.position(position);
    onMove(position);
  };
  return (
    <Group
      x={component.position.x}
      y={component.position.y}
      draggable={draggable}
      onPointerClick={(event) => {
        event.cancelBubble = true;
        if (draggable) {
          onSelect();
          if (component.kind === "switch") onToggle();
        }
      }}
      onDragStart={onSelect}
      onDragMove={move}
      onDragEnd={move}
    >
      <Group rotation={component.rotation}>
        <Rect
          x={-30}
          y={-27}
          width={60}
          height={54}
          fill="rgba(0,0,0,0)"
          cornerRadius={8}
          stroke={selected ? colors.selection : undefined}
          strokeWidth={1}
        />
        <Line
          points={[-halfLength, 0, -24, 0]}
          stroke={colors.symbol}
          strokeWidth={2}
          hitStrokeWidth={10}
        />
        <Line
          points={[24, 0, halfLength, 0]}
          stroke={colors.symbol}
          strokeWidth={2}
          hitStrokeWidth={10}
        />
        {component.kind === "resistor" ? (
          <Rect
            x={-24}
            y={-10}
            width={48}
            height={20}
            stroke={colors.symbol}
            strokeWidth={2}
            fill={colors.background}
          />
        ) : component.kind === "capacitor" ? (
          <>
            <Line points={[-24, 0, -6, 0]} stroke={colors.symbol} strokeWidth={2} />
            <Line points={[6, 0, 24, 0]} stroke={colors.symbol} strokeWidth={2} />
            <Line points={[-6, -20, -6, 20]} stroke={colors.symbol} strokeWidth={3} />
            <Line points={[6, -20, 6, 20]} stroke={colors.symbol} strokeWidth={3} />
          </>
        ) : component.kind === "inductor" ? (
          <Line
            points={Array.from({ length: 97 }, (_, i) => {
              const x = -24 + i / 2;
              const local = ((i % 24) / 24) * 2 - 1;
              return [x, -12 * Math.sqrt(Math.max(0, 1 - local * local))];
            }).flat()}
            stroke={colors.symbol}
            strokeWidth={2}
          />
        ) : component.kind === "switch" ? (
          <>
            <Circle x={-22} radius={3} stroke={colors.symbol} strokeWidth={2} />
            <Circle x={22} radius={3} stroke={colors.symbol} strokeWidth={2} />
            <Line
              points={[-22, 0, 22, component.closed ? 0 : -20]}
              stroke={colors.symbol}
              strokeWidth={3}
            />
          </>
        ) : (
          <>
            <Circle radius={23} stroke={colors.symbol} strokeWidth={2} fill={colors.background} />
            <Text x={-18} y={-7} text="+" fontSize={16} fill={colors.symbol} />
            <Text x={9} y={-7} text="−" fontSize={16} fill={colors.symbol} />
          </>
        )}
      </Group>
      <Text
        x={Math.abs(Math.sin((component.rotation * Math.PI) / 180)) > 0.5 ? 32 : -35}
        y={Math.abs(Math.sin((component.rotation * Math.PI) / 180)) > 0.5 ? -16 : -45}
        text={`${component.name}\n${value}`}
        fontSize={12}
        lineHeight={1.4}
        fill={colors.symbol}
        listening={false}
      />
    </Group>
  );
}
