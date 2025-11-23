import { useCanvas } from "../../context/canvas/useCanvas";

function Header() {
	const { setMode, mode, component, setComponent } = useCanvas();

	const handleMoveClick = () => {
		setMode("move");
		setComponent(null);
	};

	const handleResistorClick = () => {
		setMode("draw");
		setComponent("resistor");
	};

	const handleVoltageSourceClick = () => {
		setMode("draw");
		setComponent("dcSource");
	};

	return (
		<div
			style={{
				padding: "10px",
				background: "#f0f0f0",
				borderBottom: "1px solid #ccc"
			}}
		>
			<button
				onClick={handleMoveClick}
				style={{
					marginRight: "10px",
					padding: "8px 16px",
					background: mode === "move" ? "#007bff" : "#fff",
					color: mode === "move" ? "#fff" : "#000",
					border: "1px solid #ccc",
					cursor: "pointer"
				}}
			>
				Mover
			</button>
			<button
				onClick={handleResistorClick}
				style={{
					marginRight: "10px",
					padding: "8px 16px",
					background: component === "resistor" ? "#007bff" : "#fff",
					color: component === "resistor" ? "#fff" : "#000",
					border: "1px solid #ccc",
					cursor: "pointer"
				}}
			>
				Resistor
			</button>
			<button
				onClick={handleVoltageSourceClick}
				style={{
					padding: "8px 16px",
					background: component === "dcSource" ? "#007bff" : "#fff",
					color: component === "dcSource" ? "#fff" : "#000",
					border: "1px solid #ccc",
					cursor: "pointer"
				}}
			>
				Fonte de Tensão
			</button>
		</div>
	);
}

export default Header;
