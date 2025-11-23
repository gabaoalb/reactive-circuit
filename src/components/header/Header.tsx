import { useCanvas } from "../../context/canvas/useCanvas";

function Header() {
	const { setMode, mode, drawComponent, setDrawComponent } = useCanvas();

	const handleMoveClick = () => {
		setMode("move");
		setDrawComponent(null);
	};

	const handleResistorClick = () => {
		setMode("draw");
		setDrawComponent("resistor");
	};

	const handleVoltageSourceClick = () => {
		setMode("draw");
		setDrawComponent("dc-source");
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
					background:
						drawComponent === "resistor" ? "#007bff" : "#fff",
					color: drawComponent === "resistor" ? "#fff" : "#000",
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
					background:
						drawComponent === "dc-source" ? "#007bff" : "#fff",
					color: drawComponent === "dc-source" ? "#fff" : "#000",
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
