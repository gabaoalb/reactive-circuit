import { createContext } from "react";
import type { CanvasStateContext } from "./interface";

export const CanvasContext = createContext<CanvasStateContext | null>(null);
