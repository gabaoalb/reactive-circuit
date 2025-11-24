import { useCanvas } from "../../context/canvas/useCanvas";
import { useCircuit } from "../../context/circuit/useCircuit";

function Header() {
	const { setMode, mode, drawComponent, setDrawComponent } = useCanvas();

	const { elements, errors, setErrors } = useCircuit();

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

	if (errors.length > 0) {
		alert(
			"Erros detectados no circuito! Verifique o console para mais detalhes."
		);
		console.error("Erros do circuito:", errors);
	}

	// --- VALIDAÇÃO DO CIRCUITO (Detectar Fechamento) ---
	const validateCircuit = () => {
		const newErrors: string[] = [];

		// 1. Mapa de Nós: "x,y" -> lista de componentes conectados ali
		const nodes = new Map<string, string[]>();

		// Helper para adicionar ao mapa
		const addNode = (x: number, y: number, componentLabel: string) => {
			// Usar toFixed(1) para evitar problemas de float, mas com o Snap eles devem ser idênticos
			const key = `${Math.round(x)},${Math.round(y)}`;
			if (!nodes.has(key)) nodes.set(key, []);
			nodes.get(key)?.push(componentLabel);
		};

		// Construir o Grafo
		elements.forEach((el) => {
			addNode(el.pointA.x, el.pointA.y, el.label!);
			addNode(el.pointB.x, el.pointB.y, el.label!);
		});

		// 2. Verificar "Nós Soltos" (Dangling Nodes)
		// Um nó deve ter pelo menos 2 conexões para corrente fluir (exceto se for terra/antena, mas em DC básico precisa de 2)
		nodes.forEach((connectedComps, location) => {
			if (connectedComps.length < 2) {
				newErrors.push(
					`Nó em (${location}) está aberto! Conectado apenas a: ${connectedComps.join(
						", "
					)}`
				);
			}
		});

		// 3. Verificar se tem loop fechado (Simplificado: Se não tem nós soltos e tem componentes, provavelmente tem loop)
		if (elements.length === 0) newErrors.push("O circuito está vazio.");

		setErrors(newErrors);

		if (newErrors.length === 0) {
			alert("Circuito Validado! Todos os terminais estão conectados.");
			// AQUI VOCÊ CHAMARIA O SOLVER MNA
		}
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
					marginRight: "10px",
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
			<button
				onClick={validateCircuit}
				style={{
					padding: "8px 16px",
					background: errors.length === 0 ? "green" : "red",
					color: "#fff",
					border: "1px solid #ccc",
					cursor: "pointer"
				}}
			>
				Validar o Circuito
			</button>
		</div>
	);
}

export default Header;
