import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { MouseEvent } from "react";

import type { PrimitiveItem } from "../../domains/drawing/PrimitiveItem";
import type { Point } from "../../domains/geometry/Geometry";
import type { Layer } from "../../domains/layer/Layer";
import { createViewportTransform } from "./viewport/ViewportTransform";
import { drawGrid } from "./grid/GridRenderer";
import {
  drawPrimitives,
  hitTestEdge,
  hitTestPrimitive,
  hitTestPrimitivesInWorldRect,
  hitTestVertex,
  type EdgeHit,
  type VertexHit,
} from "./primitives/PrimitiveCanvas";

const DEFAULT_WIDTH = 960;
const DEFAULT_HEIGHT = 480;
const MIN_ZOOM = 0.01;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.1;
const WORLD_SCALE_AT_1X = 0.5;
const GRID_SPACING_MM = 500;
const SNAP_SPACING_MM = GRID_SPACING_MM;
const SHAPE_SNAP_TOLERANCE_MM = 40;
const GRID_SNAP_TOLERANCE_MM = 30;
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
  onMoveSelectedEdgeBy?: (edgeHit: EdgeHit, delta: Point) => void;
  onRotateSelectedBy?: (deltaDeg: number) => void;
  onViewportCenterChange?: (center: Point) => void;
};

type DragState =
  | { mode: "pan"; x: number; y: number }
  | { mode: "item"; itemId: string; worldPoint: Point }
  | { mode: "vertex"; vertexHit: VertexHit }
  | { mode: "edge"; edgeHit: EdgeHit; worldPoint: Point }
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

type Segment = {
  start: Point;
  end: Point;
};

type SnapTargets = {
  vertices: Point[];
  segments: Segment[];
};

function squaredDistance(a: Point, b: Point) {
  const dx = a.xMm - b.xMm;
  const dy = a.yMm - b.yMm;
  return dx * dx + dy * dy;
}

function nearestPointOnSegment(point: Point, segment: Segment): Point {
  const segmentDx = segment.end.xMm - segment.start.xMm;
  const segmentDy = segment.end.yMm - segment.start.yMm;
  const segmentLengthSquared = segmentDx * segmentDx + segmentDy * segmentDy;

  if (segmentLengthSquared === 0) {
    return segment.start;
  }

  const t =
    ((point.xMm - segment.start.xMm) * segmentDx +
      (point.yMm - segment.start.yMm) * segmentDy) /
    segmentLengthSquared;
  const clampedT = Math.max(0, Math.min(1, t));

  return {
    xMm: segment.start.xMm + clampedT * segmentDx,
    yMm: segment.start.yMm + clampedT * segmentDy,
  };
}

function buildSnapTargets(
  items: PrimitiveItem[],
  layers: Layer[],
  excludedItemIdSet: Set<string>,
): SnapTargets {
  const visibleLayerIdSet = new Set(
    layers.filter((layer) => layer.visible).map((layer) => layer.id),
  );
  const vertices: Point[] = [];
  const segments: Segment[] = [];

  items.forEach((item) => {
    if (!visibleLayerIdSet.has(item.layerId) || excludedItemIdSet.has(item.id)) {
      return;
    }

    vertices.push(...item.points);

    const edgeCount =
      item.kind === "polyline"
        ? Math.max(0, item.points.length - 1)
        : item.points.length;

    for (let index = 0; index < edgeCount; index += 1) {
      const start = item.points[index];
      const end =
        item.kind === "polyline"
          ? item.points[index + 1]
          : item.points[(index + 1) % item.points.length];

      if (!start || !end) {
        continue;
      }

      segments.push({ start, end });
    }
  });

  return { vertices, segments };
}

function snapPointToExistingGeometry(
  point: Point,
  targets: SnapTargets,
  toleranceMm: number,
): Point | null {
  const toleranceSquared = toleranceMm * toleranceMm;
  let bestDistanceSquared = Number.POSITIVE_INFINITY;
  let bestPoint: Point | null = null;

  targets.vertices.forEach((vertex) => {
    const distanceSquared = squaredDistance(point, vertex);

    if (distanceSquared <= toleranceSquared && distanceSquared < bestDistanceSquared) {
      bestDistanceSquared = distanceSquared;
      bestPoint = vertex;
    }
  });

  targets.segments.forEach((segment) => {
    const projection = nearestPointOnSegment(point, segment);
    const distanceSquared = squaredDistance(point, projection);

    if (distanceSquared <= toleranceSquared && distanceSquared < bestDistanceSquared) {
      bestDistanceSquared = distanceSquared;
      bestPoint = projection;
    }
  });

  return bestPoint;
}

function snapPointToGridLines(
  point: Point,
  spacingMm: number,
  toleranceMm: number,
): Point | null {
  if (spacingMm <= 0) {
    return null;
  }

  let snappedX = point.xMm;
  let snappedY = point.yMm;
  let snapped = false;

  const nearestGridX = Math.round(point.xMm / spacingMm) * spacingMm;
  if (Math.abs(nearestGridX - point.xMm) <= toleranceMm) {
    snappedX = nearestGridX;
    snapped = true;
  }

  const nearestGridY = Math.round(point.yMm / spacingMm) * spacingMm;
  if (Math.abs(nearestGridY - point.yMm) <= toleranceMm) {
    snappedY = nearestGridY;
    snapped = true;
  }

  if (!snapped) {
    return null;
  }

  return {
    xMm: snappedX,
    yMm: snappedY,
  };
}

function snapVertexPointWithPriority(point: Point, targets: SnapTargets): Point {
  const snappedToExisting = snapPointToExistingGeometry(
    point,
    targets,
    SHAPE_SNAP_TOLERANCE_MM,
  );

  if (snappedToExisting) {
    return snappedToExisting;
  }

  return (
    snapPointToGridLines(point, SNAP_SPACING_MM, GRID_SNAP_TOLERANCE_MM) ?? point
  );
}

function snapItemDeltaWithPriority(
  item: PrimitiveItem,
  rawDelta: Point,
  targets: SnapTargets,
): Point {
  const movedPoints = item.points.map((point) => ({
    xMm: point.xMm + rawDelta.xMm,
    yMm: point.yMm + rawDelta.yMm,
  }));

  let bestCorrection: Point | null = null;
  let bestDistanceSquared = Number.POSITIVE_INFINITY;

  movedPoints.forEach((movedPoint) => {
    const snappedPoint = snapPointToExistingGeometry(
      movedPoint,
      targets,
      SHAPE_SNAP_TOLERANCE_MM,
    );

    if (!snappedPoint) {
      return;
    }

    const correction = {
      xMm: snappedPoint.xMm - movedPoint.xMm,
      yMm: snappedPoint.yMm - movedPoint.yMm,
    };
    const correctionDistanceSquared =
      correction.xMm * correction.xMm + correction.yMm * correction.yMm;

    if (correctionDistanceSquared < bestDistanceSquared) {
      bestDistanceSquared = correctionDistanceSquared;
      bestCorrection = correction;
    }
  });

  if (bestCorrection !== null) {
    const snappedCorrection = bestCorrection as Point;

    return {
      xMm: rawDelta.xMm + snappedCorrection.xMm,
      yMm: rawDelta.yMm + snappedCorrection.yMm,
    };
  }

  let bestGridCorrectionX: number | null = null;
  let bestGridCorrectionY: number | null = null;

  movedPoints.forEach((movedPoint) => {
    const nearestGridX = Math.round(movedPoint.xMm / SNAP_SPACING_MM) * SNAP_SPACING_MM;
    const correctionX = nearestGridX - movedPoint.xMm;

    if (
      Math.abs(correctionX) <= GRID_SNAP_TOLERANCE_MM &&
      (bestGridCorrectionX === null ||
        Math.abs(correctionX) < Math.abs(bestGridCorrectionX))
    ) {
      bestGridCorrectionX = correctionX;
    }

    const nearestGridY = Math.round(movedPoint.yMm / SNAP_SPACING_MM) * SNAP_SPACING_MM;
    const correctionY = nearestGridY - movedPoint.yMm;

    if (
      Math.abs(correctionY) <= GRID_SNAP_TOLERANCE_MM &&
      (bestGridCorrectionY === null ||
        Math.abs(correctionY) < Math.abs(bestGridCorrectionY))
    ) {
      bestGridCorrectionY = correctionY;
    }
  });

  if (bestGridCorrectionX === null && bestGridCorrectionY === null) {
    return rawDelta;
  }

  return {
    xMm: rawDelta.xMm + (bestGridCorrectionX ?? 0),
    yMm: rawDelta.yMm + (bestGridCorrectionY ?? 0),
  };
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
  onMoveSelectedEdgeBy,
  onRotateSelectedBy,
  onViewportCenterChange,
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
  const [hoveredEdge, setHoveredEdge] = useState<EdgeHit | null>(null);
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

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const centerScreenPoint = {
      x: canvas.width / 2,
      y: canvas.height / 2,
    };
    const centerWorldPoint = viewport.screenToWorld(centerScreenPoint);

    onViewportCenterChange?.({
      xMm: centerWorldPoint.x,
      yMm: centerWorldPoint.y,
    });
  }, [onViewportCenterChange, pan, viewport, zoom]);
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
      spacingMm: GRID_SPACING_MM,
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

          const edgeHit = hitTestEdge(items, layers, worldPoint, selectedItemIds);

          if (edgeHit) {
            dragStateRef.current = { mode: "edge", edgeHit, worldPoint };
            return;
          }

          const hitItemId = hitTestPrimitive(items, layers, worldPoint);

          if (hitItemId) {
            onSelectItem?.(hitItemId);
            setBoxSelection(null);
            dragStateRef.current = { mode: "item", itemId: hitItemId, worldPoint };
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
            const nextPoint = event.shiftKey
              ? snapVertexPointWithPriority(
                  worldPoint,
                  buildSnapTargets(
                    items,
                    layers,
                    new Set([dragState.vertexHit.itemId]),
                  ),
                )
              : worldPoint;
            onMoveVertex?.(dragState.vertexHit, nextPoint);
            return;
          }

          if (dragState.mode === "edge") {
            const worldPoint = toWorldPoint(event);
            const dx = worldPoint.xMm - dragState.worldPoint.xMm;
            const dy = worldPoint.yMm - dragState.worldPoint.yMm;
            const selected = items.find((item) => item.id === dragState.edgeHit.itemId);

            if (!selected) {
              return;
            }

            const startPoint = selected.points[dragState.edgeHit.startPointIndex];
            const endPoint = selected.points[dragState.edgeHit.endPointIndex];

            if (!startPoint || !endPoint) {
              return;
            }

            const edgeDx = endPoint.xMm - startPoint.xMm;
            const edgeDy = endPoint.yMm - startPoint.yMm;
            const edgeLength = Math.hypot(edgeDx, edgeDy);

            if (edgeLength === 0) {
              return;
            }

            const normal = {
              xMm: -edgeDy / edgeLength,
              yMm: edgeDx / edgeLength,
            };
            const projectedOffset = dx * normal.xMm + dy * normal.yMm;
            const delta = {
              xMm: normal.xMm * projectedOffset,
              yMm: normal.yMm * projectedOffset,
            };

            onMoveSelectedEdgeBy?.(dragState.edgeHit, delta);
            dragStateRef.current = {
              mode: "edge",
              edgeHit: dragState.edgeHit,
              worldPoint,
            };
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
          const rawDelta = {
            xMm: worldPoint.xMm - dragState.worldPoint.xMm,
            yMm: worldPoint.yMm - dragState.worldPoint.yMm,
          };
          const draggedItem = items.find((item) => item.id === dragState.itemId);
          const delta = event.shiftKey && draggedItem
            ? snapItemDeltaWithPriority(
                draggedItem,
                rawDelta,
                buildSnapTargets(items, layers, new Set([dragState.itemId])),
              )
            : rawDelta;
          const nextWorldPoint = {
            xMm: dragState.worldPoint.xMm + delta.xMm,
            yMm: dragState.worldPoint.yMm + delta.yMm,
          };
          const appliedDelta = {
            xMm: nextWorldPoint.xMm - dragState.worldPoint.xMm,
            yMm: nextWorldPoint.yMm - dragState.worldPoint.yMm,
          };

          onMoveSelectedBy?.(appliedDelta);
          dragStateRef.current = {
            mode: "item",
            itemId: dragState.itemId,
            worldPoint: nextWorldPoint,
          };
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
          setHoveredEdge(null);
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
          const edgeHit = vertexHit
            ? null
            : hitTestEdge(items, layers, worldPoint, selectedItemIds);
          setHoveredEdge(edgeHit);
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
