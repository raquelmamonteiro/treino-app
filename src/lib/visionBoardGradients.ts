import type { VisionBoardGradientId } from "../types";

export const GRADIENT_CSS: Record<VisionBoardGradientId, string> = {
  purple: "linear-gradient(145deg, #7c3aed 0%, #a78bfa 100%)",
  green: "linear-gradient(145deg, #059669 0%, #34d399 100%)",
  blue: "linear-gradient(145deg, #2563eb 0%, #60a5fa 100%)",
  pink: "linear-gradient(145deg, #db2777 0%, #f472b6 100%)",
  gold: "linear-gradient(145deg, #d97706 0%, #fbbf24 100%)",
  dark: "linear-gradient(145deg, #1f1b2e 0%, #2d2540 100%)",
};

export const GRADIENT_LABELS: { id: VisionBoardGradientId; label: string }[] = [
  { id: "purple", label: "Roxo" },
  { id: "green", label: "Verde" },
  { id: "blue", label: "Azul" },
  { id: "pink", label: "Rosa" },
  { id: "gold", label: "Dourado" },
  { id: "dark", label: "Escuro" },
];
