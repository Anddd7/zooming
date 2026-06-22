import { BrowserRouter } from "react-router-dom";

import { AppRoutes } from "./router/AppRoutes";

export function App() {
  return (
    <main className="relative h-screen w-screen overflow-hidden bg-canvas text-body">
      <div className="pointer-events-none absolute bottom-3 right-4 z-20 text-xl font-semibold tracking-[0.35em] text-ink-muted-48">
        ZOOMING
      </div>
      <section className="flex h-full min-h-0 w-full flex-col">
        <div className="min-h-0 flex-1 overflow-hidden">
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </div>
      </section>
    </main>
  );
}
