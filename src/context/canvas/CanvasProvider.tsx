import { useState } from "react";
import { type Mode } from "../../types/circuit";
import { CanvasContext } from "./context";

function CanvasProvider({ children }: { children: React.ReactNode }) {
	const [isDrawing, setIsDrawing] = useState(false);
	const [mode, setMode] = useState<Mode>("select");
	const [drawComponent, setDrawComponent] = useState<string | null>(null);
	const [gridSize, setGridSize] = useState(25);

	return (
		<CanvasContext.Provider
			value={{
				isDrawing,
				setIsDrawing,
				mode,
				setMode,
				drawComponent,
				setDrawComponent,
				gridSize,
				setGridSize
			}}
		>
			{children}
		</CanvasContext.Provider>
	);
}

export default CanvasProvider;
