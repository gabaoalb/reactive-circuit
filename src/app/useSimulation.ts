import { useCallback, useEffect, useRef, useState } from "react";
import type { CircuitDocument } from "../domain/circuit";
import { CircuitError } from "../simulation/graph";
import { simulateDc } from "../simulation/mna";
import type { SimulationOutcome } from "../simulation/mna";
import {
  electricalKey,
  initializeTransient,
  setTransientSwitch,
  stepTransient,
} from "../simulation/transient";
import type { TransientSession } from "../simulation/transient";

export type AnalysisMode = "dc" | "transient";

export function useSimulation(document: CircuitDocument, epoch: number, mode: AnalysisMode) {
  const session = useRef<TransientSession | null>(null);
  const previous = useRef<{ key: string; epoch: number; mode: AnalysisMode } | null>(null);
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(0.01);
  const [published, setPublished] = useState<{
    key: string;
    epoch: number;
    mode: AnalysisMode;
    result: SimulationOutcome;
  } | null>(null);
  const key = electricalKey(document);

  const publish = useCallback(
    (result: SimulationOutcome) => {
      setPublished({ key, epoch, mode, result });
    },
    [key, epoch, mode],
  );
  const fail = useCallback(
    (error: unknown) => {
      session.current = null;
      setRunning(false);
      if (!(error instanceof CircuitError)) throw error;
      publish({ ok: false, diagnostic: error.diagnostic });
    },
    [publish],
  );
  const initialize = useCallback(
    (play: boolean) => {
      try {
        session.current = initializeTransient(document);
        publish(session.current.snapshot);
        setRunning(play);
      } catch (error) {
        fail(error);
      }
    },
    [document, publish, fail],
  );

  useEffect(() => {
    const before = previous.current;
    previous.current = { key, epoch, mode };
    if (!before || before.epoch !== epoch) {
      session.current = null;
      setPublished(null);
      setRunning(false);
      if (mode === "transient" && document.components.length) initialize(true);
    } else if (before.key !== key || before.mode !== mode) {
      session.current = null;
      setRunning(false);
      setPublished(null);
    } else if (session.current) {
      try {
        let next = session.current;
        for (const c of document.components) {
          if (c.kind === "switch") next = setTransientSwitch(next, c.id, c.closed);
        }
        if (next !== session.current) {
          session.current = next;
          publish(next.snapshot);
        }
      } catch (error) {
        fail(error);
      }
    }
  }, [document, key, epoch, mode, initialize, publish, fail]);

  useEffect(() => {
    if (!running || mode !== "transient") return;
    let frame = 0;
    let last: number | null = null;
    let lastPublication = 0;
    let remainder = 0;
    const visibility = () => {
      last = null;
      remainder = 0;
    };
    function tick(now: number) {
      if (!session.current) return;
      if (globalThis.document.hidden) {
        last = null;
        frame = requestAnimationFrame(tick);
        return;
      }
      const elapsed = last === null ? 0 : Math.min(now - last, 100);
      last = now;
      remainder += (elapsed / 1000) * speed;
      const start = performance.now();
      try {
        while (remainder >= session.current.timeStep && performance.now() - start < 8) {
          session.current = stepTransient(session.current);
          remainder -= session.current.timeStep;
        }
        // Drop work exceeding the frame budget instead of accumulating a backlog.
        remainder %= session.current.timeStep;
        if (now - lastPublication >= 50) {
          publish(session.current.snapshot);
          lastPublication = now;
        }
      } catch (error) {
        fail(error);
        return;
      }
      frame = requestAnimationFrame(tick);
    }
    globalThis.document.addEventListener("visibilitychange", visibility);
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      globalThis.document.removeEventListener("visibilitychange", visibility);
    };
  }, [running, speed, mode, key, epoch, publish, fail]);

  function toggle() {
    if (mode === "dc") {
      publish(simulateDc(document));
      return;
    }
    if (running) {
      setRunning(false);
      if (session.current) publish(session.current.snapshot);
    } else if (session.current) setRunning(true);
    else initialize(true);
  }
  return {
    running,
    speed,
    setSpeed,
    toggle,
    restart: () => initialize(running),
    result:
      published?.key === key && published.epoch === epoch && published.mode === mode
        ? published.result
        : null,
  };
}
