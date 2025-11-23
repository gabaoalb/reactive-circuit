import type { Vector2d } from "konva/lib/types";

interface CalculateGeometryParams {
	pointA: Vector2d;
	pointB: Vector2d;
	symbolWidth: number;
}

interface Geometry {
	length: number;
	angle: number;
	midX: number;
	midY: number;
	gapStart: Vector2d;
	gapEnd: Vector2d;
}

export function calculateGeometry({
	pointA,
	pointB,
	symbolWidth
}: CalculateGeometryParams): Geometry {
	const dx = pointB.x - pointA.x;
	const dy = pointB.y - pointA.y;
	const length = Math.sqrt(dx * dx + dy * dy);
	const angle = (Math.atan2(dy, dx) * 180) / Math.PI;

	const midX = (pointA.x + pointB.x) / 2;
	const midY = (pointA.y + pointB.y) / 2;

	// Vetor unitário
	const uX = dx / length;
	const uY = dy / length;

	// Ponto onde o fio da esquerda para e começa o símbolo
	const gapStart = {
		x: midX - (uX * symbolWidth) / 2,
		y: midY - (uY * symbolWidth) / 2
	};

	// Ponto onde o símbolo termina e começa o fio da direita
	const gapEnd = {
		x: midX + (uX * symbolWidth) / 2,
		y: midY + (uY * symbolWidth) / 2
	};

	return { length, angle, midX, midY, gapStart, gapEnd };
}
