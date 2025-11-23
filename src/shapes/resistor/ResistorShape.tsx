import { Group, Line, Text, Circle } from "react-konva";
import { useMemo, type FC } from "react";
import type { ResistorProps } from "./interface";
import type { Resistor } from "../../types/circuit";
import { calculateGeometry } from "../../functions/calculateGeometry";
import { useCanvas } from "../../context/canvas/useCanvas";
import { snapGrid } from "../../functions/snapGrid";

// --- Resistor Shape ---
const ResistorShape: FC<ResistorProps> = ({ data, onUpdate }) => {
	const SYMBOL_GAP = 60;

	const { gridSize } = useCanvas();

	const { angle, midX, midY, gapStart, gapEnd } = useMemo(
		() =>
			calculateGeometry({
				pointA: data.pointA,
				pointB: data.pointB,
				symbolWidth: SYMBOL_GAP
			}),
		[data.pointA, data.pointB]
	);

	const zigZagPoints = [
		-30, 0, -25, -10, -15, 10, -5, -10, 5, 10, 15, -10, 25, 10, 30, 0
	];

	// const handleDragEnd = (e: KonvaEventObject<DragEvent>) => {
	// 	e.target.to({
	// 		x: snapGrid({ value: e.target.x(), gridSize }),
	// 		y: snapGrid({ value: e.target.y(), gridSize })
	// 	});
	// };

	return (
		<>
			{/* Fio Esquerdo (Fixo na ponta, estica até o símbolo) */}
			<Line
				points={[data.pointA.x, data.pointA.y, gapStart.x, gapStart.y]}
				stroke="black"
				strokeWidth={2}
			/>

			{/* Fio Direito */}
			<Line
				points={[gapEnd.x, gapEnd.y, data.pointB.x, data.pointB.y]}
				stroke="black"
				strokeWidth={2}
			/>

			{/* O Símbolo (Zigue-zague) no centro, rotacionado */}
			<Group x={midX} y={midY} rotation={angle}>
				<Line
					points={zigZagPoints}
					stroke="black"
					strokeWidth={2}
					lineCap="round"
					lineJoin="round"
				/>
				{/* Labels giram com o componente ou ficam fixos? Aqui fiz girar junto */}
				<Text
					text={data.label}
					x={-15}
					y={-25}
					fontSize={14}
					fontFamily="Arial"
					rotation={-angle}
				/>
				<Text
					text={`${data.resistance}Ω`}
					x={-15}
					y={15}
					fontSize={12}
					fill="gray"
					rotation={-angle}
				/>
			</Group>

			{/* Terminal 1 (Arrastável) */}
			<Circle
				x={data.pointA.x}
				y={data.pointA.y}
				radius={6}
				fill="red"
				draggable
				onDragMove={(e) => {
					const snapX = snapGrid({ value: e.target.x(), gridSize });
					const snapY = snapGrid({ value: e.target.y(), gridSize });
					e.target.to({
						x: snapX,
						y: snapY
					});
					onUpdate(data.id, {
						pointA: {
							x: snapX,
							y: snapY
						}
					} as Partial<Resistor>);
				}}
				// onDragEnd={handleDragEnd}
			/>

			{/* Terminal 2 (Arrastável) */}
			<Circle
				x={data.pointB.x}
				y={data.pointB.y}
				radius={6}
				fill="blue"
				draggable
				onDragMove={(e) => {
					const snapX = snapGrid({ value: e.target.x(), gridSize });
					const snapY = snapGrid({ value: e.target.y(), gridSize });
					e.target.to({
						x: snapX,
						y: snapY
					});
					onUpdate(data.id, {
						pointB: {
							x: snapX,
							y: snapY
						}
					} as Partial<Resistor>);
				}}
				// onDragEnd={handleDragEnd}
			/>
		</>
	);
};

export default ResistorShape;
