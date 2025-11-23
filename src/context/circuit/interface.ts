import type { CircuitElement } from "../../types/circuit";

export interface CircuitStateContext {
	elements: CircuitElement[];
	setElements: React.Dispatch<React.SetStateAction<CircuitElement[]>>;
}
