import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { MouseEvent } from "react";

import type { PrimitiveItem } from "../../domains/drawing/PrimitiveItem";
import type { Point } from "../../domains/geometry/Geometry";
import type { Layer } from "../../domains/layer/Layer";
import { createViewportTransform } from "./viewport/ViewportTransform";
import { drawGrid } from "./grid/GridRenderer";
import {
  drawPrimitives,
  hitTestPrimitive,
  hitTestPrimitivesInWorldRect,
} from "./primitives/PrimitiveCanvas";

const DEFAULT_WIDTH = 960;
const DEFAULT_HEIGHT = 480;
const MIN_ZOOM = 0.01;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.1;
const QUICK_ZOOM_LEVELS = [1, 0.8, 0.5, 0.1];

type CanvasEditorProps = {
  items?: PrimitiveItem[];
  layers?: Layer[];
  selectedItemIds?: string[];
  onSelectItem?: (itemId: string) => void;
  onSelectItems?: (itemIds: string[]) => void;
  onClearSelection?: () => void;
  onMoveSelectedBy?: (delta: Point) => void;
};

type DragState =
  | { mode: "pan"; x: number; y: number }
  | { mode: "item"; worldPoint: Point }
  | {
      mode: "box";
      startWorldPoint: Point;
      startScreenPoint: { x: number; y: number };
    }
  | null;

const BOX_SELECT_START_DISTANCE_PX = 4;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function CanvasEditor({
  items = [],
  layers = [],
  selectedItemIds = [],
  onSelectItem,
  onSelectItems,
  onClearSelection,
  onMoveSelectedBy,
}: CanvasEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dragStateRef = useRef<DragState>(null);
  const [pan, setPan] = useState({ offsetX: 0, offsetY: 0 });
  const [zoom, setZoom] = useState(1);
  const [boxSelection, setBoxSelection] = useState<{
    startScreenPoint: { x: number; y: number };
    currentScreenPoint: { x: number; y: number };
  } | null>(null);

  const viewport = useMemo(
    () =>
      createViewportTransform({
        pan,
        zoom: { scale: zoom },
      }),
    [pan, zoom],
  );
  const quickZoomValue = QUICK_ZOOM_LEVELS.includes(zoom)
    ? zoom.toFixed(2)
    : "custom";

  useLayoutEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();

      if (rect.width === 0 || rect.height === 0) {
        return;
      }

      const ratio = window.devicePixelRatio || 1;
      const targetWidth = Math.max(1, Math.round(rect.width * ratio));
      const targetHeight = Math.max(1, Math.round(rect.height * ratio));

      if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
        canvas.width = targetWidth;
        canvas.height = targetHeight;
      }
    };

    resizeCanvas();

    const ResizeObserverImpl = window.ResizeObserver;
    let resizeObserver: ResizeObserver | null = null;

    if (ResizeObserverImpl) {
      resizeObserver = new ResizeObserverImpl(() => {
        resizeCanvas();
      });
      resizeObserver.observe(canvas);
    }

    window.addEventListener("resize", resizeCanvas);

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener("resize", resizeCanvas);
    };
  }, []);

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
      selectedItemIds,
    });

    if (boxSelection) {
      const minX = Math.min(boxSelection.startScreenPoint.x, boxSelection.currentScreenPoint.x);
      const minY = Math.min(boxSelection.startScreenPoint.y, boxSelection.currentScreenPoint.y);
      const width = Math.abs(boxSelection.currentScreenPoint.x - boxSelection.startScreenPoint.x);
      const height = Math.abs(boxSelection.currentScreenPoint.y - boxSelection.startScreenPoint.y);

      if (width >= BOX_SELECT_START_DISTANCE_PX || height >= BOX_SELECT_START_DISTANCE_PX) {
        context.save();
        context.fillStyle = "rgba(37, 99, 235, 0.12)";
        context.strokeStyle = "rgba(37, 99, 235, 0.8)";
        context.lineWidth = 1;
        context.fillRect(minX, minY, width, height);
        context.strokeRect(minX, minY, width, height);
        context.restore();
      }
    }
  }, [pan, zoom, viewport, items, layers, selectedItemIds, boxSelection]);

  function toScreenPoint(event: MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;

    if (!canvas) {
      return { x: 0, y: 0 };
    }

    const rect = canvas.getBoundingClientRect();
    const scaleX = rect.width === 0 ? 1 : canvas.width / rect.width;
    const scaleY = rect.height === 0 ? 1 : canvas.height / rect.height;

    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    };
  }

  function toWorldPoint(event: MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;

    if (!canvas) {
      return { xMm: 0, yMm: 0 };
    }

    const screenPoint = toScreenPoint(event);
    const worldPoint = viewport.screenToWorld(screenPoint);

    return {
      xMm: worldPoint.x,
      yMm: worldPoint.y,
    };
  }

  return (
    <section
      data-testid="editor-canvas"
      className="relative flex h-full min-h-0 flex-col rounded-md border border-hairline bg-canvas-parchment"
      aria-label="2D canvas editor area"
    >
      <div className="p-2 text-xs text-ink-muted-48">
        <span>pan: {Math.round(pan.offsetX)}, {Math.round(pan.offsetY)}</span>
        <span className="ml-3">zoom: {zoom.toFixed(2)}x</span>
      </div>
      <div className="pointer-events-none absolute bottom-2 left-2 z-10">
        <label className="pointer-events-auto flex items-center gap-2 rounded-md border border-hairline bg-canvas/70 px-2 py-1 text-xs text-body shadow-sm backdrop-blur">
          <span>zoom</span>
          <select
            aria-label="Quick zoom"
            className="rounded border border-hairline bg-canvas/80 px-2 py-0.5 text-xs"
            value={quickZoomValue}
            onChange={(event) => {
              const selectedZoom = Number(event.target.value);

              if (!Number.isNaN(selectedZoom)) {
                setZoom(clamp(selectedZoom, MIN_ZOOM, MAX_ZOOM));
              }
            }}
          >
            <option value="custom">custom</option>
            {QUICK_ZOOM_LEVELS.map((level) => (
              <option key={level} value={level.toFixed(2)}>
                {level}x
              </option>
            ))}
          </select>
        </label>
      </div>
      <canvas
        ref={canvasRef}
        data-testid="editor-canvas-surface"
        width={DEFAULT_WIDTH}
        height={DEFAULT_HEIGHT}
        className="block min-h-0 w-full flex-1 touch-none"
        onMouseDown={(event) => {
          if (event.button === 1) {
            event.preventDefault();
            setBoxSelection(null);
            dragStateRef.current = { mode: "pan", x: event.clientX, y: event.clientY };
            return;
          }

          if (event.button !== 0) {
            return;
          }

          const worldPoint = toWorldPoint(event);
          const hitItemId = hitTestPrimitive(items, layers, worldPoint);

          if (hitItemId) {
            onSelectItem?.(hitItemId);
            setBoxSelection(null);
            dragStateRef.current = { mode: "item", worldPoint };
            return;
          }

          const startScreenPoint = toScreenPoint(event);

          dragStateRef.current = {
            mode: "box",
            startWorldPoint: worldPoint,
            startScreenPoint,
          };
          setBoxSelection({
            startScreenPoint,
            currentScreenPoint: startScreenPoint,
          });
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

          if (dragState.mode === "box") {
            setBoxSelection((currentBoxSelection) => {
              if (!currentBoxSelection) {
                return currentBoxSelection;
              }

              return {
                ...currentBoxSelection,
                currentScreenPoint: toScreenPoint(event),
              };
            });
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
        onMouseUp={(event) => {
          const dragState = dragStateRef.current;

          if (dragState?.mode === "box") {
            const currentScreenPoint = toScreenPoint(event);
            const draggedDistance = Math.hypot(
              currentScreenPoint.x - dragState.startScreenPoint.x,
              currentScreenPoint.y - dragState.startScreenPoint.y,
            );

            if (draggedDistance >= BOX_SELECT_START_DISTANCE_PX) {
              const endWorldPoint = toWorldPoint(event);
              const hitItemIds = hitTestPrimitivesInWorldRect(
                items,
                layers,
                dragState.startWorldPoint,
                endWorldPoint,
              );
              onSelectItems?.(hitItemIds);
            } else {
              onClearSelection?.();
            }

            setBoxSelection(null);
          }

          dragStateRef.current = null;
        }}
        onMouseLeave={() => {
          dragStateRef.current = null;
          setBoxSelection(null);
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
