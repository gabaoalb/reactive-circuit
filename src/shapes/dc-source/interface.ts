import type { ComponentId } from "../../types/circuit";

// -- DC Source (Nova definição) --
interface DCSourceData {
	id: ComponentId;
	kind: "dc-source";
	x: number;
	y: number;
	rotation: number;
	voltage: number;
	label: string;
}

export interface DCSourceProps {
	data: DCSourceData;
	onUpdate: (id: ComponentId, newAttrs: Partial<DCSourceData>) => void;
}
