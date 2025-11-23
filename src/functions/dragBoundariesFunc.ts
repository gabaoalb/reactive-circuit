import type { Vector2d } from "konva/lib/types";

export function dragBoundariesFunc(pos: Vector2d) {
	let newX = pos.x;
	let newY = pos.y;

	// Define boundaries
	const minX = -window.innerWidth;
	const maxX = 0;
	const minY = -window.innerHeight;
	const maxY = 0;

	// Apply restrictions
	if (newX < minX) newX = minX;
	if (newX > maxX) newX = maxX;
	if (newY < minY) newY = minY;
	if (newY > maxY) newY = maxY;

	return {
		x: newX,
		y: newY
	};
}
