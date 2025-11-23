export function cursorStyle(mode: string): string {
	switch (mode) {
		case "move":
			return "move";
		case "draw":
			return "crosshair";
		case "select":
			return "default";
		default:
			return "default";
	}
}
