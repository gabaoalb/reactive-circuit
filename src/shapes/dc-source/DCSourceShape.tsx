import type { FC } from "react";
import { Group, Line, Text, Circle } from "react-konva";
import type { DCSourceProps } from "./interface";

// --- DC Source Shape (Novo Componente) ---
const DCSourceShape: FC<DCSourceProps> = ({ data, onUpdate }) => {
	return (
		<Group
			x={data.x}
			y={data.y}
			draggable
			onDragEnd={(e) =>
				onUpdate(data.id, { x: e.target.x(), y: e.target.y() })
			}
		>
			{/* Fio da esquerda até a placa positiva */}
			<Line points={[0, 0, 45, 0]} stroke="black" strokeWidth={2} />

			{/* Placa Positiva (Linha Longa) */}
			<Line points={[45, -15, 45, 15]} stroke="black" strokeWidth={2} />

			{/* Placa Negativa (Linha Curta) */}
			<Line points={[55, -8, 55, 8]} stroke="black" strokeWidth={2} />

			{/* Fio da placa negativa até a direita */}
			<Line points={[55, 0, 100, 0]} stroke="black" strokeWidth={2} />

			{/* Símbolo de Mais (+) para indicar polaridade */}
			<Text
				text="+"
				x={35}
				y={-22}
				fontSize={16}
				fontStyle="bold"
				fontFamily="Arial"
			/>

			{/* Rótulo e Valor */}
			<Text
				text={data.label}
				x={40}
				y={-35}
				fontSize={14}
				fontFamily="Arial"
			/>
			<Text
				text={`${data.voltage}V`}
				x={40}
				y={20}
				fontSize={12}
				fill="gray"
			/>

			{/* Terminais (Hotspots) */}
			<Circle x={0} y={0} radius={4} fill="red" opacity={0.5} />
			<Circle x={100} y={0} radius={4} fill="blue" opacity={0.5} />
		</Group>
	);
};

export default DCSourceShape;
