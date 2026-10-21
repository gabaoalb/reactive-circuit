import { alpha, createTheme } from "@mui/material/styles";
import type { Palette, PaletteMode } from "@mui/material";

function createAppTheme(mode: PaletteMode) {
  return createTheme({
    palette: {
      mode,
      ...(mode === "dark"
        ? {
            primary: { main: "#75d9c8", contrastText: "#082b26" },
            secondary: { main: "#a7c8f2" },
            background: { default: "#0d171c", paper: "#17252c" },
            text: { primary: "#e2edf0", secondary: "#a3b8c0" },
            divider: "#2c4049",
            success: { main: "#7ed6aa" },
            warning: { main: "#f4ba75" },
            error: { main: "#ff9b9b" },
          }
        : {
            primary: { main: "#146b66", contrastText: "#ffffff" },
            secondary: { main: "#356da8" },
            background: { default: "#f3f6f5", paper: "#ffffff" },
            text: { primary: "#173f48", secondary: "#526e76" },
            divider: "#d4dfdc",
            success: { main: "#147552" },
            warning: { main: "#ac5d00" },
            error: { main: "#b83232" },
          }),
    },
    typography: {
      fontFamily: '"Segoe UI", sans-serif',
      button: { textTransform: "none", fontWeight: 600 },
    },
    shape: { borderRadius: 8 },
    components: {
      MuiCssBaseline: { styleOverrides: { body: { fontSynthesis: "none" } } },
      MuiPaper: {
        defaultProps: { elevation: 0 },
        styleOverrides: { root: { backgroundImage: "none" } },
      },
      MuiButton: { defaultProps: { disableElevation: true } },
      MuiTable: { defaultProps: { size: "small" } },
      MuiTableCell: {
        styleOverrides: {
          root: {
            padding: "8px 6px",
            fontSize: 11,
            whiteSpace: "nowrap",
            fontVariantNumeric: "tabular-nums",
          },
          head: ({ theme }) => ({ color: theme.palette.text.secondary, fontWeight: 500 }),
        },
      },
    },
  });
}

export const themes = { light: createAppTheme("light"), dark: createAppTheme("dark") };

/** Canvas primitives need concrete colors rather than CSS variables. */
export function circuitColors(palette: Palette) {
  return {
    background: palette.background.default,
    symbol: palette.text.primary,
    muted: palette.text.secondary,
    wire: palette.primary.main,
    terminal: palette.primary.light,
    selection: palette.warning.main,
    ground: palette.success.main,
    grid: alpha(palette.text.primary, 0.12),
  };
}
