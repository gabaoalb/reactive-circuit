import CanvasProvider from "./canvas/CanvasProvider";
import type { PropsWithChildren } from "react";
import CircuitProvider from "./circuit/CircuitProvider";

function RootProvider({ children }: PropsWithChildren<unknown>) {
	return (
		<CanvasProvider>
			<CircuitProvider>{children}</CircuitProvider>
		</CanvasProvider>
	);
}

export default RootProvider;
