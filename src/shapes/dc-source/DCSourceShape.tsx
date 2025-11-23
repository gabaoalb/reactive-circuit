import { useMemo, type FC } from "react";
import { Line, Text, Circle, Group, Rect } from "react-konva";
import type { DCSourceProps } from "./interface";
import { useCircuit } from "../../context/circuit/useCircuit";
import { updateElement } from "../../functions/updateElement";
// import type { KonvaEventObject } from "konva/lib/Node";
import { calculateGeometry } from "../../functions/calculateGeometry";
import { snapGrid } from "../../functions/snapGrid";
import type { ComponentId, DCSource } from "../../types/circuit";
import { useCanvas } from "../../context/canvas/useCanvas";

// --- DC Source Shape (Novo Componente) ---
const DCSourceShape: FC<DCSourceProps> = ({ data }) => {
	const SYMBOL_GAP = 10;

	const { gridSize } = useCanvas();

	const { setElements } = useCircuit();

	// const handleUpdate = (e: KonvaEventObject<DragEvent>) => {
	// 	return updateElement(
	// 		data.id,
	// 		{ x: e.target.x(), y: e.target.y() },
	// 		setElements
	// 	);
	// };

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const handleUpdateAnchor = (id: ComponentId, newAttrs: any) => {
		return updateElement(id, newAttrs, setElements);
	};

	const { angle, midX, midY, gapStart, gapEnd } = useMemo(
		() =>
			calculateGeometry({
				pointA: data.pointA,
				pointB: data.pointB,
				symbolWidth: SYMBOL_GAP
			}),
		[data.pointA, data.pointB]
	);

	return (
		<>
			{/* Fio da esquerda até a placa positiva */}
			<Line
				points={[data.pointA.x, data.pointA.y, gapStart.x, gapStart.y]}
				stroke="black"
				strokeWidth={2}
			/>

			<Group
				x={midX}
				y={midY}
				rotation={angle}
				draggable // <---
				// onDragMove={handleGroupDrag} // <---
				// onMouseEnter={handleCursor("move")}
				// onMouseLeave={handleCursor("default")}
			>
				{/* Hit Area */}
				<Rect
					x={-15}
					y={-25}
					width={30}
					height={50}
					fill="transparent"
				/>

				<Line
					points={[-5, -15, -5, 15]}
					stroke="black"
					strokeWidth={2}
				/>
				<Line points={[5, -8, 5, 8]} stroke="black" strokeWidth={2} />
				<Text text="+" x={-15} y={-20} fontSize={14} fontStyle="bold" />
				<Text
					text={data.label}
					x={-10}
					y={-35}
					rotation={-angle}
					fontSize={14}
				/>
				<Text
					text={`${data.voltage}V`}
					x={-10}
					y={20}
					rotation={-angle}
					fontSize={12}
					fill="gray"
				/>
			</Group>

			{/* Fio da placa negativa até a direita */}
			<Line
				points={[gapEnd.x, gapEnd.y, data.pointB.x, data.pointB.y]}
				stroke="black"
				strokeWidth={2}
			/>

			{/* Terminais (Hotspots) */}
			<Circle
				x={data.pointA.x}
				y={data.pointA.y}
				radius={4}
				fill="red"
				opacity={0.5}
				draggable
				onDragMove={(e) => {
					const snapX = snapGrid({ value: e.target.x(), gridSize });
					const snapY = snapGrid({ value: e.target.y(), gridSize });
					e.target.x(snapX);
					e.target.y(snapY);
					handleUpdateAnchor(data.id, {
						pointA: {
							x: snapX,
							y: snapY
						}
					} as Partial<DCSource>);
				}}
			/>
			<Circle
				x={data.pointB.x}
				y={data.pointB.y}
				radius={4}
				fill="blue"
				opacity={0.5}
				draggable
				onDragMove={(e) => {
					const snapX = snapGrid({ value: e.target.x(), gridSize });
					const snapY = snapGrid({ value: e.target.y(), gridSize });
					e.target.to({
						x: snapX,
						y: snapY
					});
					handleUpdateAnchor(data.id, {
						pointB: {
							x: snapX,
							y: snapY
						}
					} as Partial<DCSource>);
				}}
			/>
		</>
	);
};

export default DCSourceShape;
