import { useState } from "react";
import { type Mode } from "../../types/circuit";
import { CanvasContext } from "./context";

function CanvasProvider({ children }: { children: React.ReactNode }) {
	const [isDrawing, setIsDrawing] = useState(false);
	const [mode, setMode] = useState<Mode>("select");
	const [component, setComponent] = useState<string | null>(null);
	const [gridSize, setGridSize] = useState(25);

	return (
		<CanvasContext.Provider
			value={{
				isDrawing,
				setIsDrawing,
				mode,
				setMode,
				component,
				setComponent,
				gridSize,
				setGridSize
			}}
		>
			{children}
		</CanvasContext.Provider>
	);
}

export default CanvasProvider;
