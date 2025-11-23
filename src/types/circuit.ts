import type { Vector2d } from "konva/lib/types";

export type ComponentId = string & { readonly brand: unique symbol };
export type NodeId = string & { readonly brand: unique symbol };

export type TerminalType = "positive" | "negative";

export type Mode = "move" | "draw" | "select" | "erase";

export interface BaseComponent {
	id: ComponentId;
	pointA: Vector2d;
	pointB: Vector2d;
	rotation: number; // in degrees
	label?: string;
}

export interface Resistor extends BaseComponent {
	kind: "resistor";
	resistance: number; // in ohms
}

export interface Capacitor extends BaseComponent {
	kind: "capacitor";
	capacitance: number; // in farads
}

export interface Inductor extends BaseComponent {
	kind: "inductor";
	inductance: number; // in henrys
}

export interface DCSource extends BaseComponent {
	kind: "dcSource";
	voltage: number; // in volts
}

export interface Wire extends BaseComponent {
	kind: "wire";
	startNode: NodeId;
	endNode: NodeId;
}

export type CircuitElement = Resistor | Capacitor | Inductor | DCSource | Wire;

// === Estrutura do Grafo (Netlist) ===

// Representa um Nó elétrico (uma linha da sua matriz MNA)
export interface CircuitNode {
	id: NodeId;
	isGround: boolean; // Essencial para MNA (nó de referência)
	connectedComponents: Array<{
		componentId: ComponentId;
		terminal: TerminalType;
	}>;
}

// Representa uma aresta do grafo (O componente elétrico em si)
export interface GraphEdge<T extends CircuitElement> {
	component: T;
	// Mapeia os terminais do componente para os Nós do circuito
	// Ex: { p: Node1, n: Node0 }
	nodes: Record<TerminalType, NodeId>;
}

// A estrutura final que seu solver vai receber
export interface CircuitGraph {
	nodes: Map<NodeId, CircuitNode>;
	edges: GraphEdge<CircuitElement>[];
}

export class CircuitBuilder {
	private elements: CircuitElement[];
	private wires: Wire[];

	constructor(elements: CircuitElement[], wires: Wire[]) {
		this.elements = elements;
		this.wires = wires;
	}

	public buildGraph(): CircuitGraph {
		// 1. Identificar todos os "Terminais Físicos" (Portas dos componentes)
		// 2. Usar os Fios (Wires) para descobrir quais terminais estão conectados.
		//    - Se Fio conecta R1.p e R2.n, então R1.p e R2.n pertencem ao mesmo NodeId.
		// 3. Agrupar terminais conectados em um único CircuitNode.

		const graph: CircuitGraph = {
			nodes: new Map(),
			edges: []
		};

		// Lógica simplificada (Pseudocódigo/Typescript):
		// Para cada componente, crie uma Edge
		this.elements.forEach((el) => {
			graph.edges.push({
				component: el,
				nodes: {
					// Aqui você precisa buscar qual NodeId foi atribuído
					// a este terminal após processar os fios
					positive: this.resolveNodeId(el.id, "positive"),
					negative: this.resolveNodeId(el.id, "negative")
				}
			});
		});

		return graph;
	}

	private resolveNodeId(compId: ComponentId, term: TerminalType): NodeId {
		// Lógica de Union-Find para retornar o ID do nó elétrico
		console.log("Resolving NodeId for", compId, term);
		return "node_1" as NodeId; // placeholder
	}
}
