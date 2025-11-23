import { useContext } from "react";
import { CanvasContext } from "./context";

export function useCanvas() {
	// Lógica do hook useCanvas aqui
	const context = useContext(CanvasContext);
	if (!context) {
		throw new Error("useCanvas must be used within a CanvasProvider");
	}
	return context;
}
