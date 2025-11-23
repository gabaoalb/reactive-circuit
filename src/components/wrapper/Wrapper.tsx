import { useEffect, useRef } from "react";
import { useCanvas } from "../../context/canvas/useCanvas";

function Wrapper({ children }: { children: React.ReactNode }) {
	const wrapperRef = useRef<HTMLDivElement | null>(null);

	const { isDrawing, setIsDrawing, setMode, setComponent } = useCanvas();

	const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
		if (e.key === "Escape" && isDrawing) {
			setIsDrawing(false);
			setComponent(null);
			setMode("move");
			e.preventDefault();
		}

		if (e.key === "v") {
			setMode("draw");
			setComponent("dcSource");
			setIsDrawing(true);
			e.preventDefault();
		}
		if (e.key === "r") {
			setMode("draw");
			setComponent("resistor");
			setIsDrawing(true);
			e.preventDefault();
		}
	};

	useEffect(() => {
		// focus the div on mount
		wrapperRef.current?.focus();
	}, []);

	return (
		<div ref={wrapperRef} tabIndex={0} onKeyDown={handleKeyDown}>
			{children}
		</div>
	);
}

export default Wrapper;
