import { Group, Line, Text, Circle } from "react-konva";
import type { FC } from "react";
import type { ResistorProps } from "./interface";

// --- Resistor Shape ---
const ResistorShape: FC<ResistorProps> = ({ data, onUpdate }) => {
	const leftLinePoints = [0, 0, 20, 0];
	const zigZagPoints = [
		20, 0, 25, -10, 35, 10, 45, -10, 55, 10, 65, -10, 75, 10, 80, 0
	];
	const rightLinePoints = [80, 0, 100, 0];

	return (
		<Group
			x={data.position.x}
			y={data.position.y}
			draggable
			onDragEnd={(e) =>
				onUpdate(data.id, {
					position: { x: e.target.x(), y: e.target.y() }
				})
			}
		>
			<Line
				points={leftLinePoints}
				stroke="black"
				strokeWidth={2}
				lineCap="round"
				lineJoin="round"
			/>
			<Line
				points={zigZagPoints}
				stroke="black"
				strokeWidth={2}
				lineCap="round"
				lineJoin="round"
			/>
			<Line
				points={rightLinePoints}
				stroke="black"
				strokeWidth={2}
				lineCap="round"
				lineJoin="round"
			/>
			<Text
				text={data.label}
				x={30}
				y={-25}
				fontSize={14}
				fontFamily="Arial"
			/>
			<Text
				text={`${data.resistance}Ω`}
				x={30}
				y={15}
				fontSize={12}
				fill="gray"
			/>
			<Circle x={0} y={0} radius={4} fill="red" opacity={0.5} />
			<Circle x={100} y={0} radius={4} fill="blue" opacity={0.5} />
		</Group>
	);
};

export default ResistorShape;
