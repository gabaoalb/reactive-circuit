import { useContext } from "react";
import { CanvasContext } from "./context";
import type { CanvasStateContext } from "./interface";

export function useCanvas(): CanvasStateContext {
	// Lógica do hook useCanvas aqui
	const context = useContext(CanvasContext);
	if (!context) {
		throw new Error("useCanvas must be used within a CanvasProvider");
	}
	return context;
}
