import type { CircuitElement, ComponentId } from "../types/circuit";

// Generic update function works for both types because 'x' and 'y' are common
export function updateElement(
	id: ComponentId,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	newAttrs: any,
	setElements: React.Dispatch<React.SetStateAction<CircuitElement[]>>
) {
	newAttrs = {
		...newAttrs,
		...("pointA" in newAttrs && {
			pointA: {
				x: newAttrs.pointA.x,
				y: newAttrs.pointA.y
			}
		}),
		...("pointB" in newAttrs && {
			pointB: {
				x: newAttrs.pointB.x,
				y: newAttrs.pointB.y
			}
		})
	};
	setElements((prev) =>
		prev.map((el) => (el.id === id ? { ...el, ...newAttrs } : el))
	);
}
