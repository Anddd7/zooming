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
  hitTestVertex,
  type VertexHit,
} from "./primitives/PrimitiveCanvas";

const DEFAULT_WIDTH = 960;
const DEFAULT_HEIGHT = 480;
const MIN_ZOOM = 0.01;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.1;
const WORLD_SCALE_AT_1X = 0.5;
type CanvasEditorProps = {
  items?: PrimitiveItem[];
  layers?: Layer[];
  selectedItemIds?: string[];
  zoom?: number;
  onZoomChange?: (zoom: number) => void;
  onSelectItem?: (itemId: string) => void;
  onSelectItems?: (itemIds: string[]) => void;
  onClearSelection?: () => void;
  onMoveSelectedBy?: (delta: Point) => void;
  onMoveVertex?: (vertex: VertexHit, point: Point) => void;
  onRotateSelectedBy?: (deltaDeg: number) => void;
};

type DragState =
  | { mode: "pan"; x: number; y: number }
  | { mode: "item"; worldPoint: Point }
  | { mode: "vertex"; vertexHit: VertexHit }
  | {
      mode: "rotate";
      centerScreenPoint: { x: number; y: number };
      previousAngleDeg: number;
    }
  | {
      mode: "box";
      startWorldPoint: Point;
      startScreenPoint: { x: number; y: number };
    }
  | null;

const BOX_SELECT_START_DISTANCE_PX = 4;
const ROTATION_HANDLE_OFFSET_PX = 24;
const ROTATION_HANDLE_RADIUS_PX = 6;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function CanvasEditor({
  items = [],
  layers = [],
  selectedItemIds = [],
  zoom: controlledZoom,
  onZoomChange,
  onSelectItem,
  onSelectItems,
  onClearSelection,
  onMoveSelectedBy,
  onMoveVertex,
  onRotateSelectedBy,
}: CanvasEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dragStateRef = useRef<DragState>(null);
  const [pan, setPan] = useState({ offsetX: 0, offsetY: 0 });
  const [internalZoom, setInternalZoom] = useState(1);
  const [boxSelection, setBoxSelection] = useState<{
    startScreenPoint: { x: number; y: number };
    currentScreenPoint: { x: number; y: number };
  } | null>(null);
  const [hoveredVertex, setHoveredVertex] = useState<VertexHit | null>(null);
  const [isRotationHandleHovered, setIsRotationHandleHovered] = useState(false);
  const zoom = controlledZoom ?? internalZoom;
  const effectiveScale = zoom * WORLD_SCALE_AT_1X;

  const viewport = useMemo(
    () =>
      createViewportTransform({
        pan,
        zoom: { scale: effectiveScale },
      }),
    [pan, effectiveScale],
  );
  function setZoomValue(nextZoomOrUpdater: number | ((currentZoom: number) => number)) {
    const nextZoom =
      typeof nextZoomOrUpdater === "function"
        ? nextZoomOrUpdater(zoom)
        : nextZoomOrUpdater;
    const clampedZoom = clamp(nextZoom, MIN_ZOOM, MAX_ZOOM);

    if (controlledZoom === undefined) {
      setInternalZoom(clampedZoom);
    }

    onZoomChange?.(clampedZoom);
  }

  function selectedItem() {
    const [selectedItemId] = selectedItemIds;

    if (!selectedItemId) {
      return null;
    }

    return items.find((item) => item.id === selectedItemId) ?? null;
  }

  function selectedItemScreenGeometry() {
    const item = selectedItem();

    if (!item || item.points.length === 0) {
      return null;
    }

    const screenPoints = item.points.map((point) =>
      viewport.worldToScreen({ x: point.xMm, y: point.yMm }),
    );

    let minX = screenPoints[0].x;
    let maxX = screenPoints[0].x;
    let minY = screenPoints[0].y;
    let maxY = screenPoints[0].y;

    screenPoints.slice(1).forEach((point) => {
      minX = Math.min(minX, point.x);
      maxX = Math.max(maxX, point.x);
      minY = Math.min(minY, point.y);
      maxY = Math.max(maxY, point.y);
    });

    const center = {
      x: (minX + maxX) / 2,
      y: (minY + maxY) / 2,
    };
    const topCenter = {
      x: (minX + maxX) / 2,
      y: minY,
    };
    const handle = {
      x: topCenter.x,
      y: topCenter.y - ROTATION_HANDLE_OFFSET_PX,
    };

    return {
      center,
      topCenter,
      handle,
    };
  }

  function pointAngleDeg(center: { x: number; y: number }, point: { x: number; y: number }) {
    return (Math.atan2(point.y - center.y, point.x - center.x) * 180) / Math.PI;
  }

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
      scale: effectiveScale,
      spacingMm: 100,
    });
    drawPrimitives(context, items, layers, {
      worldToScreen: (point) =>
        viewport.worldToScreen({
          x: point.xMm,
          y: point.yMm,
        }),
      selectedItemIds,
      hoveredVertex,
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

    const selectedGeometry = selectedItemScreenGeometry();
    if (selectedGeometry) {
      context.save();
      context.strokeStyle = "#2563eb";
      context.lineWidth = 1;
      context.beginPath();
      context.moveTo(selectedGeometry.topCenter.x, selectedGeometry.topCenter.y);
      context.lineTo(selectedGeometry.handle.x, selectedGeometry.handle.y);
      context.stroke();

      context.beginPath();
      context.arc(
        selectedGeometry.handle.x,
        selectedGeometry.handle.y,
        ROTATION_HANDLE_RADIUS_PX,
        0,
        Math.PI * 2,
      );
      context.fillStyle = isRotationHandleHovered ? "#2563eb" : "#ffffff";
      context.strokeStyle = "#2563eb";
      context.fill();
      context.stroke();
      context.restore();
    }
  }, [
    pan,
    zoom,
    viewport,
    items,
    layers,
    selectedItemIds,
    hoveredVertex,
    boxSelection,
    isRotationHandleHovered,
    effectiveScale,
  ]);

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

          const screenPoint = toScreenPoint(event);
          const selectedGeometry = selectedItemScreenGeometry();
          if (selectedGeometry) {
            const distanceToHandle = Math.hypot(
              screenPoint.x - selectedGeometry.handle.x,
              screenPoint.y - selectedGeometry.handle.y,
            );

            if (distanceToHandle <= ROTATION_HANDLE_RADIUS_PX + 2) {
              dragStateRef.current = {
                mode: "rotate",
                centerScreenPoint: selectedGeometry.center,
                previousAngleDeg: pointAngleDeg(selectedGeometry.center, screenPoint),
              };
              return;
            }
          }

          const worldPoint = toWorldPoint(event);
          const vertexHit = hitTestVertex(items, layers, worldPoint, selectedItemIds);

          if (vertexHit) {
            dragStateRef.current = { mode: "vertex", vertexHit };
            return;
          }

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

          if (dragState.mode === "vertex") {
            const worldPoint = toWorldPoint(event);
            onMoveVertex?.(dragState.vertexHit, worldPoint);
            return;
          }

          if (dragState.mode === "rotate") {
            const screenPoint = toScreenPoint(event);
            const angleDeg = pointAngleDeg(dragState.centerScreenPoint, screenPoint);
            const deltaDeg = angleDeg - dragState.previousAngleDeg;

            onRotateSelectedBy?.(deltaDeg);
            dragStateRef.current = {
              ...dragState,
              previousAngleDeg: angleDeg,
            };
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
          setHoveredVertex(null);
          setIsRotationHandleHovered(false);
        }}
        onMouseMoveCapture={(event) => {
          if (dragStateRef.current?.mode === "vertex") {
            return;
          }

          const screenPoint = toScreenPoint(event);
          const selectedGeometry = selectedItemScreenGeometry();
          if (selectedGeometry) {
            const distanceToHandle = Math.hypot(
              screenPoint.x - selectedGeometry.handle.x,
              screenPoint.y - selectedGeometry.handle.y,
            );
            setIsRotationHandleHovered(distanceToHandle <= ROTATION_HANDLE_RADIUS_PX + 2);
          } else {
            setIsRotationHandleHovered(false);
          }

          const worldPoint = toWorldPoint(event);
          const vertexHit = hitTestVertex(items, layers, worldPoint, selectedItemIds);
          setHoveredVertex(vertexHit);
        }}
        onWheel={(event) => {
          event.preventDefault();

          setZoomValue((currentZoom) => {
            const nextZoom =
              event.deltaY < 0 ? currentZoom + ZOOM_STEP : currentZoom - ZOOM_STEP;

            return clamp(nextZoom, MIN_ZOOM, MAX_ZOOM);
          });
        }}
      />
    </section>
  );
}
