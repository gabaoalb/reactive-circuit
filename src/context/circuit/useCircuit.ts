import { useContext } from "react";
import { CircuitContext } from "./context";

export function useCircuit() {
	// Lógica do hook useCircuit aqui
	const context = useContext(CircuitContext);
	if (!context) {
		throw new Error("useCircuit must be used within a CircuitProvider");
	}
	return context;
}
