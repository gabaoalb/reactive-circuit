type SnapParams = {
	value: number;
	gridSize: number;
};

export function snapGrid({ value, gridSize }: SnapParams): number {
	return Math.round(value / gridSize) * gridSize;
}
