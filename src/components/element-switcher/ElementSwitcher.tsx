import { useCircuit } from "../../context/circuit/useCircuit";
import DCSourceShape from "../../shapes/dc-source/DCSourceShape";
import ResistorShape from "../../shapes/resistor/ResistorShape";

function ElementSwitcher() {
	const { elements } = useCircuit();

	return elements.map((el) => {
		if (el.kind === "resistor") {
			return <ResistorShape key={el.id} data={el} />;
		}
		if (el.kind === "dc-source") {
			return <DCSourceShape key={el.id} data={el} />;
		}
		return null;
	});
}

export default ElementSwitcher;
