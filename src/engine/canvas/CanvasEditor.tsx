import { useEffect, useMemo, useRef, useState } from "react";
import type { MouseEvent } from "react";

import type { PrimitiveItem } from "../../domains/drawing/PrimitiveItem";
import type { Point } from "../../domains/geometry/Geometry";
import type { Layer } from "../../domains/layer/Layer";
import { createViewportTransform } from "./viewport/ViewportTransform";
import { drawGrid } from "./grid/GridRenderer";
import { drawPrimitives, hitTestPrimitive } from "./primitives/PrimitiveCanvas";

const DEFAULT_WIDTH = 960;
const DEFAULT_HEIGHT = 480;
const MIN_ZOOM = 0.4;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.1;

type CanvasEditorProps = {
  items?: PrimitiveItem[];
  layers?: Layer[];
  selectedItemId?: string | null;
  onSelectItem?: (itemId: string) => void;
  onMoveSelectedBy?: (delta: Point) => void;
};

type DragState =
  | { mode: "pan"; x: number; y: number }
  | { mode: "item"; worldPoint: Point }
  | null;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function CanvasEditor({
  items = [],
  layers = [],
  selectedItemId = null,
  onSelectItem,
  onMoveSelectedBy,
}: CanvasEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dragStateRef = useRef<DragState>(null);
  const [pan, setPan] = useState({ offsetX: 0, offsetY: 0 });
  const [zoom, setZoom] = useState(1);

  const viewport = useMemo(
    () =>
      createViewportTransform({
        pan,
        zoom: { scale: zoom },
      }),
    [pan, zoom],
  );

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
    drawPrimitives(context, items, layers, {
      worldToScreen: (point) =>
        viewport.worldToScreen({
          x: point.xMm,
          y: point.yMm,
        }),
      selectedItemId,
    });
  }, [pan, zoom, viewport, items, layers, selectedItemId]);

  function toWorldPoint(event: MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;

    if (!canvas) {
      return { xMm: 0, yMm: 0 };
    }

    const rect = canvas.getBoundingClientRect();
    const screenPoint = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
    const worldPoint = viewport.screenToWorld(screenPoint);

    return {
      xMm: worldPoint.x,
      yMm: worldPoint.y,
    };
  }

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

          const worldPoint = toWorldPoint(event);
          const hitItemId = hitTestPrimitive(items, layers, worldPoint);

          if (hitItemId) {
            onSelectItem?.(hitItemId);
            dragStateRef.current = { mode: "item", worldPoint };
            return;
          }

          dragStateRef.current = { mode: "pan", x: event.clientX, y: event.clientY };
        }}
        onMouseMove={(event) => {
          const dragState = dragStateRef.current;

          if (!dragState) {
            return;
          }

          if (dragState.mode === "pan") {
            const deltaX = event.clientX - dragState.x;
            const deltaY = event.clientY - dragState.y;

            setPan((currentPan) => ({
              offsetX: currentPan.offsetX + deltaX,
              offsetY: currentPan.offsetY + deltaY,
            }));
            dragStateRef.current = { mode: "pan", x: event.clientX, y: event.clientY };
            return;
          }

          const worldPoint = toWorldPoint(event);
          const delta = {
            xMm: worldPoint.xMm - dragState.worldPoint.xMm,
            yMm: worldPoint.yMm - dragState.worldPoint.yMm,
          };

          onMoveSelectedBy?.(delta);
          dragStateRef.current = { mode: "item", worldPoint };
        }}
        onMouseUp={() => {
          dragStateRef.current = null;
        }}
        onMouseLeave={() => {
          dragStateRef.current = null;
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
