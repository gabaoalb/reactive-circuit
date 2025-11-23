import { Layer, Stage } from "react-konva";
import type { Stage as StageType } from "konva/lib/Stage";
import Grid from "../grid/Grid";
import { useEffect, useRef } from "react";
import { useCanvas } from "../../context/canvas/useCanvas";
import { dragBoundariesFunc } from "../../functions/dragBoundariesFunc";
import { cursorStyle } from "../../functions/cursorStyle";
import { snapGrid } from "../../functions/snapGrid";
import type { ComponentId, DCSource, Resistor } from "../../types/circuit";
import ElementSwitcher from "../element-switcher/ElementSwitcher";
import { useCircuit } from "../../context/circuit/useCircuit";

function Canvas() {
	const stageRef = useRef<StageType | null>(null);

	const { mode, gridSize, drawComponent } = useCanvas();
	const { elements, setElements } = useCircuit();

	useEffect(() => {
		const stage = stageRef.current;
		if (!stage) return;

		// Handler para começar (agora apenas marca o início, não cria o componente)
		const handleMouseDown = () => {
			if (mode === "move") return;

			const pos = stage.getPointerPosition();
			if (!pos) return;

			const snappedPos = {
				x: snapGrid({ value: pos.x, gridSize }),
				y: snapGrid({ value: pos.y, gridSize })
			};

			const newId = crypto.randomUUID() as ComponentId;

			if (drawComponent === "resistor") {
				const newResistor: Resistor = {
					id: newId,
					kind: "resistor",
					pointA: snappedPos,
					pointB: { x: snappedPos.x + 100, y: snappedPos.y },
					rotation: 0,
					resistance: 1000,
					label: `R${
						elements.filter((e) => e.kind === "resistor").length + 1
					}`
				};
				setElements((prev) => [...prev, newResistor]);
			} else if (drawComponent === "dc-source") {
				const newDCSource: DCSource = {
					id: newId,
					kind: "dc-source",
					pointA: snappedPos,
					pointB: { x: snappedPos.x + 100, y: snappedPos.y },
					rotation: 0,
					voltage: 5,
					label: `V${
						elements.filter((e) => e.kind === "dc-source").length +
						1
					}`
				};
				setElements((prev) => [...prev, newDCSource]);
			}
		};

		stage.on("mousedown", handleMouseDown);

		return () => {
			// window.removeEventListener("resize", onResize);
			stage.off("mousedown", handleMouseDown);
			// stage.off("mousemove", handleMouseMove);
			// stage.off("mouseup", handleMouseUp);
		};
	}, [mode, gridSize, drawComponent, elements, setElements]);

	return (
		<Stage
			ref={stageRef}
			width={window.innerWidth}
			height={window.innerHeight - 50}
			draggable={mode === "move"}
			dragBoundFunc={dragBoundariesFunc}
			style={{
				cursor: cursorStyle(mode)
			}}
		>
			<Layer>
				<Grid />
				<ElementSwitcher />
			</Layer>
		</Stage>
	);
}

export default Canvas;
