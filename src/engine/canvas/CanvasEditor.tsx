import { useEffect, useRef, useState } from "react";

import { drawGrid } from "./grid/GridRenderer";

const DEFAULT_WIDTH = 960;
const DEFAULT_HEIGHT = 480;
const MIN_ZOOM = 0.4;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.1;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function CanvasEditor() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const [pan, setPan] = useState({ offsetX: 0, offsetY: 0 });
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const context = canvas.getContext("2d");

    if (!context) {
      return;
    }

    context.clearRect(0, 0, canvas.width, canvas.height);
    drawGrid(context, {
      width: canvas.width,
      height: canvas.height,
      pan,
      scale: zoom,
      spacingMm: 100,
    });
  }, [pan, zoom]);

  return (
    <section
      data-testid="editor-canvas"
      className="mt-4 min-h-[420px] rounded-md border border-hairline bg-canvas-parchment"
      aria-label="2D canvas editor area"
    >
      <div className="p-2 text-xs text-ink-muted-48">
        <span>pan: {Math.round(pan.offsetX)}, {Math.round(pan.offsetY)}</span>
        <span className="ml-3">zoom: {zoom.toFixed(2)}x</span>
      </div>
      <canvas
        ref={canvasRef}
        data-testid="editor-canvas-surface"
        width={DEFAULT_WIDTH}
        height={DEFAULT_HEIGHT}
        className="block w-full"
        onMouseDown={(event) => {
          if (event.button !== 0) {
            return;
          }

          dragStartRef.current = { x: event.clientX, y: event.clientY };
        }}
        onMouseMove={(event) => {
          const dragStart = dragStartRef.current;

          if (!dragStart) {
            return;
          }

          const deltaX = event.clientX - dragStart.x;
          const deltaY = event.clientY - dragStart.y;

          setPan((currentPan) => ({
            offsetX: currentPan.offsetX + deltaX,
            offsetY: currentPan.offsetY + deltaY,
          }));
          dragStartRef.current = { x: event.clientX, y: event.clientY };
        }}
        onMouseUp={() => {
          dragStartRef.current = null;
        }}
        onMouseLeave={() => {
          dragStartRef.current = null;
        }}
        onWheel={(event) => {
          event.preventDefault();

          setZoom((currentZoom) => {
            const nextZoom =
              event.deltaY < 0 ? currentZoom + ZOOM_STEP : currentZoom - ZOOM_STEP;

            return clamp(nextZoom, MIN_ZOOM, MAX_ZOOM);
          });
        }}
      />
    </section>
  );
}
