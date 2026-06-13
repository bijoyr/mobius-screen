import { createTheme, type MantineColorsTuple } from "@mantine/core";

// Nebius brand palette (from the official brand sheet):
//   Canary    #E0FF4F  — primary accent (bright lime-yellow)
//   Blue Whale #052B42  — deep navy, dark-theme surfaces
//   White     #FFFFFF

const canary: MantineColorsTuple = [
  "#fbffe6",
  "#f5ffc2",
  "#eeff99",
  "#e8ff73",
  "#e4ff5f",
  "#e0ff4f", // 5 — brand Canary (primary shade)
  "#c8e633",
  "#a8c220",
  "#859913",
  "#5e6e08",
];

// Mantine dark scheme surfaces, retuned to the Blue Whale navy family.
// dark[7] is the body background; 6 is slightly elevated (header/cards), 8/9 deeper.
const blueWhale: MantineColorsTuple = [
  "#c9d6df",
  "#9fb3c0",
  "#7993a3",
  "#577387",
  "#3a586c",
  "#234458",
  "#0a3a52", // 6 — elevated surface
  "#052b42", // 7 — body background (Blue Whale)
  "#04222f",
  "#02161f",
];

export const theme = createTheme({
  primaryColor: "canary",
  // Canary is luminous; index 5 is the brand tone in both schemes.
  primaryShade: { light: 6, dark: 5 },
  // Auto-pick dark text on the light Canary fills (buttons/badges stay legible).
  autoContrast: true,
  luminanceThreshold: 0.4,
  colors: { canary, dark: blueWhale },
  fontFamily: "var(--font-manrope), system-ui, -apple-system, sans-serif",
  headings: {
    fontFamily: "var(--font-manrope), system-ui, -apple-system, sans-serif",
    fontWeight: "700",
  },
  defaultRadius: "md",
});
