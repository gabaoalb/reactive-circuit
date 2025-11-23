import { useState } from "react";
import type { CircuitElement } from "../../types/circuit";
import { CircuitContext } from "./context";

function CircuitProvider({ children }: { children: React.ReactNode }) {
	const [elements, setElements] = useState<CircuitElement[]>([]);

	return (
		<CircuitContext.Provider value={{ elements, setElements }}>
			{children}
		</CircuitContext.Provider>
	);
}

export default CircuitProvider;
