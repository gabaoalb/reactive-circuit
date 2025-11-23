import { createContext } from "react";
import type { CircuitStateContext } from "./interface";

export const CircuitContext = createContext<CircuitStateContext | null>(null);
