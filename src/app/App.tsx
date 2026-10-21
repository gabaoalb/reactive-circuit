import { useEffect, useReducer, useState } from "react";
import {
  Alert,
  Button,
  Chip,
  CssBaseline,
  TextField,
  ThemeProvider,
  createTheme,
} from "@mui/material";
import type { Component } from "../domain/circuit";
import { CircuitCanvas } from "../editor/CircuitCanvas";
import { editorReducer, initialState } from "../editor/state";
import type { Tool } from "../editor/state";
import { simulateDc } from "../simulation/mna";
import type { SimulationOutcome } from "../simulation/mna";
import "../styles.css";

const theme = createTheme({
  palette: { primary: { main: "#146b66" }, background: { default: "#f3f6f5" } },
  typography: {
    fontFamily: '"Segoe UI", sans-serif',
    button: { textTransform: "none", fontWeight: 600 },
  },
  shape: { borderRadius: 8 },
});
const tools: { tool: Tool; label: string; icon: string }[] = [
  { tool: "select", label: "Selecionar", icon: "↖" },
  { tool: "resistor", label: "Resistor", icon: "▭" },
  { tool: "voltage", label: "Fonte DC", icon: "⊕" },
  { tool: "wire", label: "Fio", icon: "⌁" },
  { tool: "junction", label: "Junção", icon: "•" },
  { tool: "ground", label: "Terra", icon: "⏚" },
];
const instructions: Record<Tool, string> = {
  select: "Clique para selecionar. Arraste para mover; Delete exclui a seleção.",
  resistor: "Clique na grade para adicionar um resistor de 1 kΩ.",
  voltage: "Clique na grade para adicionar uma fonte ideal de 5 V. Porta a = +; porta b = −.",
  wire: "Clique em um terminal ou junção, na grade para cotovelos e em outro terminal para concluir. Escape cancela.",
  junction: "Clique na grade para criar uma junção. Conecte os fios explicitamente a ela.",
  ground: "Clique em um terminal ou junção para definir a referência de 0 V.",
};
const format = (value: number) =>
  Math.abs(value) < 1e-15 ? "0" : Number(value.toPrecision(6)).toString();

function Properties({
  component,
  onValue,
}: {
  component: Component;
  onValue: (value: number) => void;
}) {
  const [input, setInput] = useState(String(component.value));
  const numeric = Number(input);
  const valid =
    input.trim() !== "" &&
    Number.isFinite(numeric) &&
    (component.kind !== "resistor" || numeric > 0);
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (valid) onValue(numeric);
      }}
    >
      <h3>
        {component.name}{" "}
        <span>{component.kind === "resistor" ? "Resistor" : "Fonte de tensão"}</span>
      </h3>
      <TextField
        fullWidth
        size="small"
        label={component.kind === "resistor" ? "Resistência (Ω)" : "Tensão (V)"}
        value={input}
        onChange={(event) => setInput(event.target.value)}
        error={!valid}
        helperText={
          !valid ? "Informe um valor finito válido." : "Unidades SI; aceita notação como 1e3."
        }
        slotProps={{ htmlInput: { inputMode: "decimal" } }}
      />
      <Button
        type="submit"
        variant="outlined"
        disabled={!valid || numeric === component.value}
        fullWidth
      >
        Aplicar valor
      </Button>
      <p className="subtle">
        {component.kind === "voltage"
          ? "a (+) → b (−). Corrente positiva de a para b."
          : "Tensão Va − Vb; corrente positiva de a para b."}
      </p>
      <p className="subtle">Rotação: {component.rotation}°</p>
    </form>
  );
}
function Results({ result }: { result: SimulationOutcome | null }) {
  if (!result)
    return (
      <div className="results-placeholder">
        <strong>Pronto para analisar</strong>
        <p>Defina o terra e clique em Simular. Resultados são invalidados ao editar.</p>
      </div>
    );
  if (!result.ok)
    return (
      <Alert severity="error">
        {result.diagnostic.message}
        {result.diagnostic.elementIds.length > 0 && (
          <div className="diagnostic-ids">Elementos: {result.diagnostic.elementIds.join(", ")}</div>
        )}
      </Alert>
    );
  return (
    <>
      <Alert severity="success">Solução DC encontrada</Alert>
      <h3>Tensões dos nós</h3>
      <table>
        <thead>
          <tr>
            <th>Nó</th>
            <th>Tensão</th>
          </tr>
        </thead>
        <tbody>
          {result.voltages.map((v, i) => (
            <tr key={i}>
              <td>
                N{i}
                {i === 0 ? " · terra" : ""}
              </td>
              <td>{format(v)} V</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h3>
        Componentes <span>a → b</span>
      </h3>
      <table>
        <thead>
          <tr>
            <th>Nome</th>
            <th>Va − Vb</th>
            <th>Corrente</th>
          </tr>
        </thead>
        <tbody>
          {result.components.map((c) => (
            <tr key={c.id}>
              <td>{c.name}</td>
              <td>{format(c.voltage)} V</td>
              <td>{format(c.current)} A</td>
            </tr>
          ))}
        </tbody>
      </table>
      <details>
        <summary>Sistema MNA · A x = b</summary>
        <div className="matrix-scroll">
          <table>
            <thead>
              <tr>
                <th>Equação</th>
                {result.system.unknowns.map((name, i) => (
                  <th key={i}>{name}</th>
                ))}
                <th>b</th>
              </tr>
            </thead>
            <tbody>
              {result.system.A.map((row, i) => (
                <tr key={i}>
                  <th>{i + 1}</th>
                  {row.map((v, j) => (
                    <td key={j}>{format(v)}</td>
                  ))}
                  <td>{format(result.system.b[i])}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="subtle">x = [{result.x.map(format).join(", ")}]</p>
        <p className="subtle">Resíduo normalizado: {format(result.residual)}</p>
      </details>
      <p className="subtle">
        Correntes negativas indicam sentido oposto a a → b. Correntes individuais de fios ideais não
        são calculadas.
      </p>
    </>
  );
}
function App() {
  const [state, dispatch] = useReducer(editorReducer, undefined, initialState);
  const [analysis, setAnalysis] = useState<{ revision: number; result: SimulationOutcome } | null>(
    null,
  );
  const result = analysis?.revision === state.revision ? analysis.result : null;
  const component =
    state.selection?.kind === "component"
      ? state.document.components.find((c) => c.id === state.selection?.id)
      : undefined;
  useEffect(() => {
    function keydown(event: KeyboardEvent) {
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.closest("input,textarea,select") || target.isContentEditable)
      )
        return;
      if (event.key === "Escape") dispatch({ type: "cancel" });
      if (event.key === "Delete") {
        event.preventDefault();
        dispatch({ type: "delete" });
      }
    }
    window.addEventListener("keydown", keydown);
    return () => window.removeEventListener("keydown", keydown);
  }, []);
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <div className="app-shell">
        <header className="app-header">
          <div className="brand">
            <span className="brand-mark">⌁</span>
            <div>
              <h1>Reactive Circuit</h1>
              <p>Laboratório de circuitos · análise DC</p>
            </div>
          </div>
          <div className="header-actions">
            <Chip label="100% no navegador" size="small" variant="outlined" />
            <Button
              variant="contained"
              onClick={() =>
                setAnalysis({ revision: state.revision, result: simulateDc(state.document) })
              }
            >
              ▶ Simular
            </Button>
          </div>
        </header>
        <main className="workspace">
          <section className="editor-panel" aria-label="Área de edição">
            <div className="toolbar" role="toolbar" aria-label="Ferramentas do circuito">
              {tools.map(({ tool, label, icon }) => (
                <Button
                  key={tool}
                  variant={state.tool === tool ? "contained" : "text"}
                  aria-pressed={state.tool === tool}
                  onClick={() => dispatch({ type: "tool", tool })}
                >
                  <span className="tool-icon" aria-hidden="true">
                    {icon}
                  </span>
                  {label}
                </Button>
              ))}
            </div>
            <div className="instruction" role="status">
              {instructions[state.tool]}
              {state.draft && <strong> · Fio em andamento</strong>}
            </div>
            <CircuitCanvas state={state} dispatch={dispatch} result={result} />
            <footer className="editor-footer">
              <span>
                {state.document.components.length} componentes · {state.document.wires.length} fios
                · grade 20 px
              </span>
              <span>Junções explícitas · cruzamentos não conectam</span>
            </footer>
          </section>
          <aside className="sidebar">
            <section className="side-section">
              <h2>Propriedades</h2>
              {component ? (
                <Properties
                  key={`${component.id}:${component.value}`}
                  component={component}
                  onValue={(value) => dispatch({ type: "value", id: component.id, value })}
                />
              ) : (
                <p className="subtle">
                  {state.selection
                    ? `${state.selection.kind === "wire" ? "Fio" : "Junção"} selecionado. Use Excluir para removê-lo.`
                    : "Selecione um componente para editar seu valor."}
                </p>
              )}
              <div className="selection-actions">
                <Button
                  size="small"
                  variant="outlined"
                  disabled={!component}
                  onClick={() => dispatch({ type: "rotate" })}
                >
                  Girar 90°
                </Button>
                <Button
                  size="small"
                  color="error"
                  disabled={!state.selection}
                  onClick={() => dispatch({ type: "delete" })}
                >
                  Excluir
                </Button>
              </div>
            </section>
            <section className="side-section results-section" aria-live="polite">
              <h2>
                Resultados <span>DC / MNA</span>
              </h2>
              <Results result={result} />
            </section>
            <section className="side-section">
              <h2>Circuito</h2>
              <div className="selection-actions">
                <Button size="small" onClick={() => dispatch({ type: "reset", example: false })}>
                  Novo circuito
                </Button>
                <Button size="small" onClick={() => dispatch({ type: "reset", example: true })}>
                  Carregar exemplo
                </Button>
              </div>
              <p className="subtle">
                Modelo ideal, linear e em regime permanente. Dados apenas em memória: recarregar a
                página reinicia o circuito.
              </p>
              <details>
                <summary>Ajuda de conexão</summary>
                <p className="subtle">
                  As duas portas de cada símbolo são a e b, respectivamente à esquerda e à direita
                  antes da rotação. Para ramificar, coloque uma junção e termine cada fio nela.
                  Pontas sobrepostas não conectam automaticamente.
                </p>
                <p className="subtle">
                  Escape cancela a ferramenta. Delete exclui a seleção. Escolha Terra e clique em um
                  ponto para marcar 0 V.
                </p>
              </details>
            </section>
          </aside>
        </main>
        <footer className="app-footer">
          REACTIVE CIRCUIT <span>Desenhe. Conecte. Analise.</span>
        </footer>
      </div>
    </ThemeProvider>
  );
}
export default App;
