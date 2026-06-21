import { BrowserRouter } from "react-router-dom";

import { AppRoutes } from "./router/AppRoutes";

export function App() {
  return (
    <main className="min-h-screen bg-canvas text-body">
      <section className="mx-auto max-w-5xl p-6">
        <h1 className="text-2xl font-semibold">Zooming Indoor Design Tool</h1>
        <p className="mt-2 text-sm text-body-muted">
          Plan 001 execution bootstrap: React + TypeScript + Tailwind + theme
          pipeline.
        </p>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </section>
    </main>
  );
}
