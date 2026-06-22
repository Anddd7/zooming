import { BrowserRouter } from "react-router-dom";

import { AppRoutes } from "./router/AppRoutes";

export function App() {
  return (
    <main className="h-screen overflow-hidden bg-canvas text-body">
      <section className="mx-auto flex h-full min-h-0 max-w-5xl flex-col p-6">
        <h1 className="text-2xl font-semibold">Zooming Indoor Design Tool</h1>
        <p className="mt-2 text-sm text-body-muted">
          Plan 001 execution bootstrap: React + TypeScript + Tailwind + theme
          pipeline.
        </p>
        <div className="mt-4 min-h-0 flex-1 overflow-hidden">
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </div>
      </section>
    </main>
  );
}
