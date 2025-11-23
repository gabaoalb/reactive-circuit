import type { CircuitElement, ComponentId } from "../types/circuit";
import { snapGrid } from "./snapGrid";

// Generic update function works for both types because 'x' and 'y' are common
export function updateElement(
	id: ComponentId,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	newAttrs: any,
	gridSize: number,
	setElements: React.Dispatch<React.SetStateAction<CircuitElement[]>>
) {
	console.debug("newAttrs:", newAttrs);
	newAttrs = {
		...newAttrs,
		position: {
			x: snapGrid({ value: newAttrs.position.x, gridSize }),
			y: snapGrid({ value: newAttrs.position.y, gridSize })
		}
	};
	setElements((prev) =>
		prev.map((el) => (el.id === id ? { ...el, ...newAttrs } : el))
	);
}
