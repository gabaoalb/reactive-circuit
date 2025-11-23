import type { Mode } from "../../types/circuit";

export interface CanvasStateContext {
	isDrawing: boolean;
	setIsDrawing: (drawing: boolean) => void;
	mode: Mode;
	setMode: (mode: Mode) => void;
	component: string | null;
	setComponent: (component: string | null) => void;
	gridSize: number;
	setGridSize: (size: number) => void;
}
