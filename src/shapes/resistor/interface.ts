import type { ComponentId, Resistor } from "../../types/circuit";

// -- Resistor --
export interface ResistorProps {
	data: Resistor;
	onUpdate: (id: ComponentId, newAttrs: Partial<Resistor>) => void;
}
