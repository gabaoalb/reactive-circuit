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
import { formatPhysical } from "../domain/circuit";
import { CircuitCanvas } from "../editor/CircuitCanvas";
import { editorReducer, initialState } from "../editor/state";
import type { Tool } from "../editor/state";
import type { SimulationOutcome } from "../simulation/mna";
import { useSimulation } from "./useSimulation";
import type { AnalysisMode } from "./useSimulation";
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
  { tool: "capacitor", label: "Capacitor", icon: "⊣" },
  { tool: "inductor", label: "Indutor", icon: "∿" },
  { tool: "switch", label: "Chave", icon: "⤴" },
  { tool: "wire", label: "Fio", icon: "⌁" },
  { tool: "junction", label: "Junção", icon: "•" },
  { tool: "ground", label: "Terra", icon: "⏚" },
];
const instructions: Record<Tool, string> = {
  select:
    "Arraste o corpo para mover ou um terminal para esticar. A outra ponta fica fixa; Delete exclui a seleção.",
  resistor: "Clique na grade para adicionar um resistor de 1 kΩ.",
  voltage: "Clique na grade para adicionar uma fonte ideal de 5 V. Porta a = +; porta b = −.",
  capacitor: "addCapacitorHelp",
  inductor: "addInductorHelp",
  switch: "addSwitchHelp",
  wire: "Clique em um terminal ou junção, na grade para cotovelos e em outro terminal para concluir. Escape cancela.",
  junction: "Clique na grade para criar uma junção. Conecte os fios explicitamente a ela.",
  ground: "Clique em um terminal ou junção para definir a referência de 0 V.",
};
function Properties({
  component,
  onValue,
  onInitialValue,
  onToggle,
}: {
  component: Component;
  onValue: (value: number) => void;
  onInitialValue: (value: number) => void;
  onToggle: () => void;
}) {
  const { t } = useTranslation();
  const [input, setInput] = useState(String(component.value));
  const [initialInput, setInitialInput] = useState(
    String("initialValue" in component ? (component.initialValue ?? 0) : 0),
  );
  const reactive = component.kind === "capacitor" || component.kind === "inductor";
  const initial = Number(initialInput);
  const numeric = Number(input);
  const valid =
    input.trim() !== "" &&
    Number.isFinite(numeric) &&
    (component.kind === "voltage" || numeric > 0) &&
    (!reactive || (initialInput.trim() !== "" && Number.isFinite(initial)));
  if (component.kind === "switch")
    return (
      <>
        <h3>
          {component.name} <span>{t("Chave")}</span>
        </h3>
        <Button fullWidth variant="outlined" onClick={onToggle} aria-pressed={component.closed}>
          {t(component.closed ? "openSwitch" : "closeSwitch")}
        </Button>
        <p className="subtle">{t(component.closed ? "closed" : "open")}</p>
      </>
    );
  const labels = {
    resistor: "Resistência (Ω)",
    voltage: "Tensão (V)",
    capacitor: "capacitanceLabel",
    inductor: "inductanceLabel",
  };
  const names = {
    resistor: "Resistor",
    voltage: "Fonte de tensão",
    capacitor: "Capacitor",
    inductor: "Indutor",
  };
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (valid) {
          if (numeric !== component.value) onValue(numeric);
          if (reactive && initial !== component.initialValue) onInitialValue(initial);
        }
      }}
    >
      <h3>
        {component.name} <span>{t(names[component.kind])}</span>
      </h3>
      <TextField
        fullWidth
        size="small"
        label={t(labels[component.kind])}
        value={input}
        onChange={(event) => setInput(event.target.value)}
        error={!valid}
        helperText={
          !valid ? t("Informe um valor finito válido.") : t("Unidades SI; aceita notação como 1e3.")
        }
        slotProps={{ htmlInput: { inputMode: "decimal" } }}
      />
      {reactive && (
        <TextField
          fullWidth
          size="small"
          sx={{ mt: 2 }}
          label={t(component.kind === "capacitor" ? "initialVoltageLabel" : "initialCurrentLabel")}
          value={initialInput}
          onChange={(event) => setInitialInput(event.target.value)}
          error={initialInput.trim() === "" || !Number.isFinite(initial)}
          helperText={t("initialValueHelp")}
          slotProps={{ htmlInput: { inputMode: "decimal" } }}
        />
      )}
      <Button
        type="submit"
        variant="outlined"
        disabled={
          !valid ||
          (numeric === component.value && (!reactive || initial === (component.initialValue ?? 0)))
        }
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
        <p>{t("readyAnalysisHelp")}</p>
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
      {result.time === undefined && <Alert severity="success">{t("Solução DC encontrada")}</Alert>}
      {result.time !== undefined && (
        <p className="subtle" data-testid="simulation-time">
          {t("simulatedTime")}: {formatPhysical(result.time, "s", i18n.resolvedLanguage)}
        </p>
      )}
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
              <TableCell>{formatPhysical(c.voltage, "V", i18n.resolvedLanguage)}</TableCell>
              <TableCell>{formatPhysical(c.current, "A", i18n.resolvedLanguage)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <details>
        <summary>{t("Tensões dos nós")}</summary>
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
                <TableCell>{formatPhysical(v, "V", i18n.resolvedLanguage)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </details>
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
  const [analysisMode, setAnalysisMode] = useState<AnalysisMode>("transient");
  const simulation = useSimulation(state.document, state.simulationEpoch, analysisMode);
  const result = simulation.result;
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
              <p>{t("laboratorySubtitle")}</p>
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
            <Button variant="contained" onClick={simulation.toggle}>
              {t(
                analysisMode === "dc"
                  ? "▶ Simular"
                  : simulation.running
                    ? "pauseSimulation"
                    : result?.ok
                      ? "continueSimulation"
                      : "startSimulation",
              )}
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
              <h2>{t("simulationHeading")}</h2>
              <TextField
                select
                fullWidth
                size="small"
                label={t("analysisMode")}
                value={analysisMode}
                onChange={(event) => setAnalysisMode(event.target.value as AnalysisMode)}
                slotProps={{ select: { native: true } }}
              >
                <option value="transient">{t("transientAnalysis")}</option>
                <option value="dc">{t("dcAnalysis")}</option>
              </TextField>
              {analysisMode === "transient" && (
                <>
                  <TextField
                    select
                    fullWidth
                    size="small"
                    sx={{ mt: 2 }}
                    label={t("simulationSpeed")}
                    value={simulation.speed}
                    onChange={(event) => simulation.setSpeed(Number(event.target.value))}
                    slotProps={{ select: { native: true } }}
                  >
                    {[0.001, 0.01, 0.1].map((speed) => (
                      <option key={speed} value={speed}>
                        {new Intl.NumberFormat(i18n.resolvedLanguage).format(speed)}×
                      </option>
                    ))}
                  </TextField>
                  <p className="subtle" role="status">
                    {t(simulation.running ? "simulationRunning" : "simulationPaused")}
                  </p>
                  <Button
                    fullWidth
                    variant="outlined"
                    onClick={simulation.restart}
                    disabled={!state.document.components.length}
                  >
                    {t("restartSimulation")}
                  </Button>
                  {state.document.components
                    .filter((c) => c.kind === "switch")
                    .map((c) => (
                      <Button
                        key={c.id}
                        fullWidth
                        onClick={() => dispatch({ type: "toggle-switch", id: c.id })}
                        aria-pressed={c.closed}
                      >
                        {c.name}: {t(c.closed ? "openSwitch" : "closeSwitch")}
                      </Button>
                    ))}
                </>
              )}
            </section>
            <section className="side-section results-section">
              <h2>
                {t("Resultados")}
                <span>{analysisMode === "dc" ? "DC / MNA" : t("transientAnalysis")}</span>
              </h2>
              <Results result={result} />
            </section>
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
                  key={`${component.id}:${component.value}:${"initialValue" in component ? component.initialValue : ""}`}
                  component={component}
                  onValue={(value) => dispatch({ type: "value", id: component.id, value })}
                  onInitialValue={(value) =>
                    dispatch({ type: "initial-value", id: component.id, value })
                  }
                  onToggle={() => dispatch({ type: "toggle-switch", id: component.id })}
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
            <section className="side-section">
              <h2>{t("Circuito")}</h2>
              <div className="selection-actions">
                <Button size="small" onClick={() => dispatch({ type: "reset", example: false })}>
                  {t("Novo circuito")}
                </Button>
                <Button
                  size="small"
                  onClick={() => {
                    setAnalysisMode("transient");
                    dispatch({ type: "reset", example: true });
                  }}
                >
                  {t("loadRlcExample")}
                </Button>
                <Button
                  size="small"
                  onClick={() => {
                    setAnalysisMode("dc");
                    dispatch({ type: "reset", example: "dc" });
                  }}
                >
                  {t("loadDcExample")}
                </Button>
              </div>
              <p className="subtle">{t("simulationLimits")}</p>
              <p className="subtle">{t("timeStepHelp")}</p>
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
