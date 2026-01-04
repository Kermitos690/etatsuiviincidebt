import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  document.body.innerHTML = `
    <div style="padding: 2rem; font-family: system-ui; text-align: center;">
      <h1 style="color: #ef4444;">Erreur de démarrage</h1>
      <p>L'élément racine n'a pas été trouvé.</p>
      <button onclick="window.location.reload()" style="padding: 0.5rem 1rem; margin-top: 1rem; cursor: pointer;">
        Recharger
      </button>
    </div>
  `;
} else {
  try {
    createRoot(rootElement).render(<App />);
  } catch (error) {
    console.error("Boot error:", error);
    rootElement.innerHTML = `
      <div style="padding: 2rem; font-family: system-ui; text-align: center;">
        <h1 style="color: #ef4444;">Erreur de démarrage</h1>
        <p>${error instanceof Error ? error.message : "Erreur inconnue"}</p>
        <button onclick="window.location.reload()" style="padding: 0.5rem 1rem; margin-top: 1rem; cursor: pointer;">
          Recharger
        </button>
      </div>
    `;
  }
}
