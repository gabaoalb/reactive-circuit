import { CircuitError } from "./graph";
export const PIVOT_TOLERANCE = 1e-12;
export const RESIDUAL_TOLERANCE = 1e-9;
export function solveLinearSystem(A: number[][], b: number[]): { x: number[]; residual: number } {
  const n = b.length;
  if (
    A.length !== n ||
    A.some((row) => row.length !== n) ||
    [...A.flat(), ...b].some((v) => !Number.isFinite(v))
  )
    throw new CircuitError("matrix", "Sistema linear inválido.");
  const rows = A.map((row, i) => {
    const scale = Math.max(...row.map(Math.abs)) || Math.abs(b[i]) || 1;
    return [...row.map((v) => v / scale), b[i] / scale];
  });
  const pivots: number[] = [];
  let rank = 0;
  for (let col = 0; col < n; col++) {
    let best = rank;
    for (let r = rank + 1; r < n; r++)
      if (Math.abs(rows[r][col]) > Math.abs(rows[best][col])) best = r;
    if (rank === n || Math.abs(rows[best][col]) <= PIVOT_TOLERANCE) continue;
    [rows[rank], rows[best]] = [rows[best], rows[rank]];
    for (let r = rank + 1; r < n; r++) {
      const factor = rows[r][col] / rows[rank][col];
      rows[r][col] = 0;
      for (let c = col + 1; c <= n; c++) rows[r][c] -= factor * rows[rank][c];
    }
    pivots.push(col);
    rank++;
  }
  for (let r = rank; r < n; r++)
    if (Math.abs(rows[r][n]) > PIVOT_TOLERANCE)
      throw new CircuitError(
        "inconsistent",
        "Restrições incompatíveis: verifique fontes em curto ou tensões contraditórias.",
      );
  if (rank < n)
    throw new CircuitError(
      "singular",
      "O circuito não tem solução única: verifique fontes redundantes e nós flutuantes.",
    );
  const x = Array<number>(n).fill(0);
  for (let r = n - 1; r >= 0; r--) {
    const col = pivots[r];
    let value = rows[r][n];
    for (let c = col + 1; c < n; c++) value -= rows[r][c] * x[c];
    x[col] = value / rows[r][col];
  }
  const normA = Math.max(0, ...A.map((row) => row.reduce((s, v) => s + Math.abs(v), 0)));
  const normX = Math.max(0, ...x.map(Math.abs));
  const normB = Math.max(0, ...b.map(Math.abs));
  const error = Math.max(
    0,
    ...A.map((row, i) => Math.abs(row.reduce((s, v, j) => s + v * x[j], 0) - b[i])),
  );
  const residual = error / (normA * normX + normB || 1);
  if (
    x.some((v) => !Number.isFinite(v)) ||
    !Number.isFinite(residual) ||
    residual > RESIDUAL_TOLERANCE
  )
    throw new CircuitError(
      "numerical",
      "Não foi possível obter uma solução numericamente confiável.",
    );
  return { x, residual };
}
