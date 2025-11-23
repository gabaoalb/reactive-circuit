export function cursorStyle(mode: string): string {
	switch (mode) {
		case "move":
			return "grab";
		case "draw":
			return "crosshair";
		case "select":
			return "default";
		default:
			return "default";
	}
}
