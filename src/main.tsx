import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

try {
  const t = localStorage.getItem("treino-theme");
  document.documentElement.dataset.theme = t === "light" ? "light" : "dark";
} catch {
  document.documentElement.dataset.theme = "dark";
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
