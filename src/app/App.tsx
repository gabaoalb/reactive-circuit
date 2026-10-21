import { useTranslation } from "react-i18next";
import { useEffect, useReducer, useState } from "react";
import {
  Alert,
  Button,
  IconButton,
  Tooltip,
  CssBaseline,
  TextField,
  ThemeProvider,
  Paper,
  FormControl,
  FormLabel,
  FormControlLabel,
  Radio,
  RadioGroup,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from "@mui/material";
import type { Component } from "../domain/circuit";
import { CircuitCanvas } from "../editor/CircuitCanvas";
import { editorReducer, initialState } from "../editor/state";
import type { Tool } from "../editor/state";
import { simulateDc } from "../simulation/mna";
import type { SimulationOutcome } from "../simulation/mna";
import LightModeIcon from "@mui/icons-material/LightMode";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import { blue, yellow } from "@mui/material/colors";
import { themes } from "../theme";
import { useThemePreference } from "./useThemePreference";
import { AppShell } from "./AppShell";
const tools: { tool: Tool; label: string; icon: string }[] = [
  { tool: "select", label: "Selecionar", icon: "↖" },
  { tool: "resistor", label: "Resistor", icon: "▭" },
  { tool: "voltage", label: "Fonte DC", icon: "⊕" },
  { tool: "wire", label: "Fio", icon: "⌁" },
  { tool: "junction", label: "Junção", icon: "•" },
  { tool: "ground", label: "Terra", icon: "⏚" },
];
const instructions: Record<Tool, string> = {
  select:
    "Arraste o corpo para mover ou um terminal para esticar. A outra ponta fica fixa; Delete exclui a seleção.",
  resistor: "Clique na grade para adicionar um resistor de 1 kΩ.",
  voltage: "Clique na grade para adicionar uma fonte ideal de 5 V. Porta a = +; porta b = −.",
  wire: "Clique em um terminal ou junção, na grade para cotovelos e em outro terminal para concluir. Escape cancela.",
  junction: "Clique na grade para criar uma junção. Conecte os fios explicitamente a ela.",
  ground: "Clique em um terminal ou junção para definir a referência de 0 V.",
};
function Properties({
  component,
  onValue,
}: {
  component: Component;
  onValue: (value: number) => void;
}) {
  const { t } = useTranslation();
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
        <span>{component.kind === "resistor" ? t("Resistor") : t("Fonte de tensão")}</span>
      </h3>
      <TextField
        fullWidth
        size="small"
        label={component.kind === "resistor" ? t("Resistência (Ω)") : t("Tensão (V)")}
        value={input}
        onChange={(event) => setInput(event.target.value)}
        error={!valid}
        helperText={
          !valid ? t("Informe um valor finito válido.") : t("Unidades SI; aceita notação como 1e3.")
        }
        slotProps={{ htmlInput: { inputMode: "decimal" } }}
      />
      <Button
        type="submit"
        variant="outlined"
        disabled={!valid || numeric === component.value}
        fullWidth
      >
        {t("Aplicar valor")}
      </Button>
      <p className="subtle">
        {component.kind === "voltage"
          ? t("a (+) → b (−). Corrente positiva de a para b.")
          : t("Tensão Va − Vb; corrente positiva de a para b.")}
      </p>
      <p className="subtle">{t("rotation", { value: Number(component.rotation.toFixed(2)) })}</p>
    </form>
  );
}
function Results({ result }: { result: SimulationOutcome | null }) {
  const { t, i18n } = useTranslation();
  const format = (value: number) =>
    new Intl.NumberFormat(i18n.resolvedLanguage, { maximumSignificantDigits: 6 }).format(
      Math.abs(value) < 1e-15 ? 0 : value,
    );
  if (!result)
    return (
      <div className="results-placeholder">
        <strong>{t("Pronto para analisar")}</strong>
        <p>{t("Defina o terra e clique em Simular. Resultados são invalidados ao editar.")}</p>
      </div>
    );
  if (!result.ok)
    return (
      <Alert severity="error">
        {t(`diagnostic_${result.diagnostic.code}`, { defaultValue: result.diagnostic.message })}
        {result.diagnostic.elementIds.length > 0 && (
          <div className="diagnostic-ids">
            {t("elements", { ids: result.diagnostic.elementIds.join(", ") })}
          </div>
        )}
      </Alert>
    );
  return (
    <>
      <Alert severity="success">{t("Solução DC encontrada")}</Alert>
      <h3>{t("Tensões dos nós")}</h3>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>{t("Nó")}</TableCell>
            <TableCell>{t("Tensão")}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {result.voltages.map((v, i) => (
            <TableRow key={i}>
              <TableCell>
                N{i}
                {i === 0 ? t("groundSuffix") : ""}
              </TableCell>
              <TableCell>{format(v)} V</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <h3>
        {t("Componentes")}
        <span>a → b</span>
      </h3>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>{t("Nome")}</TableCell>
            <TableCell>Va − Vb</TableCell>
            <TableCell>{t("Corrente")}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {result.components.map((c) => (
            <TableRow key={c.id}>
              <TableCell>{c.name}</TableCell>
              <TableCell>{format(c.voltage)} V</TableCell>
              <TableCell>{format(c.current)} A</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <details>
        <summary>{t("Sistema MNA · A x = b")}</summary>
        <div className="matrix-scroll">
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>{t("Equação")}</TableCell>
                {result.system.unknowns.map((name, i) => (
                  <TableCell key={i}>{name}</TableCell>
                ))}
                <TableCell>b</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {result.system.A.map((row, i) => (
                <TableRow key={i}>
                  <TableCell>{i + 1}</TableCell>
                  {row.map((v, j) => (
                    <TableCell key={j}>{format(v)}</TableCell>
                  ))}
                  <TableCell>{format(result.system.b[i])}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <p className="subtle">x = [{result.x.map(format).join(", ")}]</p>
        <p className="subtle">{t("residual", { value: format(result.residual) })}</p>
      </details>
      <p className="subtle">
        {t(
          "Correntes negativas indicam sentido oposto a a → b. Correntes individuais de fios ideais não são calculadas.",
        )}
      </p>
    </>
  );
}
function App() {
  const { mode, toggleTheme } = useThemePreference();
  const { t, i18n } = useTranslation();
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
    <ThemeProvider theme={themes[mode]}>
      <CssBaseline enableColorScheme />
      <AppShell>
        <header className="app-header">
          <div className="brand">
            <span className="brand-mark">⌁</span>
            <div>
              <h1>Reactive Circuit</h1>
              <p>{t("Laboratório de circuitos · análise DC")}</p>
            </div>
          </div>
          <div className="header-actions">
            <TextField
              select
              size="small"
              label={t("language")}
              value={i18n.resolvedLanguage}
              onChange={(event) => {
                void i18n.changeLanguage(event.target.value);
              }}
              slotProps={{ select: { native: true } }}
            >
              <option value="pt-BR">Português (Brasil)</option>
              <option value="en">English</option>
              <option value="es">Español</option>
            </TextField>
            <Tooltip title={t(mode === "dark" ? "switchToLightTheme" : "switchToDarkTheme")}>
              <IconButton
                onClick={toggleTheme}
                aria-label={t(mode === "dark" ? "switchToLightTheme" : "switchToDarkTheme")}
                sx={{
                  color: mode === "dark" ? yellow[600] : blue[700],
                  border: 1,
                  borderColor: "divider",
                  borderRadius: 2,
                }}
              >
                {mode === "dark" ? <LightModeIcon /> : <DarkModeIcon />}
              </IconButton>
            </Tooltip>
            <Button
              variant="contained"
              onClick={() =>
                setAnalysis({ revision: state.revision, result: simulateDc(state.document) })
              }
            >
              {t("▶ Simular")}
            </Button>
          </div>
        </header>
        <main className="workspace">
          <Paper component="section" className="editor-panel" aria-label={t("Área de edição")}>
            <div className="toolbar" role="toolbar" aria-label={t("Ferramentas do circuito")}>
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
                  {t(label)}
                </Button>
              ))}
            </div>
            <div className="instruction" role="status">
              {t(instructions[state.tool])}
              {state.draft && <strong>{t(" · Fio em andamento")}</strong>}
            </div>
            <CircuitCanvas state={state} dispatch={dispatch} result={result} />
            <footer className="editor-footer">
              <span>
                {t("counts", {
                  components: state.document.components.length,
                  wires: state.document.wires.length,
                })}
              </span>
              <span>{t("Junções explícitas · cruzamentos não conectam")}</span>
            </footer>
          </Paper>
          <Paper component="aside" className="sidebar">
            <section className="side-section">
              <FormControl className="move-options">
                <FormLabel id="move-connections-label">{t("Ao mover o componente")}</FormLabel>
                <RadioGroup
                  aria-labelledby="move-connections-label"
                  name="move-connections"
                  value={state.moveConnections}
                  onChange={(event) =>
                    dispatch({
                      type: "move-connections",
                      value: event.target.value === "detach" ? "detach" : "keep",
                    })
                  }
                >
                  <FormControlLabel
                    value="keep"
                    control={<Radio size="small" />}
                    label={t("Manter conexões")}
                  />
                  <FormControlLabel
                    value="detach"
                    control={<Radio size="small" />}
                    label={t("Desconectar ao mover")}
                  />
                </RadioGroup>
              </FormControl>
              <p className="subtle">
                {state.moveConnections === "keep"
                  ? t("Os fios acompanham o movimento do corpo.")
                  : t("Os fios ficam no lugar, com junções nas pontas antigas.")}{" "}
                {state.moveConnections === "keep"
                  ? t("Arrastar um terminal também mantém suas conexões.")
                  : t("Arrastar um terminal desconecta apenas a ponta movida.")}
              </p>
            </section>
            <section className="side-section">
              <h2>{t("Propriedades")}</h2>
              {component ? (
                <Properties
                  key={`${component.id}:${component.value}`}
                  component={component}
                  onValue={(value) => dispatch({ type: "value", id: component.id, value })}
                />
              ) : (
                <p className="subtle">
                  {state.selection
                    ? t(state.selection.kind === "wire" ? "selectedWire" : "selectedJunction")
                    : t("Selecione um componente para editar seu valor.")}
                </p>
              )}
              <div className="selection-actions">
                <Button
                  size="small"
                  variant="outlined"
                  disabled={!component}
                  onClick={() => dispatch({ type: "rotate" })}
                >
                  {t("Girar 90°")}
                </Button>
                <Button
                  size="small"
                  color="error"
                  disabled={!state.selection}
                  onClick={() => dispatch({ type: "delete" })}
                >
                  {t("Excluir")}
                </Button>
              </div>
            </section>
            <section className="side-section results-section" aria-live="polite">
              <h2>
                {t("Resultados")}
                <span>DC / MNA</span>
              </h2>
              <Results result={result} />
            </section>
            <section className="side-section">
              <h2>{t("Circuito")}</h2>
              <div className="selection-actions">
                <Button size="small" onClick={() => dispatch({ type: "reset", example: false })}>
                  {t("Novo circuito")}
                </Button>
                <Button size="small" onClick={() => dispatch({ type: "reset", example: true })}>
                  {t("Carregar exemplo")}
                </Button>
              </div>
              <p className="subtle">
                {t(
                  "Modelo ideal, linear e em regime permanente. Dados apenas em memória: recarregar a página reinicia o circuito.",
                )}
              </p>
              <details>
                <summary>{t("Ajuda de conexão")}</summary>
                <p className="subtle">
                  {t(
                    "As duas portas de cada símbolo são a e b, respectivamente à esquerda e à direita antes da rotação. Para ramificar, coloque uma junção e termine cada fio nela. Pontas sobrepostas não conectam automaticamente.",
                  )}
                </p>
                <p className="subtle">
                  {t(
                    "Escape cancela a ferramenta. Delete exclui a seleção. Escolha Terra e clique em um ponto para marcar 0 V.",
                  )}
                </p>
              </details>
            </section>
          </Paper>
        </main>
        <footer className="app-footer">
          REACTIVE CIRCUIT <span>{t("Desenhe. Conecte. Analise.")}</span>
        </footer>
      </AppShell>
    </ThemeProvider>
  );
}
export default App;
