import { Circle, Group, Line } from "react-konva";
import { useCanvas } from "../../context/canvas/useCanvas";

function Grid({
	width = window.innerWidth,
	height = window.innerHeight
}: {
	width?: number;
	height?: number;
}) {
	const { gridSize } = useCanvas();

	const horizontalLines = [];

	width = width * 2;
	height = height * 2;

	// linhas horizontais
	for (let y = 0; y <= height; y += gridSize) {
		horizontalLines.push(
			<Line
				key={`horizontal-${y}`}
				points={[0, y, width, y]}
				stroke="#e6e6e6"
				strokeWidth={0.7}
			/>
		);
	}

	const verticalLines = [];

	// linhas verticais
	for (let x = 0; x <= width; x += gridSize) {
		verticalLines.push(
			<Line
				key={`vertical-${x}`}
				points={[x, 0, x, height]}
				stroke="#e6e6e6"
				strokeWidth={0.7}
			/>
		);
	}

	return (
		<Group>
			<Circle x={0} y={0} radius={3} fill="red" />
			{horizontalLines}
			{verticalLines}
		</Group>
	);
}

export default Grid;
