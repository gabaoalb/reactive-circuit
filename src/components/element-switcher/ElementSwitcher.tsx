import { useCircuit } from "../../context/circuit/useCircuit";
import { updateElement } from "../../functions/updateElement";
import ResistorShape from "../../shapes/resistor/ResistorShape";
import type { ComponentId } from "../../types/circuit";

function ElementSwitcher() {
	const { elements, setElements } = useCircuit();

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const handleUpdate = (id: ComponentId, newAttrs: any) => {
		return updateElement(id, newAttrs, setElements);
	};

	return elements.map((el) => {
		if (el.kind === "resistor") {
			return (
				<ResistorShape key={el.id} data={el} onUpdate={handleUpdate} />
			);
		}
		return null;
	});
}

export default ElementSwitcher;
