import { Group, Line, Text, Circle } from "react-konva";
import { useMemo, type FC } from "react";
import type { ResistorProps } from "./interface";
import type { ComponentId, Resistor } from "../../types/circuit";
import { calculateGeometry } from "../../functions/calculateGeometry";
import { useCanvas } from "../../context/canvas/useCanvas";
import { snapGrid } from "../../functions/snapGrid";
import type { KonvaEventObject } from "konva/lib/Node";
import { useCircuit } from "../../context/circuit/useCircuit";
import { updateElement } from "../../functions/updateElement";

// --- Resistor Shape ---
const ResistorShape: FC<ResistorProps> = ({ data }) => {
	const SYMBOL_GAP = 60;

	const { gridSize } = useCanvas();

	const { setElements } = useCircuit();

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

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const handleUpdate = (id: ComponentId, newAttrs: any) => {
		return updateElement(id, newAttrs, setElements);
	};

	// const handleDragEnd = (e: KonvaEventObject<DragEvent>) => {
	// 	e.target.to({
	// 		x: snapGrid({ value: e.target.x(), gridSize }),
	// 		y: snapGrid({ value: e.target.y(), gridSize })
	// 	});
	// };

	// Função para transladar o componente inteiro
	const handleGroupDrag = (e: KonvaEventObject<DragEvent>) => {
		const midSnappedX = snapGrid({ value: e.target.x(), gridSize });
		const midSnappedY = snapGrid({ value: e.target.y(), gridSize });

		// Calcula o quanto o mouse se moveu em relação à posição original (midX, midY)
		const dx = midSnappedX - midX;
		const dy = midSnappedY - midY;

		const snappedAX = snapGrid({ value: data.pointA.x + dx, gridSize });
		const snappedAY = snapGrid({ value: data.pointA.y + dy, gridSize });

		const snappedBX = snapGrid({ value: data.pointB.x + dx, gridSize });
		const snappedBY = snapGrid({ value: data.pointB.y + dy, gridSize });

		// Aplica o mesmo deslocamento para x1,y1 e x2,y2
		handleUpdate(data.id, {
			pointA: { x: snappedAX, y: snappedAY },
			pointB: { x: snappedBX, y: snappedBY }
		} as Partial<Resistor>);

		e.target.x(midSnappedX);
		e.target.y(midSnappedY);
	};

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
			<Group
				x={midX}
				y={midY}
				rotation={angle}
				draggable // <--- Torna o grupo arrastável
				onDragMove={handleGroupDrag} // <--- Lógica de translação
			>
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
				radius={4}
				fill="orange"
				opacity={0.8}
				draggable
				onDragMove={(e) => {
					const snapX = snapGrid({ value: e.target.x(), gridSize });
					const snapY = snapGrid({ value: e.target.y(), gridSize });
					e.target.x(snapX);
					e.target.y(snapY);
					handleUpdate(data.id, {
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
				radius={4}
				fill="orange"
				opacity={0.8}
				draggable
				onDragMove={(e) => {
					const snapX = snapGrid({ value: e.target.x(), gridSize });
					const snapY = snapGrid({ value: e.target.y(), gridSize });
					e.target.to({
						x: snapX,
						y: snapY
					});
					handleUpdate(data.id, {
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
